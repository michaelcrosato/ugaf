/**
 * The core SDK contracts — the seam between the deterministic kernel and the
 * intact modules. The kernel imports these TYPES and operates over an injected
 * registry of modules (the AdventureForge `Rules` seam). It never imports a
 * concrete module; modules implement these contracts and import only the SDK.
 */
import type { JsonObject, JsonValue } from './json.js';
import type { FactRecord, FactView, FactMutation } from './facts.js';
import type { ParsedIntent, IntentClass } from './intents.js';
import type { TapeReader } from './tape.js';

// ---------------------------------------------------------------------------
//  Identifiers
// ---------------------------------------------------------------------------
export type ModuleId = string; // "publisher.system.module", e.g. "anomaly.hush"
export type EntityId = string; // "pc", "npc.warden", "item.lantern"

// ---------------------------------------------------------------------------
//  World events — FACTS, never converted statistics
// ---------------------------------------------------------------------------
/**
 * The only authoritative cross-module currency. A module emits world events;
 * the kernel validates the writer is permitted the namespaces and applies the
 * mutations to canonical facts. Carries a semantic tag + render payload so the
 * narrator can speak it, and a visibility flag for observation masking.
 */
export interface WorldEvent {
  readonly tag: string; // semantic id: "gate_opened", "unsettled_gained", "tell_observed"
  readonly mutations: readonly FactMutation[]; // canonical fact writes (facts only)
  readonly summary?: string; // human-readable, drives render hints + provenance
  readonly data?: JsonObject; // structured payload for the renderer
  readonly visibility?: 'public' | 'private'; // private = stripped from player transcript
  readonly source?: ModuleId; // stamped by the kernel; who emitted it
  /**
   * K8 consequence severity. Default 'reversible'. The pipeline REJECTS any step
   * whose action carried an uncertain intent (severityCap < 'full') if it would
   * commit an 'irreversible' or 'lethal' event — anywhere, including downstream
   * beats. A lethal outcome can never follow from an uncertain intent.
   */
  readonly severity?: 'reversible' | 'irreversible' | 'lethal';
}

// ---------------------------------------------------------------------------
//  Render payload — band/valence/labels the narrator turns into prose
// ---------------------------------------------------------------------------
export type Band = 'yes-and' | 'yes' | 'yes-but' | 'no-but' | 'no' | 'no-and';
export type Valence = 'boon' | 'cost' | 'neutral';

export interface RenderPayload {
  readonly band?: Band;
  readonly valence?: Valence;
  /** stable label keys the renderer maps to prose fragments (the "tell library") */
  readonly labels?: readonly string[];
  /** entity ids the prose may reference (Gate B affordance grounding) */
  readonly entities?: readonly EntityId[];
  /** authored fallback prose used if the LLM render exhausts the firewall */
  readonly fallback?: string;
  /** free-form render hints (mood, tempo) — never state facts */
  readonly hints?: JsonObject;
}

// ---------------------------------------------------------------------------
//  Pushdown module stack (nested / encapsulated frames) — §7 architecture
// ---------------------------------------------------------------------------
export interface StackFrame {
  readonly module: ModuleId; // which module owns this frame
  readonly snapshotHash: string; // immutable hash of suspended state for restore-on-abort
  readonly fuse?: number; // turns until forced terminate (anti-wedge); absent = none
  readonly terminalLabels: readonly string[]; // the legal terminal outcomes this frame may pop with
  readonly meta?: JsonObject; // frame-local bookkeeping (not canonical facts)
}

// ---------------------------------------------------------------------------
//  Scheduler (K7) — canonical same-beat event order + staged future events
// ---------------------------------------------------------------------------
/** Phases in the canonical same-beat order. Lower index resolves first. */
export const BEAT_PHASES = [
  'travel_complete', // a journey lands
  'phase_change', // dusk/night/predawn boundary crosses
  'law_trigger', // a law fires from the committed action
  'summon_act', // summoned agents take their turn
  'drift_apply', // Law Drift mutates a law
  'fuse_expire', // a nested frame's fuse runs out
  'schedule_fire', // generic scheduled events
] as const;
export type BeatPhase = (typeof BEAT_PHASES)[number];

export interface ScheduledEvent {
  readonly fireAtTurn: number; // absolute turn index when it resolves
  readonly phase: BeatPhase; // tie-break ordering within a beat
  readonly module: ModuleId; // which module handles it when it fires
  readonly kind: string; // module-specific event kind
  readonly payload?: JsonObject; // module-specific data
  /** deterministic tiebreak within (turn, phase): lower sorts first, then by id */
  readonly order?: number;
  readonly id: string; // stable id for dedup + sorting
}

export interface SchedulerState {
  readonly pending: readonly ScheduledEvent[];
}

// ---------------------------------------------------------------------------
//  Game state — the three layers, minus derived presentation
// ---------------------------------------------------------------------------
export interface GameState {
  readonly turn: number; // event/turn index; the SOLE source of game-time
  readonly seed: string; // campaign seed
  readonly facts: FactRecord; // canonical world facts
  readonly native: Readonly<Record<ModuleId, JsonObject>>; // per-module native slices
  readonly stack: readonly StackFrame[]; // pushdown frames (top = last)
  readonly scheduler: SchedulerState; // K7 pending beats
  readonly rngCounters: Readonly<Record<string, number>>; // tape position per stream
  readonly status: GameStatus; // top-level lifecycle
}

export type GameStatus = 'active' | 'won' | 'lost' | 'ended';

// ---------------------------------------------------------------------------
//  Observation (presentation input) — masked, role-scoped
// ---------------------------------------------------------------------------
export type Role = 'player' | 'spectator' | 'author';

export interface RoleObservation {
  readonly turn: number;
  readonly role: Role;
  readonly location: string; // current node id (or "—")
  readonly facts: FactRecord; // ONLY the facts this role may know (already masked)
  readonly self: JsonObject; // visible self-state (no hidden numbers for player)
  readonly scene: SceneView; // the rendered/able scene model
  readonly legalActions: readonly LegalAction[]; // affordances the role currently has
}

export interface SceneView {
  readonly nodeId: string;
  readonly title: string;
  readonly regionId?: string;
  readonly phase?: string; // day/night, if known
  readonly exits: readonly { readonly dir: string; readonly to?: string; readonly label: string }[];
  readonly entities: readonly { readonly id: EntityId; readonly label: string; readonly kind: string }[];
  readonly tellHints: readonly string[]; // stable tell-library cue keys present and observable
  readonly labels: readonly string[]; // descriptive label keys for the renderer
}

export interface LegalAction {
  readonly id: string; // stable action id
  readonly label: string; // human label ("cross the Mile Road")
  readonly intent: IntentClass; // the intent it maps to
  readonly target?: string; // entity/route id
  readonly data?: JsonObject; // extra structured args
}

// ---------------------------------------------------------------------------
//  Action routing + legality
// ---------------------------------------------------------------------------
export interface RoutedAction {
  readonly intent: ParsedIntent;
  readonly owner: ModuleId; // the jurisdiction owner the router selected
  readonly action: ValidatedAction;
}

export interface ValidatedAction {
  readonly intent: ParsedIntent;
  /** resolved structured args the module legality-checked */
  readonly args: JsonObject;
  /** the maximum consequence severity permitted this turn (K8 monotonic cap) */
  readonly severityCap: SeverityCap;
}

/** K8: as parser confidence falls, the max permissible severity falls, never rises. */
export type SeverityCap = 'full' | 'reversible' | 'safe_hold';

// ---------------------------------------------------------------------------
//  Module execution
// ---------------------------------------------------------------------------
export type Control =
  | { readonly kind: 'continue' }
  | { readonly kind: 'yield' } // hand back to spine/floor
  | { readonly kind: 'terminate'; readonly label: string } // pop this frame with a terminal label
  | { readonly kind: 'push'; readonly request: NestedRequest }; // push a nested frame

export interface NestedRequest {
  readonly module: ModuleId;
  readonly entry: string; // entry-point name (a source-defined extension point)
  readonly fuse?: number;
  readonly terminalLabels: readonly string[];
  readonly payload?: JsonObject;
}

/** A clarification request (K8 circuit breaker) — reversible, non-lethal by construction. */
export interface ClarifyRequest {
  readonly question: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
}

export interface ModuleResult {
  readonly nativeNext: JsonObject; // this module's next slice
  readonly events: readonly WorldEvent[]; // canonical fact mutations (facts only)
  readonly control: Control;
  readonly scheduled?: readonly ScheduledEvent[]; // K7 future beats to enqueue
  readonly render?: RenderPayload; // band/valence/labels for the narrator
  readonly clarify?: ClarifyRequest; // ask instead of act (K8)
}

export interface ExecuteArgs {
  readonly native: JsonObject; // this module's slice (treat as read-only)
  readonly facts: FactView; // permitted canonical facts
  readonly observation: RoleObservation; // the acting role's masked view
  readonly action: ValidatedAction; // routed + legality-checked
  readonly tape: TapeReader; // deterministic draws
  readonly ctx: ModuleContext;
}

export interface ModuleContext {
  readonly turn: number;
  readonly phase: string | undefined; // current world phase (day/night)
  /** read a sibling module's PUBLIC summary (never its native numbers) */
  readonly peekFact: (key: string) => JsonValue | undefined;
  /** stable per-turn nonce for any provenance the module wants to stamp */
  readonly turnTag: string;
}

export interface LegalityResult {
  readonly legal: boolean;
  readonly reason?: string; // human + machine readable rejection
  /** structured args promoted from the intent after legality (passed to execute) */
  readonly args?: JsonObject;
}

// ---------------------------------------------------------------------------
//  Module manifest (the registration contract / routing key)
// ---------------------------------------------------------------------------
export type Fidelity = 'whole-system' | 'native-subsystem' | 'complete-game';
export type LicenseTier = 'green' | 'yellow' | 'red'; // ship-faithfully / caveat / clean-room

export interface ModuleManifest {
  readonly id: ModuleId;
  readonly version: string; // semver
  readonly contentHash: string; // hash of the module's frozen content (laws, move-sets, graph)
  readonly source: string; // exact document + section (faithfulness anchor)
  readonly license: {
    readonly identifier: string; // e.g. "CC-BY-4.0"
    readonly attribution: string;
    readonly tier: LicenseTier;
    readonly approvedForImplementation: boolean;
    /** K11: provenance/acceptance class — licensed-source fidelity vs clean-room */
    readonly provenance: 'licensed-source' | 'clean-room';
    readonly indicationOfChanges?: string; // CC-BY-4.0 / ORC requirement
  };
  readonly fidelity: Fidelity;
  readonly domain: string; // primary domain (combat, investigation, anomaly, ...)
  readonly priority: number; // routing priority; spine floor is lowest
  readonly jurisdiction: {
    readonly scales: readonly string[];
    readonly domains: readonly string[];
    readonly phases: readonly string[];
    readonly intents: readonly IntentClass[]; // intent classes this module can claim
  };
  readonly owns: { readonly nativeStatePaths: readonly string[] }; // native slice keys it solely writes
  readonly writesFacts: readonly string[]; // canonical fact namespaces it may write
  readonly readsFacts: readonly string[]; // canonical fact namespaces it reads
  readonly forbids: {
    readonly numericalCrosswalks: true;
    readonly normalizedOutcomes: true;
    readonly universalBaseStatistics: true;
    readonly runtimeRuleGeneration: true;
  };
}

// ---------------------------------------------------------------------------
//  The module interface — one shape every intact module implements
// ---------------------------------------------------------------------------
export interface Module {
  readonly manifest: ModuleManifest;
  /** initial native slice for a fresh campaign (pure fn of seed + pack content) */
  init(seed: string): JsonObject;
  /**
   * Does this module CLAIM an intent in the current fact context? Pure boolean
   * guard over canonical facts + arming conditions. The router collects all
   * claimants; exactly one must own (or spine floors it).
   */
  claims(intent: ParsedIntent, facts: FactView, armed: ReadonlySet<string>): boolean;
  /** native legality check; rejects illegal actions before execute (atomicity). */
  validateLegality(intent: ParsedIntent, native: JsonObject, facts: FactView): LegalityResult;
  /** the pure reducer fragment for this module. */
  execute(args: ExecuteArgs): ModuleResult;
  /**
   * Optional: handle a scheduled beat that fired (K7). Returns events + native
   * delta the same way execute does, but driven by the scheduler, not a player.
   */
  onScheduled?(event: ScheduledEvent, native: JsonObject, facts: FactView, tape: TapeReader, ctx: ModuleContext): ModuleResult;
  /**
   * The beat phases this module wants to be POLLED in each beat (reactive
   * standing triggers — e.g. anomaly.hush polls `law_trigger`; time.cycle polls
   * `phase_change`). Polled in canonical phase order, after scheduled events.
   */
  readonly beatTriggers?: readonly BeatPhase[];
  /**
   * Reactive beat handler. Pure fn over current native+facts. Returns events,
   * native delta, and optionally schedules future beats. Returning no events +
   * unchanged native is the no-op (the common case when nothing triggers).
   */
  onBeat?(phase: BeatPhase, native: JsonObject, facts: FactView, tape: TapeReader, ctx: ModuleContext): BeatResult;
  /** optional static content validator (winnability/fairness proof). */
  validateContent?(): ContentValidation;
}

/** What a reactive beat may produce. Omitted fields mean "unchanged / none". */
export interface BeatResult {
  readonly nativeNext?: JsonObject;
  readonly events?: readonly WorldEvent[];
  readonly scheduled?: readonly ScheduledEvent[];
  readonly render?: RenderPayload;
  /** a beat may push a nested frame (e.g. a summon initiates an encounter) */
  readonly push?: NestedRequest;
}

export interface ContentValidation {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}
