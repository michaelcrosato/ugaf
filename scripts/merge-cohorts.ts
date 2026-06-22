/**
 * Merge N blind-swarm run dirs into ONE combined run the compiler can synthesize as a single
 * corpus — so the §4.3 capability-differential filter sees the whole size axis (e.g. a
 * persona-default cohort + an all-opus cohort) at once. Player ids collide across cohorts (both
 * are index-based: p000-…), so each is prefixed by a short cohort tag to keep them unique.
 *
 *   npx tsx scripts/merge-cohorts.ts --out swarm-n9-combined a=swarm-n9-a b=swarm-n9-b
 *
 * Writes playtest-runs/swarm/<out>/{index.json, players/<tag>-<id>.{interview,snapshot}.json}.
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SWARM = resolve(ROOT, 'playtest-runs/swarm');

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const outName = arg('out', 'combined')!;
const specs = process.argv.slice(2).filter((a) => a.includes('=') && !a.startsWith('--'));
if (!specs.length) {
  console.error('usage: merge-cohorts.ts --out <name> <tag>=<runDir> [<tag>=<runDir> ...]');
  process.exit(1);
}

const OUT = resolve(SWARM, outName);
mkdirSync(resolve(OUT, 'players'), { recursive: true });

const mergedPlayers: Record<string, unknown>[] = [];
const summary = { ok: 0, realnessVerified: 0, won: 0, lost: 0, active: 0 };

for (const spec of specs) {
  const [tag, dir] = spec.split('=');
  // accept EITHER a bare cohort name (`a=cohort-x`) OR a full path (`a=playtest-runs/swarm/cohort-x`) —
  // strip a leading playtest-runs/swarm/ so the two forms can't silently double-prefix into ENOENT.
  const name = dir!.replace(/^.*playtest-runs[/\\]swarm[/\\]/, '');
  const runDir = resolve(SWARM, name);
  const idx = JSON.parse(readFileSync(resolve(runDir, 'index.json'), 'utf8'));
  for (const pl of idx.players as Record<string, unknown>[]) {
    const oldId = pl.id as string;
    const newId = `${tag}-${oldId}`;
    for (const ext of ['interview.json', 'snapshot.json']) {
      const src = resolve(runDir, 'players', `${oldId}.${ext}`);
      if (existsSync(src)) copyFileSync(src, resolve(OUT, 'players', `${newId}.${ext}`));
    }
    mergedPlayers.push({ ...pl, id: newId, cohort: tag });
    if (pl.real) summary.realnessVerified++;
    if (pl.finalStatus === 'won') summary.won++;
    else if (pl.finalStatus === 'lost') summary.lost++;
    else summary.active++;
    if (existsSync(resolve(OUT, 'players', `${newId}.interview.json`))) summary.ok++;
  }
}

const combined = {
  runId: outName,
  mergedFrom: specs,
  n: mergedPlayers.length,
  players: mergedPlayers,
  summary,
};
writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(combined, null, 2));
console.log(
  `✓ merged ${mergedPlayers.length} players into ${OUT}\n  ${summary.ok} interviews · ${summary.realnessVerified} realness-verified · won=${summary.won} lost=${summary.lost} active=${summary.active}`,
);
