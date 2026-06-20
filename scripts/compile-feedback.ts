/**
 * Compile a blind-swarm run into a ranked, actionable feedback report. Reads the
 * N exit interviews + their realness-verified outcomes and asks an opus synth pass
 * to cluster complaints by FREQUENCY and SOURCE — and, critically, to separate real
 * GAME issues from TEST-HARNESS artifacts (an imposed turn cap, tool friction) so we
 * never "fix the game" to satisfy a complaint about the rig.
 *
 *   npx tsx scripts/compile-feedback.ts [--run <dir>] [--model opus]
 *
 * Writes <run>/compiled-feedback.md and prints it.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

function latestRun(): string {
  const base = resolve(ROOT, 'playtest-runs/swarm');
  const runs = readdirSync(base)
    .filter((d) => existsSync(resolve(base, d, 'index.json')))
    .map((d) => ({ dir: resolve(base, d), mtime: statSync(resolve(base, d, 'index.json')).mtimeMs }))
    .sort((a, b) => a.mtime - b.mtime); // newest by wall-clock, not by name (a timestamp dir sorts after "night1")
  if (!runs.length) throw new Error('no swarm runs found under playtest-runs/swarm');
  return runs[runs.length - 1]!.dir;
}

const RUN = arg('run') ? resolve(arg('run')!) : latestRun();
const MODEL = arg('model', 'opus')!;
const index = JSON.parse(readFileSync(resolve(RUN, 'index.json'), 'utf8'));

interface Gathered {
  id: string;
  persona: string;
  model: string;
  outcome: string;
  turns: number;
  real: boolean;
  interview: string;
}
const gathered: Gathered[] = [];
for (const pl of index.players as { id: string; persona: string; model: string; finalStatus: string; turns: number; real: boolean }[]) {
  const ipath = resolve(RUN, 'players', `${pl.id}.interview.json`);
  if (!existsSync(ipath)) continue;
  let interview = '';
  try {
    const j = JSON.parse(readFileSync(ipath, 'utf8'));
    interview = typeof j.result === 'string' ? j.result : '';
  } catch {
    continue;
  }
  if (!interview.trim()) continue;
  gathered.push({ id: pl.id, persona: pl.persona, model: pl.model, outcome: pl.finalStatus, turns: pl.turns, real: pl.real, interview });
}

if (!gathered.length) {
  console.error('no usable interviews in', RUN);
  process.exit(1);
}

const N = gathered.length;
// adaptive per-interview cap: keep the whole corpus ~280k chars (~70k tokens) so late
// sections (prose/replayability) aren't truncated for small/medium N, bounded for large N.
const PER_CAP = Math.max(2500, Math.min(7000, Math.floor(280000 / N)));
const corpus = gathered
  .map((g) => `--- PLAYER ${g.id} · persona=${g.persona} · model=${g.model} · outcome=${g.outcome} · turns=${g.turns} · realness=${g.real ? 'VERIFIED' : 'FAILED'} ---\n${g.interview.slice(0, PER_CAP)}`)
  .join('\n\n');

const prompt = `You are compiling BLIND play-test feedback for THE HUSH (demo: "The Cordon's Edge"). ${N} cynical, high-expectations players played BLIND (saw only what the game showed them, never code/content) and wrote exit interviews. Synthesize a ranked, actionable report, applying the MASTER-BLUEPRINT §4.3/§4.5 synthesis discipline below. The persona AND model tier are shown for each player so you can apply the capability filter.

QUARANTINE FIRST (before any ranking):
- TEST-HARNESS ARTIFACTS: complaints about a hidden turn limit / running out of turns / the observe-act tools / being forced to stop are RIG artifacts, NOT game flaws — list under "Harness / methodology notes", never rank as game fixes.
- PARSE-CONFOUND: friction that is really "I couldn't phrase the command" / the parser misunderstanding — quarantine under "Parser-confound (verify, don't rank as content)". A flaky parser otherwise masquerades as content signal (§4.5).

RANK BY CROSS-PERSONA BREADTH, NOT RAW COUNT: the swarm is personas × clones and persona↔model is largely fixed, so six clones of one persona inflate a raw N. Count ONE vote per PERSONA for consensus; raw N is intensity only. Require >=2 INDEPENDENT PERSONAS for "high confidence".

CAPABILITY-DIFFERENTIAL FILTER (§4.3): a friction is real CONTENT signal only if it appears ACROSS THE MODEL-SIZE AXIS (both small/haiku AND large/opus players hit it). If a complaint correlates with model size/family (only the weak models stall), tag it "capability noise" and EXCLUDE from game fixes — EXCEPT learnability stalls: a genuinely hard-to-deduce law legitimately stalls weak players, so do NOT discard those as capability noise. Treat blanket cross-model agreement skeptically (shared pretraining bias inflates apparent consensus); down-weight a theme where all models agree but it smells like model bias rather than the game.

ENGAGEMENT IS NEVER A MAXIMAND (Goodhart): raw dwell/stalls/revisits are NEGATIVE friction unless paired with explicit satisfaction. Never recommend chasing an engagement metric.

Output GitHub-flavored markdown, EXACTLY these sections:

## Executive summary
3-5 sentences: is the demo actually good, the through-line of the critique, the single most important real game improvement.

## Top game fixes (ranked by cross-persona breadth)
For each: **title** — raised by N PERSONAS (name them) across which model tiers · severity (P0/P1/P2) · confidence (>=2 personas across tiers = high; single-persona = low) · the issue in the players' own words (a short direct quote) · a concrete, surgical fix tied to an acceptance criterion or a specific bug. Only GAME issues that survive the filters above.

## What's working (do not regress)
Only things genuinely praised by name (quote them).

## Parser-confound (verify, do not rank as content)
Friction that may be phrasing/parser rather than content — to verify, not to act on blindly.

## Harness / methodology notes
Rig artifacts + how to de-noise the next swarm (e.g. vary persona↔model pairing so a model artifact can't masquerade as a persona signal).

Here are the ${N} interviews:

${corpus}`;

console.log(`▸ compiling ${N} interviews from ${RUN} via ${MODEL} …`);
const useShell = process.platform === 'win32';
const args = ['-p', '--model', MODEL, '--output-format', 'json', '--dangerously-skip-permissions'];
const res = spawnSync(useShell ? ['claude', ...args].join(' ') : 'claude', useShell ? [] : args, {
  shell: useShell,
  input: prompt,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: process.env,
});
let report = '';
try {
  report = JSON.parse(res.stdout).result ?? '';
} catch {
  report = res.stdout;
}
if (!report.trim()) {
  console.error('compile failed; stderr tail:', (res.stderr || '').slice(-1500));
  process.exit(1);
}
const header = `# Compiled blind-swarm feedback — ${index.runId}\n\n> ${N} blind cynical players · ${index.summary?.realnessVerified ?? '?'} realness-verified · won=${index.summary?.won} lost=${index.summary?.lost} active=${index.summary?.active}\n> Compiled ${new Date().toISOString()} via ${MODEL}.\n\n`;
const outPath = resolve(RUN, 'compiled-feedback.md');
writeFileSync(outPath, header + report);
console.log(`\n${header}${report}\n`);
console.log(`✓ written: ${outPath}`);
