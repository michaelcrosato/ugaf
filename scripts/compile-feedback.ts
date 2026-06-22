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
  digest: string; // BEHAVIOURAL ground truth (what they actually DID), not self-report
}

/**
 * A behavioural digest from the realness-verified turn log — so the synthesis can cross-check
 * self-report against what actually happened (self-report is unreliable; §4.3 demands behaviour-
 * anchoring). Markers are deterministic AUTHORED strings, so they read the world's real events.
 */
function digestSnapshot(id: string): string {
  const spath = resolve(RUN, 'players', `${id}.snapshot.json`);
  if (!existsSync(spath)) return 'no snapshot';
  let snap: { finalStatus?: string; ended?: boolean; turns?: { command: string; text: string }[] };
  try {
    snap = JSON.parse(readFileSync(spath, 'utf8'));
  } catch {
    return 'unreadable snapshot';
  }
  const turns = snap.turns ?? [];
  const blob = turns.map((t) => (t.text ?? '').toLowerCase()).join('\n');
  const has = (...needles: string[]) => needles.some((n) => blob.includes(n));
  const count = (needle: string) => blob.split(needle).length - 1;

  // outcome / cause
  let outcome = snap.finalStatus ?? 'active';
  if (outcome === 'won')
    outcome = has('read true') ? 'WON·mastery' : has('bought map') ? 'WON·bought-map' : 'WON·basic';
  else if (outcome === 'lost')
    outcome = has('the road took you home')
      ? 'LOST·mile-road'
      : has('the dark closed the distance')
        ? 'LOST·hollow-dark'
        : has('taken')
          ? 'LOST·antenna/dead'
          : 'LOST';
  else outcome = 'timed-out (rig cap)';

  const surveyed = count('you are certain now'); // each successful deduce
  const bought = count('you hand over'); // each purchase
  const tags: string[] = [];
  if (has('twice as long', 'the road is growing behind you', 'look back one time too many'))
    tags.push('mile-lookback-tripped');
  if (has('rotten-red', 'slumping toward ore', 'goes soft', 'going soft')) tags.push('greywater-ate-iron');
  if (has('something has heard you', 'the changed', 'turns toward the sound')) tags.push('antenna-summoned');
  if (has('the dark leans in', 'go still one time too many', 'dark is one step closer')) tags.push('hollow-dark-bit');
  if (has('certainty is decaying')) tags.push('saw-decay-warning');
  if (has('crept wider', 'grey hour before dawn', 'hungry hours')) tags.push('DECAY-BIT(predawn)'); // the new #5 mechanic in the wild
  if (has('not on my confirmed shelf', 'not my patch to sell')) tags.push('hit-topic-bound-refusal'); // 0012 #6
  if (has('signs you need to be sure', 'right here', 'look for it toward')) tags.push('saw-deduce-legibility'); // 0012 #3
  // ---- night9 mechanics in the wild (feedback/0013 #3/#4/#5/#6) ----
  // #5: the antenna "coming" ladder fired — a spoken name WARNED instead of instakilling (the fairness fix).
  if (
    has(
      'break for the edge of the field',
      'get out of the field, this beat',
      'gropes the dark for you',
      'a third name leaves your mouth',
    )
  )
    tags.push('antenna-ladder(2nd-name-warned)');
  // #3: the day->dusk threshold was made legible BEFORE the flip, naming the consequence.
  if (
    has(
      'afternoon light runs long',
      'sun is on the horizon now',
      'after dusk the greywater wakes',
      'deep places grow hungry',
    )
  )
    tags.push('saw-dusk-telegraph');
  // #4: the climax said the way was OPEN (clear finish), not a re-offer of the spent escape.
  if (has('the way is open', 'the way is yours', 'slip back to the waystation')) tags.push('saw-way-open');
  // #6: the off-coverage deflect POINTED at coverable topics instead of a flat dead end.
  if (has('ask me about')) tags.push('shop-pointer-deflect');
  // ---- night12 mechanics in the wild (feedback/0016 #4/#5) ----
  // #4: the Hollow Dark's safe pocket spoke — the drowned bottoms read as shelter, not a bluff.
  if (has('drowned walls', 'no open reach', 'sheltered pocket', 'lee of the drowned')) tags.push('saw-hollow-shelter');
  // #5: Mox named the concrete safe-hour window at purchase (midday open, dusk/six deadline).
  if (has('deadest at midday', 'call it six', 'bought luck runs out')) tags.push('saw-mox-window');
  // ---- night14 endgame keystone in the wild (feedback/0018: the watched gate goes live) ----
  // Did the player REACH the live gate-watch carrying the core (the climax the night13 cynics found hollow)?
  if (has('cordon will be watching the gate', 'watching the open ground for exactly what rides in your pack'))
    tags.push('reached-gate-watch');
  // The CLINK fired: tried to slip the watched gate with worked iron, betrayed by the ring (M2 teeth).
  if (has('knocks the post and rings out', 'good metal singing at your hip')) tags.push('CLINK(iron-betrayed-slip)');
  // Leaned on the Strider debt — the BUY route as an ACT now, not a passive fact (M3).
  if (has('peels off the wire', 'walks you through the boom gate like baggage')) tags.push('leaned-on-debt');
  // feedback/0024 #1 (the keystone) — the debt walk-out now COSTS at the moment of use (the hands-on
  // "baggage" search). Record the tension beat the AC demands: a held-breath near-miss, and a working-iron
  // carrier forfeits the iron as the Strider's toll. This is the tool-side proof the climax is no longer a
  // one-button opt-out (the next swarm must show ≥1 of these on the debt route, not the old zero).
  if (has('paw at the baggage', 'a foot from the core', 'searched to the skin', 'given up to buy the silence'))
    tags.push('DEBT-COST(walkout-searched)');
  // Slipped the gate metal-free under dark — the LEARN route's silent escape (M2 reward).
  if (has('melt into the dark', 'the way is open', 'slip back to the waystation')) tags.push('slipped-the-gate');
  // ---- night15 discoverability batch in the wild (feedback/0019 #1/#2) ----
  // Was the wait fast-forward HINT shown (the player ground plain `wait` at a safe node)?
  if (has('go by in a single step', 'pass them one tick at a time')) tags.push('SAW-wait-hint');
  // Did the player then USE the fast-forward (the discoverability fix working)?
  if (has('until the hour you wanted comes round', 'until the light has turned')) tags.push('used-fast-forward');
  // ---- night16 the antenna onto the win path (feedback/0020 #5) ----
  // Did the player USE the relic as the gate distraction (the 4th route)?
  if (has('let its sub-aural song loose', 'the troopers drift off the wire toward the sound'))
    tags.push('DISTRACT-gate');
  // ---- night17 the Greywater clock made fair (feedback/0020 #1/#2) ----
  // Was the crossing deadline told early & free (Holt's intel)?
  if (has('clear of the bottoms before the water wakes', 'get in, get it, get out')) tags.push('saw-grey-deadline');
  // Did a player BEELINE out and RECOVER the core (the widened window saving a run that 2 moves would've lost)?
  if (has('the moment the water is behind you', 'dry ground; the dark cannot call it from here'))
    tags.push('core-recovered');
  // Did a player reach the NEW rung-3 last-margin warning (the extra beat of grace)?
  if (has('this is the last of your margin', 'barely holding its shape now')) tags.push('core-last-margin');
  // ---- night20/21 (feedback/0022) ----
  // night20: did the iron WARN before slumping, and did the player recover it by leaving the water?
  if (has('begins to go soft and red at the edges')) tags.push('iron-warned');
  if (has('firms back as the greywater loses its hold', 'you caught it in time')) tags.push('iron-recovered');
  // night21 (the P0): did Mox sell the walk-out debt to a player who already KNEW the law (the unlock)?
  if (has("i'll not charge you for what you've read", 'the way past the wire, that i')) tags.push('mox-debt-unlocked');
  return `${outcome} · surveyed=${surveyed} · bought=${bought}${tags.length ? ' · ' + tags.join(', ') : ''}`;
}

const gathered: Gathered[] = [];
let skipped = 0; // players in the manifest with NO usable interview — surfaced, never silently dropped
for (const pl of index.players as {
  id: string;
  persona: string;
  model: string;
  finalStatus: string;
  turns: number;
  real: boolean;
}[]) {
  const ipath = resolve(RUN, 'players', `${pl.id}.interview.json`);
  if (!existsSync(ipath)) {
    skipped++;
    continue;
  }
  let interview = '';
  try {
    const j = JSON.parse(readFileSync(ipath, 'utf8'));
    interview = typeof j.result === 'string' ? j.result : '';
  } catch {
    skipped++;
    continue;
  }
  if (!interview.trim()) {
    skipped++;
    continue;
  }
  gathered.push({
    id: pl.id,
    persona: pl.persona,
    model: pl.model,
    outcome: pl.finalStatus,
    turns: pl.turns,
    real: pl.real,
    interview,
    digest: digestSnapshot(pl.id),
  });
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
  .map(
    (g) =>
      `--- PLAYER ${g.id} · persona=${g.persona} · model=${g.model} · realness=${g.real ? 'VERIFIED' : 'FAILED'} ---\nBEHAVIOUR (from the verified turn log — ground truth, trust over self-report): ${g.digest}\nEXIT INTERVIEW (self-report — cross-check against the behaviour above):\n${g.interview.slice(0, PER_CAP)}`,
  )
  .join('\n\n');

// population-level behavioural ground truth — what actually happened across the cohort
const tally = (re: RegExp) => gathered.filter((g) => re.test(g.digest)).length;
const aggregate = [
  `outcomes: WON·mastery=${tally(/WON·mastery/)} · WON·bought=${tally(/WON·bought/)} · WON·basic=${tally(/WON·basic/)} · LOST·mile=${tally(/LOST·mile/)} · LOST·dark=${tally(/LOST·hollow/)} · LOST·antenna-or-dead=${tally(/LOST·antenna/)} · timed-out=${tally(/timed-out/)}`,
  `night9 mechanics reached (0013 #3/#4/#5/#6): antenna-ladder=${tally(/antenna-ladder/)} · dusk-telegraph=${tally(/saw-dusk-telegraph/)} · way-open(clear-finish)=${tally(/saw-way-open/)} · shop-pointer-deflect=${tally(/shop-pointer-deflect/)}`,
  `prior-batch mechanics reached: decay-bit(predawn)=${tally(/DECAY-BIT/)} · saw-decay-warning=${tally(/saw-decay-warning/)} · topic-bound-refusal=${tally(/topic-bound-refusal/)} · deduce-legibility=${tally(/saw-deduce-legibility/)}`,
  `night12 mechanics reached (0016 #4/#5): hollow-shelter(safe-pocket)=${tally(/saw-hollow-shelter/)} · mox-window(concrete-hours)=${tally(/saw-mox-window/)}`,
  `night14 ENDGAME keystone (0018 — the watched gate goes live): reached-gate-watch=${tally(/reached-gate-watch/)} · clink-bit=${tally(/CLINK/)} · leaned-on-debt=${tally(/leaned-on-debt/)} · slipped-the-gate=${tally(/slipped-the-gate/)}`,
  `night15 discoverability (0019 — surface the fast-forward, find the debt): saw-wait-hint=${tally(/SAW-wait-hint/)} · used-fast-forward=${tally(/used-fast-forward/)} · leaned-on-debt=${tally(/leaned-on-debt/)}`,
  `night16/17 (0020 — antenna on the win path; the Greywater clock made fair): distract-gate=${tally(/DISTRACT-gate/)} · saw-grey-deadline=${tally(/saw-grey-deadline/)} · core-recovered=${tally(/core-recovered/)} · core-last-margin=${tally(/core-last-margin/)}`,
  `night20/21 (0022 — iron warns+recovers like the core; the debt P0 unlocked): iron-warned=${tally(/iron-warned/)} · iron-recovered=${tally(/iron-recovered/)} · mox-debt-unlocked=${tally(/mox-debt-unlocked/)} · leaned-on-debt=${tally(/leaned-on-debt/)}`,
  `traps tripped: mile-lookback=${tally(/mile-lookback/)} · greywater-iron=${tally(/greywater-ate-iron/)} · antenna-summon=${tally(/antenna-summoned/)} · hollow-dark=${tally(/hollow-dark-bit/)}`,
].join('\n');

// marker-rot sanity guard (the audit's fragility C): the behaviour digest is exact-substring matches
// against authored prose — if a phrase changes, a marker silently stops matching and the digest
// mis-classifies with no error. If the cohort recorded real wins/losses yet ZERO mechanic/trap
// markers fired across everyone, the markers have almost certainly rotted against the current content.
const decisiveOutcomes = gathered.filter((g) => /WON|LOST/.test(g.digest)).length;
const markerRotWarning =
  decisiveOutcomes >= 3 &&
  tally(/mile-lookback|greywater-ate-iron|antenna-summoned|hollow-dark-bit|WON·(mastery|bought)/) === 0
    ? `⚠ MARKER-ROT SUSPECTED: ${decisiveOutcomes} decisive outcomes but no mechanic/trap markers fired — the digest's authored-string matchers may no longer match the current prose. Re-check digestSnapshot() against content before trusting the behavioural aggregate.`
    : '';
if (markerRotWarning) console.error(markerRotWarning);

const prompt = `You are compiling BLIND play-test feedback for THE HUSH (demo: "The Cordon's Edge"). ${N} cynical, high-expectations players played BLIND (saw only what the game showed them, never code/content) and wrote exit interviews. Synthesize a ranked, actionable report, applying the MASTER-BLUEPRINT §4.3/§4.5 synthesis discipline below. The persona AND model tier are shown for each player so you can apply the capability filter.

BEHAVIOURAL GROUND TRUTH (from the realness-verified turn logs — what the cohort ACTUALLY did, which OUTRANKS self-report where they conflict; §4.3):
${aggregate}
Each player below carries a one-line BEHAVIOUR digest from their own verified log. When a player's interview claims something their behaviour contradicts (e.g. "the laws never bite" but their log shows greywater-ate-iron), trust the behaviour and say so. When NO player's behaviour reached a feature a recent batch shipped — the night9 fixes (antenna-ladder, dusk-telegraph, way-open clear-finish, shop-pointer-deflect) or the prior batch (decay-bit, topic-bound-refusal, deduce-legibility) — note it as "shipped but unexercised — widen the next swarm to reach it" rather than as a win or a flaw. For the night9 antenna-ladder specifically (the #5 fairness fix): if an antenna-breaker reached the field and spoke a name, check whether their log shows the second-name WARNING (antenna-ladder tag) and whether they then survived/fled — that is the evidence the "warning and death collapsed into one beat" bug is fixed; if they still report an instant unwarned death, that is a P0 regression.

NIGHT14 ENDGAME KEYSTONE (feedback/0018 — THE PRIMARY THING THIS BUILD CHANGED): the night13 cynics found the climax HOLLOW — the watched gate was a sticky no-op, the debt opened it passively, and the careful player strolled out with zero tension. night14 makes the gate LIVE and the three routes DIVERGE: the watch actively searches (reached-gate-watch), worked iron CLINKS so a silent slip demands shedding metal (CLINK tag), the debt is now an ACT you lean on (leaned-on-debt), and the metal-free slip is the LEARN reward (slipped-the-gate). JUDGE THIS DIRECTLY: for every player who reached the gate carrying the core, did the endgame finally have TEETH — a real choice with real pressure — or is it STILL hollow? Did any player hit an UNTELEGRAPHED WALL at the gate (a fairness P0: the routes must always be recoverable AT the gate — drop iron + ask Holt + hide, or pry, or lean on a debt)? If the aggregate shows reached-gate-watch>0 but clink/debt/slip all zero, the gate was reached but the new divergence was not exercised — say "shipped but the divergence is unexercised — widen coverage." If NO player reached the gate, the endgame is untested this cohort and that is the top harness note (route a cohort of winners to the climax).

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
// SANDBOX the synth: it is a pure text-in -> text-out task. It must NOT touch the repo. The old
// invocation used --dangerously-skip-permissions, which let the opus agent autonomously EDIT files
// (it wrote a report straight into feedback/0013.md). Drop the bypass (headless auto-denies tools
// without it), pin out MCP, and explicitly deny every mutation tool. The report comes back as TEXT.
const args = [
  '-p',
  '--model',
  MODEL,
  '--output-format',
  'json',
  '--strict-mcp-config',
  '--disallowedTools',
  'Edit,Write,MultiEdit,NotebookEdit,Bash',
];
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
const dropLine = `> ${N} interview(s) synthesized · ${skipped} skipped (no usable interview) · manifest failed=${index.summary?.failed ?? 0} · ~$${index.summary?.costUsd ?? '?'}\n`;
const header = `# Compiled blind-swarm feedback — ${index.runId}\n\n> ${N} blind cynical players · ${index.summary?.realnessVerified ?? '?'} realness-verified · won=${index.summary?.won} lost=${index.summary?.lost} active=${index.summary?.active}\n${dropLine}> Compiled ${new Date().toISOString()} via ${MODEL}.\n${markerRotWarning ? `>\n> ${markerRotWarning}\n` : ''}>\n> **Behavioural ground truth (verified turn logs):**\n> ${aggregate.replace(/\n/g, '\n> ')}\n\n`;
const outPath = resolve(RUN, 'compiled-feedback.md');
writeFileSync(outPath, header + report);
console.log(`\n${header}${report}\n`);
console.log(`✓ written: ${outPath}`);
