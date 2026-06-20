/**
 * Generate status FROM the filesystem (process guardrail #4: humans never
 * hand-maintain counts). Emits:
 *   - CREDITS.md — the per-module licensing manifest (exact notice + license +
 *     attribution + indication-of-changes, as required by CC-BY-4.0 / ORC, and
 *     the K11 licensed-source vs clean-room split).
 *   - a coverage table to stdout (modules, laws, tells, nodes, npcs, tests).
 *
 * Run: `npm run coverage-report`
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises';
import { createGame } from '../src/game/assemble.js';
import { HUSH_PACK } from '../content/hush/index.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const game = createGame(HUSH_PACK, 'coverage');

// ---- CREDITS.md (the licensing manifest) ----------------------------------
const tierLabel = { green: '🟢 ship faithfully', yellow: '🟡 open mechanic (caveat)', red: '🔴 clean-room only' } as const;
const lines: string[] = [
  '# CREDITS & LICENSES',
  '',
  '> Generated from the module manifests by `npm run coverage-report` — do not hand-edit.',
  '> Each intact module names its source, license, tier, provenance (K11: licensed-source fidelity vs',
  '> clean-room conformance), and — where the licence requires it (CC-BY-4.0 / ORC) — an indication of changes.',
  '',
  '## Modules',
  '',
  '| Module | Source | License | Tier | Provenance | Indication of changes |',
  '|---|---|---|---|---|---|',
];
for (const m of game.registry.all()) {
  const l = m.manifest.license;
  lines.push(
    `| \`${m.manifest.id}\` | ${m.manifest.source} | ${l.identifier} | ${tierLabel[l.tier]} | ${l.provenance} | ${l.indicationOfChanges ?? '—'} |`,
  );
}
lines.push(
  '',
  '## World content',
  '',
  `- **${HUSH_PACK.meta.title}** (\`${HUSH_PACK.meta.id}\` v${HUSH_PACK.meta.version}) — original world (The Hush), licence tier ${tierLabel[HUSH_PACK.meta.licenseTier]}.`,
  '',
  '## Attribution notices',
  '',
  ...game.registry
    .all()
    .filter((m) => m.manifest.license.tier !== 'red' && m.manifest.license.identifier !== 'NONE')
    .map((m) => `- **${m.manifest.id}** — ${m.manifest.license.attribution}. Licensed under ${m.manifest.license.identifier}.`),
  '',
  '_Clean-room modules reimplement only the uncopyrightable mechanic (17 U.S.C. §102(b)) in our own words;',
  'they contain no copied text, custom dice, or brand, and are never run against a source-fidelity fixture (K11)._',
);
writeFileSync(resolve(ROOT, 'CREDITS.md'), lines.join('\n') + '\n');

// ---- coverage table -------------------------------------------------------
async function countTests(): Promise<number> {
  let n = 0;
  for await (const f of glob('test/**/*.ts', { cwd: ROOT })) {
    n += (readFileSync(resolve(ROOT, f), 'utf8').match(/\b(it|test)\s*\(/g) ?? []).length;
  }
  return n;
}

const tests = await countTests();
const byTier = game.registry.all().reduce<Record<string, number>>((a, m) => ((a[m.manifest.license.tier] = (a[m.manifest.license.tier] ?? 0) + 1), a), {});
console.log('▸ LOOM coverage (generated from the filesystem)\n');
console.log(`  modules:   ${game.registry.all().length}  (${Object.entries(byTier).map(([t, c]) => `${c} ${t}`).join(', ')})`);
console.log(`  laws:      ${HUSH_PACK.laws.length}  (effect-categories: ${[...new Set(HUSH_PACK.laws.map((l) => l.effectCategory))].join(', ')})`);
console.log(`  tells:     ${HUSH_PACK.tellLibrary.length}`);
console.log(`  nodes:     ${HUSH_PACK.nodes.length}   edges: ${HUSH_PACK.edges.length}   regions: ${HUSH_PACK.regions.length}`);
console.log(`  npcs:      ${HUSH_PACK.npcs.length}   factions: ${HUSH_PACK.factions.length}   rumors: ${HUSH_PACK.rumors.length}`);
console.log(`  goals:     ${HUSH_PACK.goals?.length ?? 0}  (branching endings)`);
console.log(`  tests:     ${tests}`);
console.log(existsSync(resolve(ROOT, 'CREDITS.md')) ? '\n✓ CREDITS.md regenerated' : '');
