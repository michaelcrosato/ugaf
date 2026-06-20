/**
 * Jurisdiction router — the kernel's core decision: which single module owns an
 * intent. Compatibility is a routing decision, not a merge:
 *   0 claimants                  -> REJECT "no authority" (fail loud)
 *   1 claimant                   -> that owner
 *   >1 with a unique top priority -> highest-priority owner (orthogonal/sequential)
 *   >1 tied at the top priority   -> REJECT "ambiguous/exclusive authority"
 *
 * True exclusive collisions are prevented at BOOT (the collision audit below
 * quantifies over the finite author-declared arming set, K5/K10); the runtime
 * ambiguous-reject is a dead backstop.
 */
import { makeFactView, type FactRecord } from '../sdk/facts.js';
import { INTENT_CLASSES, type ParsedIntent } from '../sdk/intents.js';
import type { ModuleId } from '../sdk/types.js';
import type { ModuleRegistry } from './registry.js';

export type RouteOutcome =
  | { readonly kind: 'owner'; readonly owner: ModuleId; readonly candidates: ModuleId[] }
  | { readonly kind: 'no_authority'; readonly intent: string }
  | { readonly kind: 'ambiguous'; readonly intent: string; readonly tied: ModuleId[] };

export function route(
  intent: ParsedIntent,
  facts: FactRecord,
  registry: ModuleRegistry,
  armed: ReadonlySet<string>,
): RouteOutcome {
  const view = makeFactView(facts);
  const claimants = registry.all().filter((m) => m.claims(intent, view, armed));
  if (claimants.length === 0) return { kind: 'no_authority', intent: intent.class };

  const maxPriority = Math.max(...claimants.map((m) => m.manifest.priority));
  const top = claimants.filter((m) => m.manifest.priority === maxPriority);
  if (top.length > 1) {
    return { kind: 'ambiguous', intent: intent.class, tied: top.map((m) => m.manifest.id) };
  }
  return { kind: 'owner', owner: top[0]!.manifest.id, candidates: claimants.map((m) => m.manifest.id) };
}

/** One arming scenario from the campaign charter (a reachable node + its armed set). */
export interface ArmingScenario {
  readonly label: string; // node/route id or scene label
  readonly armed: ReadonlySet<string>; // which specialist conditions are live here
  readonly sampleFacts: FactRecord; // representative facts at that scene
}

export interface CollisionAuditResult {
  readonly ok: boolean;
  readonly collisions: {
    readonly scenario: string;
    readonly intent: string;
    readonly tied: ModuleId[];
  }[];
}

/**
 * Boot-time collision audit (K5). For every (arming scenario × intent class),
 * verify no two specialists tie at the top priority — i.e. no reachable
 * exclusive collision exists. Tractable because it quantifies over the FINITE
 * author-declared arming set, not the law-mutated state space.
 */
export function bootCollisionAudit(
  registry: ModuleRegistry,
  scenarios: readonly ArmingScenario[],
): CollisionAuditResult {
  const collisions: CollisionAuditResult['collisions'] = [];
  for (const scenario of scenarios) {
    const view = makeFactView(scenario.sampleFacts);
    for (const cls of INTENT_CLASSES) {
      const probe: ParsedIntent = { class: cls, tags: [], confidence: 1, raw: `<audit:${cls}>` };
      const claimants = registry.all().filter((m) => m.claims(probe, view, scenario.armed));
      if (claimants.length < 2) continue;
      const maxPriority = Math.max(...claimants.map((m) => m.manifest.priority));
      const top = claimants.filter((m) => m.manifest.priority === maxPriority);
      if (top.length > 1) {
        collisions.push({ scenario: scenario.label, intent: cls, tied: top.map((m) => m.manifest.id) });
      }
    }
  }
  return { ok: collisions.length === 0, collisions };
}
