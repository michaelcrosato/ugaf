/**
 * The Law Grammar — what makes the Hush's anomalies *lawful*: machine-checkable,
 * composable, learnable. A law modifies EXACTLY ONE effect-category (the
 * conflict/coherence checks run on `effectCategory` only, which keeps them
 * decidable). Its trigger + ambient gate are category-free, expressed in a
 * BOUNDED, declarative predicate language (K10) so the boot-time collision audit
 * and the coherence pass can quantify over a finite, analyzable set.
 *
 * Laws are DATA. The `anomaly.hush` module is their owner/interpreter; it applies
 * their effects as canonical facts that the base modules (travel.graph, etc.)
 * read. Two laws on one scene compose via the total category×category matrix
 * (the deterministic emergence engine, K6) — never via the spine d6.
 */
import type { FactValue, FactView } from './facts.js';
import type { IntentClass } from './intents.js';

// ---------------------------------------------------------------------------
//  Effect categories (closed, 6) — classify by CONSEQUENCE, not by tell
// ---------------------------------------------------------------------------
export const EFFECT_CATEGORIES = ['topology', 'material', 'causality', 'perception', 'agency', 'summon'] as const;
export type EffectCategory = (typeof EFFECT_CATEGORIES)[number];

/** canonical fold rank — when many effects bear on one scene, fold in this order (K6). */
export const CATEGORY_RANK: Record<EffectCategory, number> = {
  causality: 0, // time/ordering first (it can change which others apply)
  topology: 1, // then space/distance
  material: 2, // then matter
  perception: 3, // then what's observable
  agency: 4, // then what you may do
  summon: 5, // spawns act last
};

// ---------------------------------------------------------------------------
//  Knowledge stages — the law codex progression (knowledge-as-progression)
// ---------------------------------------------------------------------------
export const KNOWLEDGE_STAGES = ['unknown', 'referenced', 'approximate', 'surveyed', 'transformed'] as const;
export type KnowledgeStage = (typeof KNOWLEDGE_STAGES)[number];
export function stageRank(s: KnowledgeStage): number {
  return KNOWLEDGE_STAGES.indexOf(s);
}

// ---------------------------------------------------------------------------
//  Bounded declarative predicate language (K10) — analyzable, no arbitrary code
// ---------------------------------------------------------------------------
export type Predicate =
  | { readonly all: readonly Predicate[] }
  | { readonly any: readonly Predicate[] }
  | { readonly not: Predicate }
  | { readonly fact: string; readonly eq?: FactValue; readonly neq?: FactValue; readonly gte?: number; readonly lte?: number; readonly exists?: boolean }
  | { readonly intent: IntentClass | readonly IntentClass[] } // the generic physical act just performed
  | { readonly phase: string | readonly string[] } // current world phase
  | { readonly carrying: string } // carry_item_class tag in force
  | { readonly spokeName: true } // an in-scope name was spoken aloud this turn
  | { readonly always: true };

/** Evaluate a predicate over the current facts. Pure, total, terminating. */
export function evalPredicate(p: Predicate, facts: FactView): boolean {
  if ('always' in p) return true;
  if ('all' in p) return p.all.every((q) => evalPredicate(q, facts));
  if ('any' in p) return p.any.some((q) => evalPredicate(q, facts));
  if ('not' in p) return !evalPredicate(p.not, facts);
  if ('intent' in p) {
    const cur = facts.getString('flag.last_intent');
    const want = Array.isArray(p.intent) ? p.intent : [p.intent];
    return cur !== undefined && want.includes(cur as IntentClass);
  }
  if ('phase' in p) {
    const cur = facts.getString('phase.now');
    const want = Array.isArray(p.phase) ? p.phase : [p.phase];
    return cur !== undefined && want.includes(cur);
  }
  if ('carrying' in p) {
    const v = facts.get('flag.last_item_class');
    if (Array.isArray(v)) return v.includes(p.carrying);
    return v === p.carrying;
  }
  if ('spokeName' in p) {
    return facts.getString('flag.last_intent') === 'speak_aloud' && !!facts.getString('flag.last_utterance');
  }
  // fact predicate
  const val = facts.get(p.fact);
  if (p.exists !== undefined) return p.exists === (val !== undefined);
  if (p.eq !== undefined) return val === p.eq;
  if (p.neq !== undefined) return val !== p.neq;
  if (p.gte !== undefined) return typeof val === 'number' && val >= p.gte;
  if (p.lte !== undefined) return typeof val === 'number' && val <= p.lte;
  return val !== undefined;
}

/** Static analysis for the collision audit: which intent classes can fire this predicate. */
export function predicateIntents(p: Predicate): Set<IntentClass> | 'any' {
  if ('intent' in p) return new Set(Array.isArray(p.intent) ? p.intent : [p.intent]);
  if ('spokeName' in p) return new Set<IntentClass>(['speak_aloud']);
  if ('carrying' in p) return new Set<IntentClass>(['carry_item_class']);
  if ('all' in p) {
    // an `all` fires only on the intersection of its children's intent sets
    let acc: Set<IntentClass> | 'any' = 'any';
    for (const q of p.all) {
      const s = predicateIntents(q);
      if (s === 'any') continue;
      if (acc === 'any') {
        acc = new Set(s);
      } else {
        const inter = new Set<IntentClass>();
        for (const x of acc) if (s.has(x)) inter.add(x);
        acc = inter;
      }
    }
    return acc;
  }
  if ('any' in p) {
    const out = new Set<IntentClass>();
    for (const q of p.any) {
      const s = predicateIntents(q);
      if (s === 'any') return 'any';
      for (const x of s) out.add(x);
    }
    return out;
  }
  if ('not' in p) return 'any';
  return 'any';
}

// ---------------------------------------------------------------------------
//  Tells — the learnable cues, drawn from a FIXED tell library (stable signifiers)
// ---------------------------------------------------------------------------
export type SensoryChannel = 'sight' | 'sound' | 'smell' | 'touch' | 'taste';

export interface Tell {
  readonly id: string; // stable tell-library key (the renderer maps it to fixed prose)
  readonly channel: SensoryChannel;
  /** how strongly this tell points at the law: a "core clue" auto-acquires on examine. */
  readonly weight: number;
  /** the knowledge stage observing this tell advances the law toward. */
  readonly advancesTo: KnowledgeStage;
  /** where the tell is observable: which nodes/routes/regions surface it. */
  readonly at?: { readonly nodes?: readonly string[]; readonly routes?: readonly string[]; readonly regions?: readonly string[] };
  /** a "dead adventurer" aftermath tell demonstrates lethality without the player dying. */
  readonly deadAdventurer?: boolean;
}

// ---------------------------------------------------------------------------
//  Fail-safe — first contact warns/costs, never instakills (incl. delegated)
// ---------------------------------------------------------------------------
export interface FailSafe {
  /** first contact with the UNSURVEYED law is non-lethal; this is the warning cost. */
  readonly firstContact: { readonly condition?: string; readonly cost?: string; readonly tell: string };
  /** if the effect routes into combat/summon, the delegated threat is clamped non-fatal on first contact. */
  readonly delegatedClamp?: boolean;
}

// ---------------------------------------------------------------------------
//  Drift — periodic re-Settling: refreshes mystery, preserves dread past mastery
// ---------------------------------------------------------------------------
export interface DriftPolicy {
  /** absolute-turn cadence fallback (legacy). 0 = never. */
  readonly everyTurns: number;
  /**
   * dwell-based drift: warn this many turns AFTER the law was surveyed (so drift
   * fires relative to when mastery was achieved, not absolute clock). The codex
   * then demotes ~half that many turns after the warning. Preferred over everyTurns.
   */
  readonly driftAfter?: number;
  /** what drift mutates: the trigger window, the tell set, or the effect magnitude. */
  readonly mutates: 'window' | 'tells' | 'magnitude';
  /** the pre-demotion drift tell (acquirable >=1 beat before the codex demotes). */
  readonly predemotionTell: string;
}

// ---------------------------------------------------------------------------
//  Law effects — data-described deterministic transforms (anomaly.hush applies)
// ---------------------------------------------------------------------------
export type LawEffect =
  | { readonly kind: 'distance_mult'; readonly factor: number; readonly applies: 'behind' | 'edge' | 'all' } // topology
  | { readonly kind: 'block_route'; readonly routes: readonly string[]; readonly unless?: Predicate } // topology
  | { readonly kind: 'degrade_item_class'; readonly itemClass: string; readonly toCondition: string } // material
  | { readonly kind: 'repeat_window'; readonly window: string } // causality
  | { readonly kind: 'amplify_sound'; readonly radius: number } // perception
  | { readonly kind: 'reveal_tell'; readonly tell: string } // perception
  | { readonly kind: 'impose_condition'; readonly condition: string; readonly severity?: 'reversible' | 'irreversible' } // agency
  | { readonly kind: 'summon'; readonly entity: string; readonly via: 'utterance' | 'metal' | 'lookback'; readonly radius?: number }; // summon

export interface LawDefinition {
  readonly id: string;
  readonly title: string;
  readonly scope: { readonly region?: string; readonly routes?: readonly string[]; readonly nodes?: readonly string[] };
  readonly ambientGate?: Predicate; // WHEN in force (time window, etc.); category-free
  readonly effectCategory: EffectCategory; // EXACTLY one (validator-enforced)
  readonly secondaryCategories?: readonly EffectCategory[]; // <= 2
  readonly trigger: Predicate; // over generic physical intents + facts; category-free
  readonly effect: LawEffect;
  readonly tells: readonly Tell[];
  readonly discovery: { readonly surveyVia: readonly string[]; readonly minTellsToSurvey: number };
  readonly failSafe: FailSafe;
  readonly interactions: readonly string[]; // declared cross-law composition edges
  readonly drift?: DriftPolicy;
  readonly combatConsequence?: boolean;
  readonly lore?: string;
}

// ---------------------------------------------------------------------------
//  The category × category interaction matrix (K6) — MUST be total
// ---------------------------------------------------------------------------
export type Composition = 'independent' | 'multiply' | 'sequence' | 'couple';

/**
 * How two effect-categories compose when they bear on one scene. Total over all
 * 6×6 pairs (the coherence pass asserts totality). `couple` means one effect
 * changes a parameter the other reads (e.g. topology distance feeds the summon's
 * exposure window — the Mile Road × Antenna Field showcase coupling).
 */
export const CATEGORY_MATRIX: Record<EffectCategory, Record<EffectCategory, Composition>> = {
  causality: { causality: 'sequence', topology: 'couple', material: 'independent', perception: 'independent', agency: 'independent', summon: 'couple' },
  topology: { causality: 'couple', topology: 'multiply', material: 'independent', perception: 'couple', agency: 'independent', summon: 'couple' },
  material: { causality: 'independent', topology: 'independent', material: 'sequence', perception: 'independent', agency: 'couple', summon: 'independent' },
  perception: { causality: 'independent', topology: 'couple', material: 'independent', perception: 'sequence', agency: 'independent', summon: 'couple' },
  agency: { causality: 'independent', topology: 'independent', material: 'couple', perception: 'independent', agency: 'sequence', summon: 'independent' },
  summon: { causality: 'couple', topology: 'couple', material: 'independent', perception: 'couple', agency: 'independent', summon: 'sequence' },
};

/** Assert the matrix is total (every ordered pair defined). Used by the coherence pass. */
export function matrixIsTotal(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const a of EFFECT_CATEGORIES) for (const b of EFFECT_CATEGORIES) {
    if (CATEGORY_MATRIX[a]?.[b] === undefined) missing.push(`${a}x${b}`);
  }
  return { ok: missing.length === 0, missing };
}

/** Canonical fold order for a set of laws bearing on a scene (K6 deterministic). */
export function foldOrder(laws: readonly LawDefinition[]): LawDefinition[] {
  return [...laws].sort((a, b) => CATEGORY_RANK[a.effectCategory] - CATEGORY_RANK[b.effectCategory] || a.id.localeCompare(b.id));
}
