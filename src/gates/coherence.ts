/**
 * The coherence pass — a global, post-isolation CHECK over a sealed world pack
 * (not an oracle: a decidable subset is proven; it informs, it does not certify
 * "fun"). It proves the cross-node fairness properties an isolated author can't:
 *
 *  - every lethal/summoning law is learnable-to-surveyed via NON-LETHAL
 *    observation before it can kill (fail-safe + reachable tells), and carries
 *    the delegated-lethality clamp;
 *  - every Law-Drift law emits a pre-demotion drift tell;
 *  - the category×category interaction matrix is TOTAL (K6);
 *  - there is >=1 authored cross-law coupling among the demo laws (emergence,
 *    not a 3-way branch);
 *  - law scopes + tells reference things that actually exist.
 */
import { CATEGORY_MATRIX, matrixIsTotal, EFFECT_CATEGORIES, type LawDefinition } from '../sdk/law.js';
import type { WorldPack } from '../sdk/worldpack.js';

export interface CoherenceReport {
  readonly ok: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly checks: { name: string; ok: boolean; detail?: string }[];
}

export function coherencePass(pack: WorldPack): CoherenceReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: CoherenceReport['checks'] = [];
  const nodeIds = new Set(pack.nodes.map((n) => n.id));
  const tellIds = new Set(pack.tellLibrary.map((t) => t.id));
  const lawIds = new Set(pack.laws.map((l) => l.id));

  const record = (name: string, ok: boolean, detail?: string) => {
    checks.push({ name, ok, ...(detail ? { detail } : {}) });
    if (!ok && detail) errors.push(`${name}: ${detail}`);
  };

  // ---- K6: the interaction matrix is total --------------------------------
  const tot = matrixIsTotal();
  record('matrix_total', tot.ok, tot.ok ? undefined : `missing pairs: ${tot.missing.join(', ')}`);

  // ---- per-law fairness ---------------------------------------------------
  for (const law of pack.laws) {
    const tag = `law[${law.id}]`;

    // exactly one effect-category, <=2 secondary
    record(`${tag}.one_effect_category`, EFFECT_CATEGORIES.includes(law.effectCategory), `unknown effect category ${law.effectCategory}`);
    if ((law.secondaryCategories?.length ?? 0) > 2) errors.push(`${tag}: more than 2 secondary categories`);

    // scope nodes exist
    const badNodes = (law.scope.nodes ?? []).filter((n) => !nodeIds.has(n));
    record(`${tag}.scope_nodes_exist`, badNodes.length === 0, badNodes.length ? `unknown scope nodes: ${badNodes.join(', ')}` : undefined);

    // tells reference real library entries
    const badTells = law.tells.filter((t) => !tellIds.has(t.id)).map((t) => t.id);
    record(`${tag}.tells_exist`, badTells.length === 0, badTells.length ? `unknown tells: ${badTells.join(', ')}` : undefined);

    // tells reachable via non-lethal observation (every tell has an `at` location or is on a scope node)
    const reachableTells = law.tells.filter((t) => (t.at?.nodes?.length ?? 0) > 0 || (t.at?.regions?.length ?? 0) > 0 || (law.scope.nodes?.length ?? 0) > 0);
    record(`${tag}.tells_reachable`, reachableTells.length >= law.discovery.minTellsToSurvey, `only ${reachableTells.length} reachable tells but ${law.discovery.minTellsToSurvey} needed to survey`);

    // fail-safe first contact present (non-lethal warning before it can hurt)
    record(`${tag}.failsafe_first_contact`, !!law.failSafe?.firstContact?.tell, 'missing fail-safe first-contact tell');

    // delegated-lethality clamp for laws that route into combat/summon
    const lethalDelegate = law.combatConsequence || law.effect.kind === 'summon';
    if (lethalDelegate) {
      record(`${tag}.delegated_clamp`, law.failSafe?.delegatedClamp === true, 'law routes into combat/summon but lacks the delegated-lethality clamp');
    }

    // drift laws emit a pre-demotion tell that exists
    if (law.drift) {
      record(`${tag}.predemotion_tell`, tellIds.has(law.drift.predemotionTell), `pre-demotion drift tell "${law.drift.predemotionTell}" not in the tell library`);
    }

    // declared interactions point at real laws
    const badEdges = law.interactions.filter((id) => !lawIds.has(id));
    record(`${tag}.interactions_exist`, badEdges.length === 0, badEdges.length ? `interactions reference unknown laws: ${badEdges.join(', ')}` : undefined);
  }

  // ---- >=1 authored cross-law coupling among the demo laws ----------------
  let coupling: string | undefined;
  for (const a of pack.laws)
    for (const b of pack.laws) {
      if (a.id >= b.id) continue;
      const comp = CATEGORY_MATRIX[a.effectCategory]?.[b.effectCategory];
      if (comp === 'couple' && (a.interactions.includes(b.id) || b.interactions.includes(a.id))) {
        coupling = `${a.id}(${a.effectCategory}) x ${b.id}(${b.effectCategory})`;
      }
    }
  record('cross_law_coupling', !!coupling, coupling ? undefined : 'no authored cross-law coupling among laws (would be a branch, not emergence)');
  if (coupling) checks.find((c) => c.name === 'cross_law_coupling')!.detail = coupling;

  // ---- light: contradictory rumors (warn only) ----------------------------
  for (const r of pack.rumors) {
    if (r.truth === 'false' && !pack.rumors.some((o) => o.topic === r.topic && o.truth === 'true')) {
      warnings.push(`rumor[${r.id}]: a false rumor about "${r.topic}" with no true counterpart — a player may have no way to disconfirm it`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, checks };
}

export function isLethal(law: LawDefinition): boolean {
  return law.combatConsequence === true || law.effect.kind === 'summon';
}
