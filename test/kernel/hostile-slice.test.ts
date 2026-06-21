/**
 * THE FIRST MILESTONE — a deliberately hostile kernel vertical slice.
 *
 * Per EXECUTABLE-INVARIANTS-ADDENDUM §2, before any Cordon's Edge content we
 * build a slice that stresses the kernel where it can break:
 *
 *   one ambiguous lethal command · three interacting effects ·
 *   multiple same-beat events · one nested frame · one failed-invariant
 *   rollback · exact replay.
 *
 * It uses TOY modules (not the Hush) to isolate the kernel. If this passes, the
 * deterministic substrate is trustworthy enough to host real content.
 */
import { describe, it, expect } from 'vitest';
import type {
  Module,
  ModuleManifest,
  ModuleResult,
  BeatResult,
  ScheduledEvent,
  GameState,
  RoleObservation,
  Role,
  WorldEvent,
} from '../../src/sdk/types.js';
import type { ParsedIntent, IntentClass } from '../../src/sdk/intents.js';
import { ModuleRegistry } from '../../src/kernel/registry.js';
import { initialState, hashState } from '../../src/kernel/state.js';
import { step } from '../../src/kernel/engine.js';
import { EventLog, engineFingerprint, type EventRecord } from '../../src/kernel/eventlog.js';
import { replay, type ReplayDriver } from '../../src/kernel/replay.js';

// ---------------------------------------------------------------------------
//  Toy module helpers
// ---------------------------------------------------------------------------
function manifest(
  id: string,
  priority: number,
  intents: IntentClass[],
  writes: string[],
  reads: string[],
): ModuleManifest {
  return {
    id,
    version: '0.0.1',
    contentHash: `hash:${id}`,
    source: 'toy',
    license: {
      identifier: 'NONE',
      attribution: 'toy',
      tier: 'green',
      approvedForImplementation: true,
      provenance: 'clean-room',
    },
    fidelity: 'native-subsystem',
    domain: id.split('.')[0]!,
    priority,
    jurisdiction: { scales: ['character'], domains: [id.split('.')[0]!], phases: ['any'], intents },
    owns: { nativeStatePaths: [id] },
    writesFacts: writes,
    readsFacts: reads,
    forbids: {
      numericalCrosswalks: true,
      normalizedOutcomes: true,
      universalBaseStatistics: true,
      runtimeRuleGeneration: true,
    },
  };
}

const sched = (
  turn: number,
  phase: ScheduledEvent['phase'],
  module: string,
  kind: string,
  id: string,
  payload?: Record<string, unknown>,
): ScheduledEvent => ({
  fireAtTurn: turn,
  phase,
  module,
  kind,
  id,
  order: 0,
  ...(payload ? { payload: payload as ScheduledEvent['payload'] } : {}),
});

// ---- spine: lowest-priority catch-all floor -------------------------------
const spine: Module = {
  manifest: manifest('spine', 0, ['wait', 'look', 'unclassified', 'rest'], ['flag', 'world'], ['flag', 'world']),
  init: () => ({}),
  claims: (intent) => ['wait', 'look', 'unclassified', 'rest'].includes(intent.class),
  validateLegality: () => ({ legal: true }),
  execute: (): ModuleResult => ({ nativeNext: {}, events: [], control: { kind: 'continue' } }),
};

// ---- time.clock: owns phase; rings the bell when scheduled ----------------
const clock: Module = {
  manifest: manifest('time.clock', 5, [], ['phase'], ['phase']),
  init: () => ({}),
  claims: () => false,
  validateLegality: () => ({ legal: true }),
  execute: (): ModuleResult => ({ nativeNext: {}, events: [], control: { kind: 'continue' } }),
  onScheduled: (ev, native): ModuleResult => {
    if (ev.kind === 'ring_bell') {
      return {
        nativeNext: native,
        events: [
          {
            tag: 'bell_rung',
            mutations: [{ op: 'set', key: 'phase.now', value: 'rung' }],
            summary: 'A bell tone rings out.',
          },
        ],
        control: { kind: 'continue' },
      };
    }
    return { nativeNext: native, events: [], control: { kind: 'continue' } };
  },
};

// ---- travel.move: owns location; crossing the ward rings the bell ---------
const travel: Module = {
  manifest: manifest(
    'travel.move',
    10,
    ['go', 'cross_threshold', 'look_back', 'wait'],
    ['loc', 'facing', 'route'],
    ['loc', 'facing'],
  ),
  init: () => ({ node: 'outside' }),
  claims: (intent) => ['go', 'cross_threshold', 'look_back'].includes(intent.class),
  validateLegality: (intent, native) =>
    intent.class === 'cross_threshold' && (native as { node: string }).node === 'inside'
      ? { legal: false, reason: 'already inside' }
      : { legal: true },
  execute: (args): ModuleResult => {
    const intent = args.action.intent;
    if (intent.class === 'cross_threshold') {
      return {
        nativeNext: { node: 'inside' },
        events: [
          {
            tag: 'cross',
            mutations: [{ op: 'set', key: 'loc.pc', value: 'inside' }],
            summary: 'You step across the ward-line.',
          },
        ],
        control: { kind: 'continue' },
        scheduled: [
          sched(args.ctx.turn, 'phase_change', 'time.clock', 'ring_bell', `ring:${args.ctx.turn}`),
          sched(args.ctx.turn, 'travel_complete', 'travel.move', 'arrive', `arrive:${args.ctx.turn}`),
        ],
      };
    }
    if (intent.class === 'look_back') {
      return {
        nativeNext: args.native,
        events: [
          {
            tag: 'look_back',
            mutations: [{ op: 'set', key: 'facing.pc', value: 'behind' }],
            summary: 'You glance back the way you came.',
          },
        ],
        control: { kind: 'continue' },
      };
    }
    return { nativeNext: args.native, events: [], control: { kind: 'continue' } };
  },
  onScheduled: (ev, native): ModuleResult =>
    ev.kind === 'arrive'
      ? {
          nativeNext: native,
          events: [
            {
              tag: 'arrived',
              mutations: [{ op: 'set', key: 'route.last_arrival', value: 'inside' }],
              summary: 'The ward closes behind you.',
            },
          ],
          control: { kind: 'continue' },
        }
      : { nativeNext: native, events: [], control: { kind: 'continue' } },
};

// ---- anomaly.ward: the law. Reacts on the law_trigger beat ----------------
const anomaly: Module = {
  manifest: manifest('anomaly.ward', 50, [], ['law'], ['law', 'phase', 'flag']),
  init: () => ({}),
  claims: () => false, // purely reactive
  validateLegality: () => ({ legal: true }),
  execute: (args): ModuleResult => ({
    nativeNext: args.native,
    events: [],
    control: { kind: 'continue' },
  }),
  beatTriggers: ['law_trigger'],
  onBeat: (_phase, native, facts, _tape, ctx): BeatResult => {
    const lastIntent = facts.getString('flag.last_intent');
    const lastTurn = facts.getNumber('flag.last_turn');
    const phase = facts.getString('phase.now');
    const armed = facts.getBool('law.ward.armed') ?? false;
    if (facts.getNumber('law.ward.fired_turn') === ctx.turn) return {}; // idempotent
    if (armed && lastIntent === 'cross_threshold' && lastTurn === ctx.turn && phase === 'rung') {
      const contacts = (facts.getNumber('law.ward.contacts') ?? 0) + 1;
      const events: WorldEvent[] = [
        {
          tag: 'ward_triggered',
          mutations: [
            { op: 'set', key: 'law.ward.contacts', value: contacts },
            { op: 'set', key: 'law.ward.fired_turn', value: ctx.turn },
          ],
          summary: 'The air tightens. Something turns its attention to you.',
          data: { contacts },
        },
      ];
      return {
        nativeNext: native,
        events,
        scheduled: [
          sched(ctx.turn, 'summon_act', 'combat.strike', 'watcher_strike', `strike:${ctx.turn}`, {
            contacts,
          }),
        ],
      };
    }
    return {};
  },
};

// ---- combat.strike: the summon's blow, with the delegated-lethality clamp --
const combat: Module = {
  manifest: manifest('combat.strike', 30, ['attack'], ['survival'], ['survival', 'law']),
  init: () => ({}),
  claims: (intent) => intent.class === 'attack',
  validateLegality: () => ({ legal: true }),
  execute: (args): ModuleResult => ({
    nativeNext: args.native,
    events: [],
    control: { kind: 'continue' },
  }),
  onScheduled: (ev, native, _facts, tape): ModuleResult => {
    if (ev.kind !== 'watcher_strike') return { nativeNext: native, events: [], control: { kind: 'continue' } };
    const contacts = typeof ev.payload?.contacts === 'number' ? (ev.payload.contacts as number) : 1;
    tape.die('combat', 6, 'watcher graze'); // exercise the tape
    if (contacts <= 1) {
      // delegated-lethality clamp: first contact is NEVER fatal
      return {
        nativeNext: native,
        events: [
          {
            tag: 'watcher_graze',
            mutations: [{ op: 'set', key: 'survival.pc', value: 'wounded' }],
            summary: 'The Watcher rakes you and recedes — a warning, not a killing.',
            severity: 'reversible',
          },
        ],
        control: { kind: 'continue' },
      };
    }
    return {
      nativeNext: native,
      events: [
        {
          tag: 'watcher_kill',
          mutations: [{ op: 'set', key: 'survival.pc', value: 'dead' }],
          summary: 'The Watcher does not warn twice.',
          severity: 'lethal',
        },
      ],
      control: { kind: 'terminate', label: 'dead' },
    };
  },
};

// ---- ritual.gate: pushes a nested encounter on `use` -----------------------
const ritual: Module = {
  manifest: manifest('ritual.gate', 20, ['use'], ['flag'], ['flag']),
  init: () => ({}),
  claims: (intent) => intent.class === 'use',
  validateLegality: () => ({ legal: true }),
  execute: (args): ModuleResult => ({
    nativeNext: args.native,
    events: [
      {
        tag: 'ritual_open',
        mutations: [{ op: 'set', key: 'flag.ritual', value: 'open' }],
        summary: 'Something steps out of the dark to meet you.',
      },
    ],
    control: {
      kind: 'push',
      request: {
        module: 'encounter.watcher',
        entry: 'closes_in',
        fuse: 2,
        terminalLabels: ['fled', 'slain', 'survived'],
      },
    },
  }),
};

// ---- encounter.watcher: a nested frame the player resolves -----------------
const encounter: Module = {
  manifest: manifest('encounter.watcher', 40, ['flee', 'attack', 'wait'], ['flag'], ['flag']),
  init: () => ({}),
  claims: () => false, // only ever the owner via the pushdown stack
  validateLegality: () => ({ legal: true }),
  execute: (args): ModuleResult => {
    if (args.action.intent.class === 'flee') {
      return {
        nativeNext: args.native,
        events: [
          {
            tag: 'fled',
            mutations: [{ op: 'set', key: 'flag.encounter_outcome', value: 'fled' }],
            summary: 'You break away into the dark.',
          },
        ],
        control: { kind: 'terminate', label: 'fled' },
      };
    }
    return {
      nativeNext: args.native,
      events: [{ tag: 'stalk', mutations: [], summary: 'It circles, just out of reach.' }],
      control: { kind: 'continue' },
    };
  },
};

// ---------------------------------------------------------------------------
//  A tiny driver/harness around the kernel
// ---------------------------------------------------------------------------
const REGISTRY = new ModuleRegistry([spine, clock, travel, anomaly, combat, ritual, encounter]);

function freshState(extra: Record<string, unknown> = {}): GameState {
  return initialState(REGISTRY, 'hostile-seed', {
    'law.ward.armed': true,
    'phase.now': 'still',
    'survival.pc': 'alive',
    'loc.pc': 'outside',
    ...extra,
  } as Record<string, import('../../src/sdk/json.js').JsonValue>);
}

function obs(state: GameState, role: Role): RoleObservation {
  return {
    turn: state.turn,
    role,
    location: (state.facts['loc.pc'] as string) ?? '—',
    facts: state.facts,
    self: {},
    scene: {
      nodeId: (state.facts['loc.pc'] as string) ?? '—',
      title: 'slice',
      exits: [],
      entities: [],
      tellHints: [],
      labels: [],
    },
    legalActions: [],
  };
}

const armedAt = (): ReadonlySet<string> => new Set(['ward']);

function intent(cls: IntentClass, confidence = 0.95, extra: Partial<ParsedIntent> = {}): ParsedIntent {
  return { class: cls, tags: [], confidence, raw: cls, ...extra };
}

class Harness {
  state: GameState;
  log: EventLog;
  constructor(extra: Record<string, unknown> = {}) {
    this.state = freshState(extra);
    this.log = new EventLog('c1', this.state.seed, engineFingerprint(REGISTRY), hashState(this.state));
  }
  do(i: ParsedIntent, opts: { clarifyAllowed?: boolean } = {}) {
    const outcome = step(this.state, REGISTRY, i, {
      armed: armedAt(),
      observation: obs(this.state, 'player'),
      ...(opts.clarifyAllowed !== undefined ? { clarifyAllowed: opts.clarifyAllowed } : {}),
    });
    if (outcome.kind === 'committed') {
      const rec: EventRecord = {
        eventIndex: outcome.state.turn,
        intent: i,
        owner: outcome.owner,
        tape: outcome.tape,
        events: outcome.events,
        priorHash: outcome.priorHash,
        nextHash: outcome.nextHash,
      };
      this.log.append(rec);
      this.state = outcome.state;
    }
    return outcome;
  }
}

const driver = (): ReplayDriver => ({
  registry: REGISTRY,
  initialState: () => freshState(),
  armedAt,
  observationAt: (s, role) => obs(s, role),
});

type Committed = Extract<ReturnType<Harness['do']>, { kind: 'committed' }>;

// ===========================================================================
//  TESTS
// ===========================================================================
describe('hostile kernel vertical slice', () => {
  it('K6/K7: three effects interact across multiple same-beat events, in canonical order', () => {
    const h = new Harness();
    const r = h.do(intent('cross_threshold'));
    expect(r.kind).toBe('committed');
    // canonical beat order: action(cross) -> travel_complete(arrived) -> phase_change(bell)
    //                       -> law_trigger(ward) -> summon_act(graze)
    expect((r as Committed).events.map((e) => e.tag)).toEqual([
      'cross',
      'physical_act',
      'arrived',
      'bell_rung',
      'ward_triggered',
      'watcher_graze',
    ]);
    // the law correctly saw the *rung* bell because phase_change resolves before law_trigger
    expect(h.state.facts['survival.pc']).toBe('wounded'); // first contact: non-lethal (clamp + fail-safe)
    expect(h.state.facts['law.ward.contacts']).toBe(1);
    expect(h.state.status).toBe('active');
  });

  it('K8: an ambiguous lethal command can never commit a lethal outcome', () => {
    // primed: this is the SECOND contact (the law has already warned once)
    const primed = { 'law.ward.contacts': 1 };

    // HIGH confidence -> the lethal outcome commits (the warning was already given). The loss is
    // NOT softened: a sure command still spends it in full.
    const high = new Harness(primed);
    const lethal = high.do(intent('cross_threshold', 0.95));
    expect(lethal.kind).toBe('committed');
    expect(high.state.facts['survival.pc']).toBe('dead');
    expect(high.state.status).toBe('lost');

    // SAME action, LOW confidence -> K8 still BLOCKS the lethal commit (it is never softened); but
    // instead of throwing an engine-token debug string it asks the player to CONFIRM, diegetically.
    const low = new Harness(primed);
    const priorHash = hashState(low.state);
    const guarded = low.do(intent('cross_threshold', 0.5));
    expect(guarded.kind).toBe('clarify'); // ask, don't dump a debug string
    // the lethal event did NOT commit, and the prior state is unchanged (atomicity by construction)
    expect(low.state.facts['survival.pc']).not.toBe('dead');
    expect(low.state.status).toBe('active');
    expect(hashState(low.state)).toBe(priorHash);
    // and the player-facing question carries NO engine token
    const q = (guarded as Extract<typeof guarded, { kind: 'clarify' }>).request.question;
    for (const token of ['K8', 'cap=', 'severity', 'lethal', 'irreversible', 'NOT_UNDERSTOOD', 'StepReject']) {
      expect(q).not.toContain(token);
    }
  });

  it('K8: with the clarify budget spent, the lethal command is REFUSED in-world (no engine tokens, still atomic)', () => {
    const primed = { 'law.ward.contacts': 1 };
    const low = new Harness(primed);
    const priorHash = hashState(low.state);
    // clarifyAllowed:false -> the circuit breaker is exhausted; the gate falls back to a diegetic refuse.
    const refused = low.do(intent('cross_threshold', 0.5), { clarifyAllowed: false });
    expect(refused.kind).toBe('rejected');
    const r = refused as Extract<typeof refused, { kind: 'rejected' }>;
    expect(r.code).toBe('K8_SEVERITY'); // still tagged K8 for the machine layer...
    // ...but the player-facing reason is in-world prose with NO engine token
    for (const token of ['K8', 'cap=', 'severity', 'lethal', 'irreversible', 'NOT_UNDERSTOOD', 'StepReject']) {
      expect(r.reason).not.toContain(token);
    }
    // the lethal event did NOT commit; the prior state is unchanged
    expect(low.state.facts['survival.pc']).not.toBe('dead');
    expect(hashState(low.state)).toBe(priorHash);
  });

  it('nested frame: push an encounter, flee to resolve it; stack returns empty', () => {
    const h = new Harness();
    const opened = h.do(intent('use'));
    expect(opened.kind).toBe('committed');
    expect(h.state.stack.length).toBe(1);
    expect(h.state.stack[0]!.module).toBe('encounter.watcher');

    // the frame now owns the turn: `flee` terminates it
    const fled = h.do(intent('flee'));
    expect(fled.kind).toBe('committed');
    expect(h.state.stack.length).toBe(0);
    expect(h.state.facts['flag.encounter_outcome']).toBe('fled');
  });

  it('nested frame fuse: an unresolved frame is discarded when its fuse expires', () => {
    const h = new Harness();
    h.do(intent('use')); // push frame, fuse 2 (fires at pushTurn+2)
    h.do(intent('wait')); // turn 2: frame still active
    expect(h.state.stack.length).toBe(1);
    h.do(intent('wait')); // turn 3: fuse_expire fires -> frame discarded
    expect(h.state.stack.length).toBe(0);
    expect(h.state.facts['flag.encounter_outcome']).toBeUndefined(); // discarded, not resolved
  });

  it('rejection returns the unchanged prior state (atomicity)', () => {
    const h = new Harness({ 'loc.pc': 'inside' });
    h.state = { ...h.state, native: { ...h.state.native, 'travel.move': { node: 'inside' } } };
    const priorHash = hashState(h.state);
    const r = h.do(intent('cross_threshold')); // illegal: already inside
    expect(r.kind).toBe('rejected');
    expect((r as Extract<typeof r, { kind: 'rejected' }>).code).toBe('NOT_LEGAL');
    expect(hashState(h.state)).toBe(priorHash);
  });

  it('exact replay reproduces every hash; a tamper is detected', () => {
    const h = new Harness();
    h.do(intent('cross_threshold'));
    h.do(intent('wait'));
    h.do(intent('look'));
    const golden = h.log.toGolden();
    expect(golden.records.length).toBe(3);

    const ok = replay(driver(), golden);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.finalHash).toBe(hashState(h.state));

    // tamper: flip a recorded rng draw -> divergence detected, localized to its index
    const tampered = {
      ...golden,
      records: golden.records.map((r) => ({
        ...r,
        tape: r.tape.map((t) =>
          t.kind === 'rng' && typeof t.value === 'number' ? { ...t, value: (t.value as number) + 0.1 } : t,
        ),
      })),
    };
    const bad = replay(driver(), tampered);
    expect(bad.ok).toBe(false);
  });

  it('determinism: two independent runs of the same intents yield identical final hashes', () => {
    const a = new Harness();
    const b = new Harness();
    for (const seq of [intent('look'), intent('cross_threshold'), intent('wait')]) {
      a.do(seq);
      b.do(seq);
    }
    expect(hashState(a.state)).toBe(hashState(b.state));
  });

  it('property/fuzz: 200 random intent sequences each replay bit-identically', () => {
    // a deterministic LCG drives sequence generation (no Math.random in a determinism test)
    let lcg = 0x2545f491;
    const rnd = () => (lcg = (lcg * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const verbs: IntentClass[] = ['look', 'wait', 'cross_threshold', 'look_back', 'use', 'flee', 'attack', 'rest'];

    for (let run = 0; run < 200; run++) {
      const a = new Harness();
      const b = new Harness();
      const len = 3 + Math.floor(rnd() * 8);
      for (let k = 0; k < len; k++) {
        const v = verbs[Math.floor(rnd() * verbs.length)]!;
        const conf = 0.5 + rnd() * 0.5;
        const i = intent(v, conf);
        a.do(i);
        b.do(i);
      }
      // independent identical runs converge
      expect(hashState(a.state)).toBe(hashState(b.state));
      // and the recorded golden tape replays bit-for-bit
      const res = replay(driver(), a.log.toGolden());
      expect(res.ok, JSON.stringify(res)).toBe(true);
    }
  });
});
