/**
 * Generate playtest transcripts across player personas, write them to
 * playtest-runs/, and print a summary. Loop B reads these (and so do critic
 * agents) to find what is confusing, unfair, or boring — and to prove each
 * session was really played (the realness oracle runs on every one).
 *
 * Run: `npm run playtest` or `tsx scripts/playtest.ts`
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUSH_PACK } from '../content/hush/index.js';
import { playScript, renderTranscript } from '../src/proctor/playtest.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = resolve(ROOT, 'playtest-runs');

interface Persona {
  id: string;
  blurb: string;
  seed: string;
  commands: string[];
}

const PERSONAS: Persona[] = [
  {
    id: 'curious-methodical',
    blurb: 'examines everything, learns the laws before using them, takes the daylight path',
    seed: 'pt-curious',
    commands: ['look', 'examine the notices', 'out', 'talk to holt', 'ask holt about the greywater', 'ask holt about the mile road', 'road', 'talk to lyle', 'ask lyle about the core', 'road', 'examine the milepost', 'on', 'examine the walker', 'deduce the mile road', 'fork', 'water', 'examine the rust', 'listen', 'deduce the greywater', 'in', 'cache', 'take core', 'out', 'back', 'back', 'mile', 'back', 'back', 'gate', 'hide', 'back'],
  },
  {
    id: 'reckless',
    blurb: 'rushes in, looks back, shouts at the antennas, carries iron in at night — tests every fail-safe',
    seed: 'pt-reckless',
    commands: ['out', 'road', 'road', 'on', 'look back', 'antennas', 'say maren', 'say maren', 'mile', 'fork', 'water', 'rest', 'rest', 'in', 'cache', 'take core'],
  },
  {
    id: 'social-buyer',
    blurb: 'buys knowledge instead of earning it — Survey law-map, Strider route',
    seed: 'pt-social',
    commands: ['out', 'road', 'survey', 'talk to eun', 'ask eun about the greywater', 'bribe eun', 'out', 'salvage', 'talk to mox', 'ask mox about the core', 'bribe mox', 'out', 'road', 'on', 'fork', 'water', 'in', 'cache', 'take core', 'out', 'back', 'back', 'mile', 'back', 'back', 'gate', 'back'],
  },
  {
    id: 'wanderer',
    blurb: 'stress-tests the parser and the map with odd, vague, and mistaken inputs',
    seed: 'pt-wander',
    commands: ['xyzzy', 'go nowhere', 'examine', 'take the moon', 'north', 'out', 'go to the holdout', 'look at the warden', 'inventory', 'drop the lantern', 'take the lantern', 'road', 'use the pump', 'climb the fire', 'codex', 'road', 'sniff', 'on', 'go back', 'look'],
  },
  {
    id: 'antenna-careful',
    blurb: 'tests the Antenna escape window — speaks a name, reads the warning, and gets clear',
    seed: 'pt-antenna',
    commands: ['out', 'road', 'road', 'on', 'antennas', 'examine the names', 'listen', 'say maren', 'mile', 'codex'],
  },
  {
    id: 'dawdler',
    blurb: 'lingers in the deep after dark on a seed where the Hollow Dark IS live (the variance showcase)',
    seed: 'seed-0',
    commands: ['out', 'road', 'road', 'on', 'fork', 'listen', 'examine the sitter', 'rest', 'rest', 'deduce the hollow dark', 'codex'],
  },
];

mkdirSync(OUT, { recursive: true });
console.log('▸ playtest swarm over The Hush\n');
const summary: string[] = [];
for (const p of PERSONAS) {
  const res = playScript(HUSH_PACK, p.seed, p.commands);
  const text = `<!-- persona: ${p.id} — ${p.blurb} -->\n` + renderTranscript(res);
  writeFileSync(resolve(OUT, `${p.id}.md`), text);
  const rejects = res.turns.filter((t) => !t.ok).length;
  const line = `  ${p.id.padEnd(18)} final=${res.finalStatus.padEnd(6)} turns=${String(res.turns.length).padStart(2)} rejects=${rejects} realness=${res.verdict.real ? 'VERIFIED' : 'FAILED'}`;
  console.log(line);
  summary.push(line);
}
writeFileSync(resolve(OUT, 'SUMMARY.txt'), summary.join('\n') + '\n');
console.log(`\n✓ ${PERSONAS.length} transcripts written to playtest-runs/`);
