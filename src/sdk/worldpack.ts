/**
 * World Pack schema — a setting is DATA conforming to this shape; the engine is
 * setting-agnostic (The Hush is the first pack, not the engine). Definitions are
 * immutable + content-hashed; runtime state lives in canonical facts / native
 * slices, never here.
 *
 * The prose model is the craft core (research rules 12/14): a node's description
 * is a `base` of a few very particular details + `when`-gated variant fragments
 * that shift with world/law state + `ambient` lines that cycle deterministically
 * so revisits never read identically. Every notable noun is a real `Examinable`
 * (BENT). Tells render from a FIXED tell library (stable signifiers) so a
 * "misread = costly" law stays learnable.
 */
import type { JsonValue } from './json.js';
import type { Predicate, LawDefinition, Tell, SensoryChannel, KnowledgeStage } from './law.js';

// ---------------------------------------------------------------------------
//  Reactive prose
// ---------------------------------------------------------------------------
export interface Variant {
  readonly when: Predicate;
  readonly text: string;
  /** replace the base entirely instead of appending (for dramatic state shifts). */
  readonly replace?: boolean;
}

export interface DescriptionBlock {
  readonly base: string;
  readonly variants?: readonly Variant[];
  /** cycling ambient lines; the renderer picks one deterministically per (node, turn). */
  readonly ambient?: readonly string[];
  /** a once-only reveal fired on first visit/examine, then folded away. */
  readonly firstReveal?: string;
}

export interface Examinable {
  readonly id: string;
  readonly names: readonly string[]; // synonyms the parser accepts (research rule 19)
  readonly look: DescriptionBlock;
  readonly tell?: string; // a tell-library id this object surfaces when examined
  readonly itemClass?: string; // if it is/contains a class of item (metal, light)
  readonly takeable?: string; // item id granted on TAKE, if any
}

// ---------------------------------------------------------------------------
//  Graph
// ---------------------------------------------------------------------------
export type NodeKind = 'settlement' | 'district' | 'junction' | 'poi' | 'interior' | 'event-site' | 'waystation';

export interface ExitDef {
  readonly dir: string; // "north", "in", "up", "the mile road"...
  readonly to: string; // destination node id
  readonly label: string; // human label ("the Mile Road, north")
  readonly via?: string; // edge id, if traversal has route mechanics
  readonly hidden?: boolean; // not listed until discovered
  readonly when?: Predicate; // passable only when true (else shown as blocked)
  readonly blockedText?: string; // prose when the exit is not passable
}

export interface NodeDef {
  readonly id: string;
  readonly title: string;
  readonly regionId: string;
  readonly kind: NodeKind;
  readonly look: DescriptionBlock;
  readonly examinables?: readonly Examinable[];
  readonly exits: readonly ExitDef[];
  readonly tells?: readonly string[]; // tell ids observable here (LOOK/SEARCH surfaces them)
  readonly npcs?: readonly string[]; // npc ids present (or schedule-driven)
  readonly items?: readonly string[]; // item ids lying here
  /** initial facts set when this node is authored into the world (rare). */
  readonly onEnterFacts?: Readonly<Record<string, JsonValue>>;
}

export interface EdgeDef {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly bidirectional?: boolean;
  readonly label: string;
  readonly distance: number; // base milepost cost
  readonly mode?: string; // "road" | "ford" | "field" ...
  readonly when?: Predicate; // passable condition
  readonly tells?: readonly string[]; // tells observable en route
}

export interface RegionDef {
  readonly id: string;
  readonly name: string;
  readonly palette: { readonly sight: string; readonly sound: string; readonly smell: string }; // the strict sensory baseline (rule 10)
  readonly description: string;
}

// ---------------------------------------------------------------------------
//  Entities
// ---------------------------------------------------------------------------
export interface ItemDef {
  readonly id: string;
  readonly names: readonly string[];
  readonly look: DescriptionBlock;
  readonly itemClass?: string; // "metal" | "light" | "tool" | ...
  readonly portable?: boolean;
}

export interface DialogueLine {
  readonly id: string;
  readonly when?: Predicate;
  readonly topic?: string; // ask_about topic this answers (a rumor/law/place id)
  readonly text: string;
  readonly grantsRumor?: string; // a rumor id the player learns
  readonly grantsLeadTell?: string; // a tell id the NPC reveals
  readonly setsFacts?: Readonly<Record<string, JsonValue>>;
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly names: readonly string[];
  readonly faction?: string;
  readonly look: DescriptionBlock;
  readonly disposition?: number; // -3..+3 starting lean
  readonly atNodes?: readonly string[]; // where they can be found (simple schedule)
  readonly dialogue?: readonly DialogueLine[];
}

export interface FactionDef {
  readonly id: string;
  readonly name: string;
  readonly role: string; // "control" | "knowledge" | "economy" | "wildcard" | "civilian"
  readonly description: string;
}

// ---------------------------------------------------------------------------
//  Knowledge & rumor
// ---------------------------------------------------------------------------
export interface RumorDef {
  readonly id: string;
  readonly text: string;
  readonly topic: string; // a law id / place id / faction id
  readonly truth: 'true' | 'distorted' | 'false';
  readonly reliability: number; // 0..1 the source's reliability
  readonly source?: string; // npc/faction id
}

/** Stable prose for a tell-library entry — redundant sensory channels (rule 8). */
export interface TellProse {
  readonly id: string;
  readonly channel: SensoryChannel;
  /** the FIXED signifier phrasing (the learnable cue), rendered consistently. */
  readonly cue: string;
  /** what the player learns when they read the cue (codex line for `referenced`). */
  readonly note: string;
  /** the deduced-law line, shown once the law reaches `surveyed`. */
  readonly conclusion?: string;
}

// ---------------------------------------------------------------------------
//  Per-seed variance (the replay/dwell engine, redteam product fork)
// ---------------------------------------------------------------------------
export interface SeedVarianceSpec {
  /** of the full law set, how many are LIVE in a given seed (per-seed which-laws). */
  readonly liveLaws: { readonly min: number; readonly max: number; readonly always?: readonly string[] };
  /** rumor truth/distortion is re-rolled per seed. */
  readonly rerollRumorTruth?: boolean;
  /** starting kit/debt variants. */
  readonly startKits?: readonly { readonly id: string; readonly items: readonly string[]; readonly facts?: Readonly<Record<string, JsonValue>> }[];
}

// ---------------------------------------------------------------------------
//  The pack
// ---------------------------------------------------------------------------
export interface WorldPack {
  readonly meta: {
    readonly id: string;
    readonly title: string;
    readonly version: string;
    readonly schemaVersion: number;
    readonly licenseTier: 'green' | 'yellow' | 'red';
    readonly contentHash?: string; // filled at seal time
  };
  readonly regions: readonly RegionDef[];
  readonly nodes: readonly NodeDef[];
  readonly edges: readonly EdgeDef[];
  readonly items: readonly ItemDef[];
  readonly npcs: readonly NpcDef[];
  readonly factions: readonly FactionDef[];
  readonly rumors: readonly RumorDef[];
  readonly laws: readonly LawDefinition[];
  readonly tellLibrary: readonly TellProse[];
  readonly start: {
    readonly node: string;
    readonly facts?: Readonly<Record<string, JsonValue>>;
    readonly inventory?: readonly string[];
    /** the player's opening lead (shown at the start; rule: arrive under-informed). */
    readonly opening?: string;
  };
  /** win/lose goals the session checks each turn (a goal's `when` satisfied => end). */
  readonly goals?: readonly { readonly id: string; readonly when: Predicate; readonly outcome: 'won' | 'lost'; readonly title: string; readonly epilogue: string }[];
  readonly seedVariance?: SeedVarianceSpec;
}

export type { Tell, KnowledgeStage };
