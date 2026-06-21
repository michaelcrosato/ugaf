/**
 * The engine — the pure transactional step pipeline (Plan → Diff → Validate →
 * Apply) plus the K7 same-beat scheduler. One player action in; a new immutable
 * state + an event record out. A rejection returns the UNCHANGED prior state
 * (atomicity by construction).
 *
 * Determinism discipline: no Date, no Math.random, no I/O. Game-time is the turn
 * counter. Every stochastic draw flows through the recorded tape.
 */
import { applyMutations, factNamespace, makeFactView, type FactRecord, type FactMutation } from '../sdk/facts.js';
import { CONFIDENCE, type ParsedIntent } from '../sdk/intents.js';
import type { JsonObject, JsonValue } from '../sdk/json.js';
import {
  BEAT_PHASES,
  type ClarifyRequest,
  type GameState,
  type GameStatus,
  type ModuleContext,
  type ModuleId,
  type RenderPayload,
  type RoleObservation,
  type ScheduledEvent,
  type SeverityCap,
  type StackFrame,
  type ValidatedAction,
  type WorldEvent,
} from '../sdk/types.js';
import { createTape, type TapeEntry } from './tape.js';
import { hashState } from './state.js';
import { route } from './router.js';
import type { ModuleRegistry } from './registry.js';

const KERNEL = 'kernel' as ModuleId;
const MAX_BEAT_ITERS = 2048;

export interface StepOptions {
  readonly armed: ReadonlySet<string>;
  readonly role?: RoleObservation['role'];
  /** the masked observation for the acting role (built by the narrator layer). */
  readonly observation: RoleObservation;
  /** replay: the recorded tape entries to consume instead of producing fresh ones. */
  readonly recordedTape?: readonly TapeEntry[];
  /** whether a clarify has budget left (K8 circuit breaker). Default true. */
  readonly clarifyAllowed?: boolean;
}

export type StepOutcome =
  | {
      readonly kind: 'committed';
      readonly state: GameState;
      readonly events: readonly WorldEvent[];
      readonly renders: readonly RenderPayload[];
      readonly tape: readonly TapeEntry[];
      readonly owner: ModuleId;
      readonly priorHash: string;
      readonly nextHash: string;
    }
  | {
      readonly kind: 'rejected';
      readonly state: GameState; // unchanged prior state
      readonly reason: string;
      readonly code: RejectionCode;
    }
  | {
      readonly kind: 'clarify';
      readonly state: GameState; // unchanged prior state
      readonly request: ClarifyRequest;
    };

export type RejectionCode =
  | 'NO_AUTHORITY'
  | 'AMBIGUOUS'
  | 'NOT_LEGAL'
  | 'WRITE_PERMISSION'
  | 'K8_SEVERITY'
  | 'BEAT_NONCONVERGENCE'
  | 'SESSION_OVER';

class StepReject extends Error {
  constructor(readonly code: RejectionCode, msg: string) {
    super(msg);
  }
}

/** Derive the K8 severity cap from parser confidence. Monotonic: lower confidence, lower cap. */
export function severityCapFor(intent: ParsedIntent): SeverityCap {
  if (intent.class === 'unclassified') return 'safe_hold';
  if (intent.confidence >= CONFIDENCE.CONFIDENT) return 'full';
  if (intent.confidence >= CONFIDENCE.TENTATIVE) return 'reversible';
  return 'safe_hold';
}

function capRank(cap: SeverityCap): number {
  return cap === 'full' ? 2 : cap === 'reversible' ? 1 : 0;
}
function severityRank(sev: WorldEvent['severity']): number {
  return sev === 'lethal' || sev === 'irreversible' ? 2 : 1;
}

/**
 * The single authoritative transition. Pure function of (state, registry,
 * intent, options). Never mutates `state`.
 */
export function step(
  state: GameState,
  registry: ModuleRegistry,
  intent: ParsedIntent,
  opts: StepOptions,
): StepOutcome {
  if (state.status !== 'active') {
    return { kind: 'rejected', state, reason: 'session is over', code: 'SESSION_OVER' };
  }
  const priorHash = hashState(state);
  try {
    return runStep(state, registry, intent, opts, priorHash);
  } catch (e) {
    if (e instanceof StepReject) {
      return { kind: 'rejected', state, reason: e.message, code: e.code };
    }
    throw e;
  }
}

function runStep(
  state: GameState,
  registry: ModuleRegistry,
  intent: ParsedIntent,
  opts: StepOptions,
  priorHash: string,
): StepOutcome {
  const cap = severityCapFor(intent);
  const turn = state.turn + 1;

  // mutable working draft (folded into an immutable state at the end)
  let facts: FactRecord = { ...state.facts };
  const native: Record<ModuleId, JsonObject> = { ...state.native };
  let pending: ScheduledEvent[] = [...state.scheduler.pending];
  let counters: Record<string, number> = { ...state.rngCounters };
  let status: GameStatus = state.status;
  let stack: StackFrame[] = [...state.stack];
  const collectedEvents: WorldEvent[] = [];
  const collectedTape: TapeEntry[] = [];
  const renders: RenderPayload[] = [];

  const view = () => makeFactView(facts);
  const ctxFor = (): ModuleContext => ({
    turn,
    phase: typeof facts['phase.now'] === 'string' ? (facts['phase.now'] as string) : undefined,
    peekFact: (k) => facts[k],
    turnTag: `t${turn}`,
  });

  // ---- a small helper to run a tape-bearing callback, threading counters ----
  function withTape<T>(fn: (tape: ReturnType<typeof createTape>['reader']) => T): T {
    const { reader, result } = createTape({
      seed: state.seed,
      counters,
      ...(opts.recordedTape ? { recorded: opts.recordedTape } : {}),
    });
    const out = fn(reader);
    const r = result();
    counters = r.counters;
    collectedTape.push(...r.entries);
    return out;
  }

  // ---- commit a batch of events: validate perms + apply mutations ----------
  function commit(ownerId: ModuleId, events: readonly WorldEvent[]): void {
    for (const ev of events) {
      if (ownerId !== KERNEL) {
        const owner = registry.get(ownerId);
        const allowed = new Set(owner.manifest.writesFacts);
        for (const m of ev.mutations) {
          const ns = factNamespace(m.key);
          if (!allowed.has(ns)) {
            throw new StepReject(
              'WRITE_PERMISSION',
              `module ${ownerId} may not write fact namespace "${ns}" (key ${m.key})`,
            );
          }
        }
      }
      facts = applyMutations(facts, ev.mutations as readonly FactMutation[]);
      collectedEvents.push({ ...ev, source: ownerId });
    }
  }

  // ---- pushdown stack control (nested / encapsulated frames) ----------------
  function handleStackControl(control: { kind: string; label?: string; request?: import('../sdk/types.js').NestedRequest }): void {
    if (control.kind === 'push' && control.request) {
      const req = control.request;
      if (!(req.module in native)) native[req.module] = registry.get(req.module).init(state.seed);
      const frame: StackFrame = {
        module: req.module,
        snapshotHash: hashState({ ...state, facts, native, stack, scheduler: { pending }, rngCounters: counters, turn }),
        terminalLabels: req.terminalLabels,
        meta: req.payload ?? {},
        ...(req.fuse !== undefined ? { fuse: req.fuse } : {}),
      };
      stack.push(frame);
      if (req.fuse !== undefined) {
        pending.push({
          fireAtTurn: turn + req.fuse,
          phase: 'fuse_expire',
          module: KERNEL,
          kind: 'fuse_expire',
          id: `fuse:${req.module}:${turn}`,
          order: 0,
          payload: { module: req.module },
        });
      }
    } else if (control.kind === 'terminate') {
      if (stack.length) stack.pop();
    }
  }

  // ====================== 1. ROUTE ======================
  // When a nested frame is on the stack, it OWNS the turn (pushdown). Otherwise
  // the jurisdiction router selects the unique owner.
  let ownerId: ModuleId;
  if (stack.length > 0) {
    ownerId = stack[stack.length - 1]!.module;
  } else {
    const routed = route(intent, facts, registry, opts.armed);
    if (routed.kind === 'no_authority') {
      throw new StepReject('NO_AUTHORITY', `no module claims intent "${intent.class}"`);
    }
    if (routed.kind === 'ambiguous') {
      throw new StepReject('AMBIGUOUS', `ambiguous authority for "${intent.class}": ${routed.tied.join(', ')}`);
    }
    ownerId = routed.owner;
  }
  const owner = registry.get(ownerId);

  // ====================== 2. LEGALITY ======================
  const legality = owner.validateLegality(intent, native[ownerId]!, view());
  if (!legality.legal) {
    throw new StepReject('NOT_LEGAL', legality.reason ?? 'action not legal');
  }
  const action: ValidatedAction = {
    intent,
    args: legality.args ?? {},
    severityCap: cap,
  };

  // ====================== 3. EXECUTE (action owner) ======================
  const result = withTape((tape) =>
    owner.execute({
      native: native[ownerId]!,
      facts: view(),
      observation: opts.observation,
      action,
      tape,
      ctx: ctxFor(),
    }),
  );

  // a clarify short-circuits BEFORE any commit (K8 circuit breaker)
  if (result.clarify && opts.clarifyAllowed !== false) {
    return { kind: 'clarify', state, request: result.clarify };
  }

  native[ownerId] = result.nativeNext;
  commit(ownerId, result.events);
  if (result.render) renders.push(result.render);
  if (result.scheduled) pending.push(...result.scheduled);
  status = applyControl(status, result.control);
  handleStackControl(result.control);

  // ---- kernel surfaces the generic physical act as canonical facts ----
  // (so law triggers are pure predicates over facts, never coupled to verbs)
  commit(KERNEL, [physicalActEvent(intent, turn)]);

  // ====================== 4. BEATS (K7 same-beat order) ======================
  let guard = 0;
  for (const phase of BEAT_PHASES) {
    // (a) drain ready scheduled events for this phase, in canonical order
    // (b) then poll standing beat-trigger modules until convergence (idempotent)
    let pollExhausted = false;
    for (;;) {
      if (++guard > MAX_BEAT_ITERS) throw new StepReject('BEAT_NONCONVERGENCE', `beat did not converge at ${phase}`);

      const ready = pending
        .filter((e) => e.fireAtTurn <= turn && e.phase === phase)
        .sort(beatOrder);
      if (ready.length > 0) {
        const ev = ready[0]!;
        pending = pending.filter((e) => e !== ev);
        // kernel-internal fuse expiry: discard the nested frame (drop its deltas)
        if (ev.module === KERNEL && ev.kind === 'fuse_expire') {
          const fm = typeof ev.payload?.module === 'string' ? (ev.payload.module as string) : undefined;
          const idx = fm ? stack.findIndex((f) => f.module === fm) : stack.length - 1;
          if (idx >= 0) stack.splice(idx, 1);
          pollExhausted = false;
          continue;
        }
        const m = registry.get(ev.module);
        if (m.onScheduled) {
          const r = withTape((tape) => m.onScheduled!(ev, native[ev.module]!, view(), tape, ctxFor()));
          native[ev.module] = r.nativeNext;
          commit(ev.module, r.events);
          if (r.render) renders.push(r.render);
          if (r.scheduled) pending.push(...r.scheduled);
          status = applyControl(status, r.control);
          handleStackControl(r.control);
        }
        pollExhausted = false;
        continue;
      }

      if (pollExhausted) break;
      // poll standing triggers once (priority order); rely on idempotency
      let changed = false;
      const beatMods = registry.all().filter((m) => m.beatTriggers?.includes(phase));
      for (const m of beatMods) {
        const before = native[m.manifest.id];
        const r = withTape((tape) => m.onBeat!(phase, before!, view(), tape, ctxFor()));
        if (r.nativeNext && r.nativeNext !== before) {
          native[m.manifest.id] = r.nativeNext;
          changed = true;
        }
        if (r.events && r.events.length) {
          commit(m.manifest.id, r.events);
          changed = true;
        }
        if (r.scheduled && r.scheduled.length) {
          pending.push(...r.scheduled);
          changed = true;
        }
        if (r.render) renders.push(r.render);
        if (r.push) {
          handleStackControl({ kind: 'push', request: r.push });
          changed = true;
        }
      }
      if (!changed) break;
      pollExhausted = false;
    }
  }

  // ====================== 5. VALIDATE GATES ======================
  // K8: an uncertain intent may never commit a lethal/irreversible outcome.
  if (capRank(cap) < 2) {
    for (const ev of collectedEvents) {
      if (severityRank(ev.severity) >= 2) {
        throw new StepReject(
          'K8_SEVERITY',
          `K8: uncertain intent (cap=${cap}) cannot commit ${ev.severity} event "${ev.tag}"`,
        );
      }
    }
  }

  // ====================== 6. APPLY (seal the new state) ======================
  const nextState: GameState = {
    turn,
    seed: state.seed,
    facts,
    native,
    stack,
    scheduler: { pending },
    rngCounters: counters,
    status,
  };
  const nextHash = hashState(nextState);

  return {
    kind: 'committed',
    state: nextState,
    events: collectedEvents,
    renders,
    tape: collectedTape,
    owner: ownerId,
    priorHash,
    nextHash,
  };
}

function applyControl(status: GameStatus, control: { kind: string; label?: string }): GameStatus {
  if (control.kind === 'terminate' && control.label) {
    if (control.label === 'won') return 'won';
    if (control.label === 'lost' || control.label === 'dead') return 'lost';
    if (control.label === 'ended') return 'ended';
  }
  return status;
}

/** Canonical same-beat ordering: by `order` (default 0), then by id. */
function beatOrder(a: ScheduledEvent, b: ScheduledEvent): number {
  return (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id);
}

/** The kernel-surfaced physical-act facts (K4 generic intents become predicates). */
function physicalActEvent(intent: ParsedIntent, turn: number): WorldEvent {
  const mutations: FactMutation[] = [
    { op: 'set', key: 'flag.last_intent', value: intent.class },
    { op: 'set', key: 'flag.last_turn', value: turn },
  ];
  const u: JsonValue = intent.utterance ?? null;
  mutations.push({ op: 'set', key: 'flag.last_utterance', value: u });
  mutations.push({ op: 'set', key: 'flag.last_item_class', value: intent.itemClass ?? null });
  mutations.push({ op: 'set', key: 'flag.last_target', value: intent.target?.id ?? null });
  return { tag: 'physical_act', mutations, visibility: 'private' };
}
