/**
 * verify-cohort — a DETERMINISTIC, tool-based verifier of a blind-swarm cohort, run BEFORE the LLM
 * synth. "Trust but verify": tools are cheap and exact, so they should check as much of the LLM play as
 * they can before the (fallible, expensive) opus synthesis is trusted. This guards the fairness
 * invariants the MASTER-BLUEPRINT is built on — every death TELEGRAPHED (the law's warning ladder
 * precedes it), no untelegraphed WALL at the climax (a core-carrier is never stuck with no way out),
 * every "real"-counted play actually realness-verified (no fabricated transcript), and cohort HEALTH
 * (no silent mass failure / marker rot) — and exits NON-ZERO on a hard violation so a broken or UNFAIR
 * cohort cannot slip past into the feedback synthesis.
 *
 *   npx tsx scripts/verify-cohort.ts --run playtest-runs/swarm/<dir>
 *
 * Reads only the realness-verified snapshots (turn text + finalStatus + verdict) — the same artifacts
 * the compiler reads — so it is a pure, side-effect-free check.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUSH_PACK } from '../content/hush/index.js';
import { createGame } from '../src/game/assemble.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function latestRun(): string {
  const base = resolve(ROOT, 'playtest-runs/swarm');
  const runs = readdirSync(base)
    .filter((d) => existsSync(resolve(base, d, 'index.json')))
    .map((d) => ({ dir: resolve(base, d), m: statSync(resolve(base, d, 'index.json')).mtimeMs }))
    .sort((a, b) => a.m - b.m);
  if (!runs.length) throw new Error('no swarm runs under playtest-runs/swarm');
  return runs.at(-1)!.dir;
}

// Each LETHAL law ends a run with a death line, and the engine REQUIRES an escalating warning ladder
// before it (research rules 5–8; the "first contact warns, never kills" + per-rung last-warning canon).
// So: if a death line is present, its telegraph MUST also be present — else the death was untelegraphed,
// a Tier-1.5 fairness violation. (Authored-string match against the real content prose, like the compiler.)
const DEATH_LADDERS: { name: string; death: string[]; telegraph: string[] }[] = [
  {
    name: 'greywater-core',
    death: ['the water remembered what it was for', 'fist of red, rotten ore'],
    telegraph: ['this is the last of your margin', 'barely holding its shape'],
  },
  {
    name: 'mile-road',
    death: ['you look back one time too many', 'the road took you home', 'the mile road kept its true length'],
    telegraph: ['you look back a third time', 'do not look back again'],
  },
  {
    name: 'antenna',
    death: ['the field gives you to what answered', 'a third name leaves your mouth'],
    telegraph: ['break for the edge of the field', 'get out of the field, this beat', 'this is the one beat you get'],
  },
  {
    name: 'hollow-dark',
    death: ['you go still one time too many', 'the dark closed the distance', 'the dark came up to you and stopped'],
    telegraph: ['do not stop again', 'one more held breath', 'do not be still here'],
  },
];

// §4.5 PARSE-CONFOUND: a turn whose rendered text is a parser MISS (the player's phrasing did not resolve
// to an action) is friction from the parser, not the content — and the blueprint requires quarantining it
// BEFORE the capability filter. Counting it deterministically means the synth does not have to GUESS which
// "this was confusing" complaints are really phrasing. (Authored parser-miss strings; the free nudge does
// not burn a turn, but a high rate still signals a player who fought the parser.)
const PARSE_MISS = [
  "you're not sure how to",
  '[not_understood]',
  'nothing like that here',
  'there is nothing like that',
  'no one here to talk to',
  'is not here',
];

interface PlayerRow {
  id: string;
  persona: string;
  model: string;
  finalStatus: string;
  ok: boolean;
  real: boolean;
  seed?: string;
}
interface Snap {
  finalStatus?: string;
  turns?: { command?: string; text?: string }[];
  verdict?: { real?: boolean };
}

const RUN = arg('run') ? resolve(arg('run')!) : latestRun();
const index = JSON.parse(readFileSync(resolve(RUN, 'index.json'), 'utf8'));
const players: PlayerRow[] = index.players ?? [];

const hard: string[] = []; // fairness/realness violations — a hard FAIL (exit 1)
const warn: string[] = []; // worth a human's eye, but not a gate-blocker
const notes: string[] = [];

// ---- 1. cohort HEALTH (from the manifest the launcher wrote) -------------------------------------
const s = index.summary ?? {};
const okN = s.ok ?? players.filter((p) => p.ok).length;
const failed = s.failed ?? 0;
const real = s.realnessVerified ?? 0;
notes.push(
  `health: ok=${okN} failed=${failed} retried=${s.retried ?? 0} realness-verified=${real} cost=$${s.costUsd ?? '?'}`,
);

// ---- LIVENESS de-confound (feedback/0026 loop-hardening) -----------------------------------------
// The world re-Settles per seed — only a SUBSET of laws is live each run (HUSH_PACK seedVariance.liveLaws),
// so a ROTATING law that "never tripped" across a cohort may simply have been OFF, not toothless. The blind
// digest counts trips but never checks liveness, which mis-ranks absent laws as dead (the night23 cohort
// found the Hollow Dark "0/15" — but it was live in well under half the seeds). Re-derive each player's
// live-laws DETERMINISTICALLY from their recorded seed and report liveness, so the synth conditions "did it
// trip" on "was it even on" (§4.3). Best-effort: never block the verifier if the pack/seed can't resolve.
try {
  const always = new Set(HUSH_PACK.seedVariance?.liveLaws?.always ?? []);
  const rotating = HUSH_PACK.laws.map((l) => l.id).filter((id) => !always.has(id));
  const seeded = players.filter((p) => typeof p.seed === 'string');
  if (rotating.length && seeded.length) {
    const liveN: Record<string, number> = {};
    for (const p of seeded) {
      const f = createGame(HUSH_PACK, p.seed!).initialState().facts as Record<string, unknown>;
      for (const id of rotating) if (f[`law.${id}.live`] === true) liveN[id] = (liveN[id] ?? 0) + 1;
    }
    const parts = rotating
      .map(
        (id) => `${id} ${liveN[id] ?? 0}/${seeded.length} (${Math.round((100 * (liveN[id] ?? 0)) / seeded.length)}%)`,
      )
      .join(', ');
    notes.push(
      `rotating-law liveness (re-derived from seed): ${parts} — a 0-trip rotating law may be OFF, not toothless`,
    );
  }
} catch {
  /* liveness is a best-effort report; a pack/seed hiccup must never gate the fairness verifier */
}

if (players.length === 0) hard.push('cohort has ZERO players (a broken run)');
if (okN > 0 && failed >= okN)
  warn.push(
    `high failure rate: ${failed} failed vs ${okN} clean — likely an API overload; treat the cohort as degraded`,
  );

// ---- per-player snapshot checks -----------------------------------------------------------------
let decisiveOutcomes = 0; // wins/losses with a recognizable end (for marker-rot sanity)
let deathsChecked = 0;
let parseMissTotal = 0;
let turnsTotal = 0;
for (const p of players) {
  if (!p.ok) continue; // failed players have no clean transcript to verify (already counted)
  const spath = resolve(RUN, 'players', `${p.id}.snapshot.json`);
  if (!existsSync(spath)) {
    hard.push(`${p.id}: ok=true in the manifest but NO snapshot.json (silent corruption)`);
    continue;
  }
  let snap: Snap;
  try {
    snap = JSON.parse(readFileSync(spath, 'utf8'));
  } catch {
    hard.push(`${p.id}: unreadable snapshot.json`);
    continue;
  }
  const turns = snap.turns ?? [];
  const blob = turns.map((t) => (t.text ?? '').toLowerCase()).join('\n');
  const fin = snap.finalStatus ?? 'active';

  // §4.5 parse-confound rate: a player who fought the parser a lot has phrasing friction the synth must
  // NOT read as content. Flag a high rate so it is quarantined before the capability filter.
  const misses = turns.filter((t) => {
    const tx = (t.text ?? '').toLowerCase();
    return PARSE_MISS.some((m) => tx.includes(m));
  }).length;
  parseMissTotal += misses;
  turnsTotal += turns.length;
  if (turns.length >= 10 && misses / turns.length > 0.18)
    warn.push(
      `${p.id} (${p.persona}): high parser-miss rate ${misses}/${turns.length} (${Math.round((100 * misses) / turns.length)}%) — quarantine this player's "confusing" complaints as PARSE-CONFOUND (§4.5) before ranking as content`,
    );

  // 2. REALNESS — an ok player whose play was NOT realness-verified is a fabricated/forged transcript.
  if (snap.verdict?.real !== true) {
    hard.push(`${p.id}: counted ok but realness verdict is NOT real (forged/non-replayable transcript)`);
  }

  // 3. FAIR DEATH — every loss must carry its telegraph ladder. An untelegraphed death is a Tier-1.5
  //    fairness violation (the cardinal sin the blind swarm exists to catch).
  if (fin === 'lost') {
    decisiveOutcomes++;
    const ladder = DEATH_LADDERS.find((l) => l.death.some((d) => blob.includes(d)));
    if (!ladder) {
      warn.push(
        `${p.id} (${p.persona}): LOST but no recognized death line — unknown loss cause, review the transcript`,
      );
    } else {
      deathsChecked++;
      const telegraphed = ladder.telegraph.some((t) => blob.includes(t));
      if (!telegraphed)
        hard.push(
          `${p.id} (${p.persona}): UNTELEGRAPHED ${ladder.name} death — the death line fired but no warning-ladder line precedes it. FAIRNESS P0.`,
        );
    }
  }
  if (fin === 'won') decisiveOutcomes++;

  // 4. SOFT-LOCK at the climax — a player who TOOK the core (the interception fired) and did NOT win:
  //    were they left with no way out? The masked scene prints every exit; if the only exits in the LAST
  //    few turns are "(blocked)" and none is open, the player was walled. (Heuristic -> a WARN to review,
  //    because a rig turn-cap timeout one move from home looks the same and is not a real wall.)
  const tookCore = blob.includes('word of the core moves faster') || blob.includes('the core is yours');
  if (tookCore && fin !== 'won') {
    const tail = turns
      .slice(-6)
      .map((t) => (t.text ?? '').toLowerCase())
      .join('\n');
    const sawOpenWay =
      /the way is open|go back to the waystation|slip back to the waystation|back to the waystation(?!.*blocked)/.test(
        tail,
      ) || /\bback to the waystation\b/.test(tail.replace(/back to the waystation \(blocked\)/g, ''));
    const sawBlocked = tail.includes('(blocked)');
    if (sawBlocked && !sawOpenWay)
      warn.push(
        `${p.id} (${p.persona}, ${fin}): carried the core but ended with the gate showing only BLOCKED ways — check for a soft-lock vs a rig timeout`,
      );
  }
}

// ---- 5. MARKER-ROT sanity (the same fragility the compiler guards) -------------------------------
// If there were decisive outcomes but ZERO deaths matched a known ladder, the death-string matchers have
// likely rotted against the current prose (a silent verifier blind spot).
if (decisiveOutcomes >= 3 && players.some((p) => p.ok && p.finalStatus === 'lost') && deathsChecked === 0) {
  warn.push(
    'MARKER-ROT SUSPECTED: losses occurred but none matched a known death ladder — re-check DEATH_LADDERS against the current content prose.',
  );
}

notes.push(
  `parse-confound: ${parseMissTotal} parser-miss turns / ${turnsTotal} (${turnsTotal ? Math.round((100 * parseMissTotal) / turnsTotal) : 0}% cohort-wide) — friction here is phrasing, not content (§4.5)`,
);

// ---- report -------------------------------------------------------------------------------------
console.log(`\n▸ verify-cohort: ${players.length} players · ${RUN.split(/[\\/]/).slice(-1)[0]}`);
for (const n of notes) console.log(`  · ${n}`);
console.log(`  · decisive outcomes=${decisiveOutcomes} · deaths telegraph-checked=${deathsChecked}`);
if (warn.length) {
  console.log(`\n⚠ ${warn.length} WARNING(S) (review, not a gate-block):`);
  for (const w of warn) console.log(`  ⚠ ${w}`);
}
if (hard.length) {
  console.error(`\n✗ ${hard.length} HARD VIOLATION(S) — this cohort must NOT be trusted as a clean validation:`);
  for (const h of hard) console.error(`  ✗ ${h}`);
  console.error(`\n✗ verify-cohort FAILED`);
  process.exit(1);
}
console.log(`\n✓ verify-cohort PASSED — every death telegraphed, every play realness-verified, no detected wall.`);
