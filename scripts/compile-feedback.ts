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
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
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
    .map((d) => resolve(base, d))
    .sort();
  if (!runs.length) throw new Error('no swarm runs found under playtest-runs/swarm');
  return runs[runs.length - 1]!;
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
  gathered.push({ id: pl.id, persona: pl.persona, model: pl.model, outcome: pl.finalStatus, turns: pl.turns, real: pl.real, interview: interview.slice(0, 3500) });
}

if (!gathered.length) {
  console.error('no usable interviews in', RUN);
  process.exit(1);
}

const N = gathered.length;
const corpus = gathered
  .map((g) => `--- PLAYER ${g.id} · persona=${g.persona} · model=${g.model} · outcome=${g.outcome} · turns=${g.turns} · realness=${g.real ? 'VERIFIED' : 'FAILED'} ---\n${g.interview}`)
  .join('\n\n');

const prompt = `You are compiling BLIND play-test feedback for a deterministic, prose-first text adventure called THE HUSH (demo area: "The Cordon's Edge"). ${N} cynical, high-expectations players each played the game BLIND — they could see ONLY what the game showed them, never its code or content — and wrote an exit interview. Synthesize their feedback into a ranked, actionable report. Be rigorous about FREQUENCY (how many independent players/personas raised each point) and SOURCE.

CRITICAL — separate GAME issues from TEST-HARNESS ARTIFACTS. The harness routes play through two tools (observe/act) and imposes a runaway turn cap. Any complaint about "a hidden turn limit", "running out of turns", "the tools", or being forced to stop is a HARNESS/METHODOLOGY artifact, NOT a game flaw — put those under "Harness / methodology notes", and do NOT rank them as game fixes.

Output GitHub-flavored markdown, exactly these sections:

## Executive summary
3-5 sentences: is the demo actually good, what is the through-line of the critique, what is the single most important real game improvement.

## Top game fixes (ranked by leverage)
Ranked list. For each: **title** — raised by X/${N} players (name the personas) · severity (P0/P1/P2) · the issue in the players' own words (a short direct quote) · a concrete, surgical fix. Only rank GAME issues. Require >=2 INDEPENDENT personas to mark something "high confidence"; mark single-voice items "low confidence (one player)". Do not invent consensus.

## What's working (do not regress)
What multiple players genuinely praised (quote them). Be honest — only list things actually praised by name.

## Harness / methodology notes
Artifacts that contaminated the signal (the turn cap, tool friction, anything that made players critique the rig instead of the game), and how to de-noise the next swarm.

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
