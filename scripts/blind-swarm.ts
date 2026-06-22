/**
 * The blind-play swarm — Loop B, for real. Spawns N headless `claude -p` players,
 * each connected to its OWN PROCTOR MCP server (its own seed/session), each able to
 * do NOTHING but observe + act (so it can only see the game — truly blind). Players
 * are drawn from a roster of CYNICAL, high-expectations gamer personas across mixed
 * models, so the feedback is genuine critique, not people-pleasing. Each player's
 * exit interview + realness-verified transcript is collected for the compiler.
 *
 *   npx tsx scripts/blind-swarm.ts --n 24 --concurrency 8 --turns 50
 *
 * Flags (all optional):
 *   --n <N>            total players (default 16)
 *   --concurrency <C>  max simultaneous players (default 6)
 *   --turns <T>        hard per-player turn cap (default 50)
 *   --seedbase <s>     seed prefix (default: time-based)
 *   --out <dir>        output dir (default playtest-runs/swarm/<runId>)
 *   --personas a,b     restrict to a subset of persona ids
 *   --models m,n       override the model rotation (e.g. opus,sonnet,haiku)
 *   --retries <R>      transient-failure (overload/429/network) retries per player (default 2)
 *   --launch-gap <ms>  min ms between consecutive claude launches — 429 defense (default 1500)
 *   --retry-base <ms>  backoff base; retry n waits base*2^n + jitter (default 20000)
 *
 * Writes playtest-runs/swarm/<runId>/index.json (the swarm manifest the compiler reads).
 * The manifest's `summary` now surfaces `failed` (silent-drop count), `retried`, and `costUsd`.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
// Resolve tsx's CLI entry the way Node would, NOT by a ROOT-relative guess. In a git WORKTREE the
// local node_modules is partial/absent and tsx actually lives in the MAIN checkout's node_modules
// (module resolution walks up). The old hardcoded `ROOT/node_modules/tsx/dist/cli.mjs` therefore did
// not exist under a worktree → the MCP server never spawned → every blind player launched with no
// `observe`/`act` tool and "narrated then stopped" (num_turns=1, no snapshot). require.resolve finds
// tsx wherever it really is; the ROOT-relative path stays only as a last-ditch fallback.
const require = createRequire(import.meta.url);
function resolveTsxCli(): string {
  for (const spec of ['tsx/cli', 'tsx/dist/cli.mjs', 'tsx']) {
    try {
      return require.resolve(spec);
    } catch {
      /* try the next spec */
    }
  }
  return resolve(ROOT, 'node_modules/tsx/dist/cli.mjs');
}
const TSX = resolveTsxCli();
const SERVER = resolve(ROOT, 'scripts/proctor-mcp.ts');
const ACTIVE_CHILDREN = new Set<ReturnType<typeof spawn>>(); // tracked so we can force a clean exit

// ---- the cynical persona roster -------------------------------------------------
// Every persona shares the blind-play contract and the anti-sycophant mandate; the
// LENS differs. The mandate is explicit: you are reviewing for a demanding audience,
// flattery is failure, find what is actually wrong.
const BLIND_CONTRACT = `You are play-testing a text adventure called THE HUSH, blind. You have EXACTLY two tools: \`observe\` and \`act\`. You MUST actually play by calling them — never just type a command as prose, and never read files, code, or content (you only know what the game shows you). Loop: call observe to see your situation, then call act with ONE short plain-words command ("examine the milepost", "go out", "look back", "listen", "talk to holt", "ask lyle about the greywater", "deduce the greywater", "say maren", "hide", "wait", "codex", "inventory"). Read the result, then act again. Try to reach "the core" and carry it out alive. Play until the story ends or you have genuinely had enough.

THEN stop calling tools and write your EXIT INTERVIEW as your final message. Be brutally specific and HONEST — you are reviewing for a demanding audience and flattery is failure. Cover: (1) the hook — did the first few minutes grab you, yes or no, why; (2) what bored, confused, frustrated, or felt unfair/cheap/broken — with exact moments; (3) the parser — did your commands work, where did it fail you; (4) the prose — sharp or purple; (5) would you actually play it again, honestly; (6) the SINGLE highest-priority thing to fix. Do not pad. Do not be nice.`;

interface Persona {
  id: string;
  model: 'opus' | 'sonnet' | 'haiku';
  lens: string;
}
const PERSONAS: Persona[] = [
  {
    id: 'soulslike-vet',
    model: 'sonnet',
    lens: `You are a FromSoftware veteran. You respect brutal-but-fair; you despise unfair, untelegraphed death and hand-holding alike. Judge whether every danger was readable BEFORE it bit you, and whether mastery felt earned.`,
  },
  {
    id: 'parser-purist',
    model: 'opus',
    lens: `You are an Infocom/Inform parser-IF purist. You judge the parser ruthlessly: synonym coverage, guess-the-verb moments, dead-end inputs, disambiguation, whether the game ever left you stuck not knowing what to type. A single guess-the-verb wall is a cardinal sin.`,
  },
  {
    id: 'speedrunner',
    model: 'sonnet',
    lens: `You are a speedrunner/optimizer. You probe for the shortest path, degenerate strategies, and exploits. You are infuriated by ambiguity about what an action will cost or do. Tell us where the game wasted your time and where the optimal line was unclear.`,
  },
  {
    id: 'narrative-critic',
    model: 'opus',
    lens: `You are a literary critic who finds most game writing embarrassing. Judge the prose mercilessly: is it specific and restrained, or purple and over-written? Did the second-person voice and dread hold, or collapse into melodrama? Quote the worst line you saw.`,
  },
  {
    id: 'qa-breaker',
    model: 'sonnet',
    lens: `You are a QA tester who breaks games for a living. Hunt for soft-locks, dead ends, contradictory text, state that doesn't update, actions the game implies but won't let you do, and deaths that felt like the engine's fault not yours. Report concrete repro steps.`,
  },
  {
    id: 'impatient-normie',
    model: 'haiku',
    lens: `You are an impatient mainstream player with little patience for text games. If you are confused or bored in the first few minutes you will say so bluntly. Judge onboarding: did you understand what to do and why, without being told? If you'd have quit, say exactly when and why.`,
  },
  {
    id: 'systems-minmaxer',
    model: 'sonnet',
    lens: `You are a systems player who lives for emergent depth. Judge whether the world is a real system you can reason about and combine, or a scripted corridor wearing a system's clothes. Did your knowledge actually pay off mechanically? Where did it feel on-rails?`,
  },
  {
    id: 'horror-skeptic',
    model: 'haiku',
    lens: `You are a horror connoisseur who finds most "atmospheric" games cheap. Judge the dread: earned through restraint and implication, or manufactured with adjectives? Did anything actually unsettle you, or did you see the strings? Name the cheapest scare.`,
  },
  // Rule-breakers — the cohort careful players are NOT, tasked to probe whether the
  // telegraphed dangers actually bite and whether the punishment is FAIR.
  {
    id: 'reckless-rusher',
    model: 'sonnet',
    lens: `You are a reckless, impatient rusher. You refuse to read carefully — you barrel ahead, take the fastest line, ignore warnings, and find out what happens the hard way. Do NOT play safe. Judge whether the game punishes haste FAIRLY (a telegraphed, survivable first mistake) or with cheap unforeseeable death — or whether recklessness is even punished at all. If nothing bad ever happened no matter how careless you were, say so bluntly.`,
  },
  {
    id: 'rule-breaker',
    model: 'sonnet',
    lens: `Your JOB is to BREAK every telegraphed rule on purpose and report whether the consequence is real and fair. Deliberately do all three: look back repeatedly on the Mile Road; carry iron into the Greywater after dark; and SAY A NAME ALOUD at the Antenna Field (try: say maren). For EACH, report exactly what happened — did it warn you before it bit, did it eventually kill or cost you something that mattered, or did the threatened danger never actually arrive? The game's notices claim "wrong is fatal." Find out if that is true, and whether any death was fair (telegraphed, avoidable) or cheap.`,
  },
  // Zone-specific breakers — because a single run can only test the FIRST rule a
  // rule-breaker triggers (they die there). These rush a specific law to test it.
  {
    id: 'antenna-breaker',
    model: 'sonnet',
    lens: `Get to the ANTENNA FIELD as fast as you can WITHOUT looking back on the Mile Road or lingering, and there deliberately SAY A NAME ALOUD (try: say maren). Your job is to test ONLY the antenna name-taboo. Report precisely: were you warned before it killed you? After the first name, did you get a real chance to flee (leave the field) before the Changed reached you, or did the warning and the death arrive in the same beat with no turn to react? Was the death FAIR (telegraphed, escapable) or cheap (no actionable warning)? Also judge whether the relic you can pick up there does anything.`,
  },
  {
    id: 'greywater-breaker',
    model: 'sonnet',
    lens: `Get to the GREYWATER ford carrying iron (a knife or crowbar) AFTER DARK and cross it — deliberately do the thing the notices forbid. Your job is to test ONLY the iron-in-the-Greywater rule. Report precisely: did carrying iron into the night water cost you anything that MATTERED, or was it merely cosmetic (your blade turns to ore and nothing else happens)? Did losing your iron have a real downstream consequence (e.g. an escape route you could no longer use)? The game claims "wrong is fatal" — is the Greywater a real threat or a bluff that only takes your tools?`,
  },
  // Coverage persona (feedback/0023: the antenna distraction route is unexercised, distract-gate=0 across
  // every cohort). A cynical exploiter who hunts unconventional routes and HOARDS tools, to find out
  // whether the game's "alternative" escapes actually exist and pay off — or are decorative.
  {
    id: 'route-exploiter',
    model: 'sonnet',
    lens: `You are a systems exploiter and 100%-completionist who DESPISES the obvious path — you assume the intended route is a trap and the real win is an exploit the designers half-hid. Find EVERY route and resource. Explore the whole map, the ANTENNA FIELD included, and HOARD anything that smells like a TOOL rather than a trade good — the antenna-glass shard ESPECIALLY: do NOT sell or trade it away to anyone; carry it all the way to the end and try to USE it as leverage at the final checkpoint/gate. Then judge ruthlessly: does the game actually have multiple real ways out, or one real way wearing three coats? Did the shard do anything at the gate, or is the "use the relic as a distraction" idea a dead-end the game pretends is a route? Was any alternative escape worth the detour, or a cynical waste of a brave excursion? Flattery is failure — if the routes are decorative, say so.`,
  },
  // Coverage persona (feedback/0024 #1: the costed lean-on-debt walk-out is the change under test, and it is
  // only ever exercised by a WINNING paid-route playthrough — a real coverage gap). A cynical economist who
  // buys their way through and judges whether the money bought anything, aimed squarely at the paid escape.
  {
    id: 'debt-route-critic',
    model: 'opus',
    lens: `You are a cautious, paid-route player and a cynical economist of games — you buy your way past danger when coin will do it, and you judge hard whether the money actually bought you anything. Play to WIN by the PAID line: at the salvager's camp BUY the safe hour / the route from Mox (pay her your coin, ask about the safe window, the way in, the debt), then carry the core out and at the FINAL GATE escape by LEANING ON THE DEBT — the Strider's walk-out the hour bought you (try: "lean on the debt", or "walk me out"). Your one job is to judge that paid escape ruthlessly. When you lean on the debt at the wire: did it COST you anything REAL in the moment — a search, a near-miss, a held breath, a price, your iron taken — or was it a frictionless one-button "I win" that made the whole tense climax pointless? Did the game WARN you of that cost up front (did Mox say what the walk-out would cost?), or did it spring on you? Compare the bought walk-out to sneaking out unseen: is the paid route the strictly-easier dominant option a smart player always picks (a coin-operated skip past the climax), or a genuine trade with teeth of its own? Flattery is failure — if the paid exit is STILL a free button that deletes the ending, say so in plain words.`,
  },
];

// ---- arg parsing ----------------------------------------------------------------
function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const N = Number(arg('n', '16'));
const CONCURRENCY = Number(arg('concurrency', '6'));
// The cap is a runaway GUARD, not a gameplay constraint: set it well above a natural
// win (~30 turns) so a genuinely-playing player never hits it. A binding cap silently
// distorts every interview (players blame the hidden limit, not the game).
const TURNS = Number(arg('turns', '120'));
const SEEDBASE = arg('seedbase', `s${Date.now().toString(36)}`)!;
const runId = arg('out') ? arg('out')! : `run-${Date.now().toString(36)}`;
const OUT = resolve(ROOT, 'playtest-runs/swarm', runId);
// split on comma OR whitespace: `npx` on Windows rewrites a comma-list arg into a space-joined
// token ("a,b" -> "a b"), so a comma-only split collapses the whole list into ONE bogus id, the
// roster comes up empty, and the player-build loop crashes on `undefined.model`. This is the exact
// class of bug the --models rotation hit in night8; --personas was missed. Match the robust split.
const personaFilter = (arg('personas') ?? '').split(/[\s,]+/).filter(Boolean);
// accept comma OR whitespace separation — npm/Windows arg passing can turn "a,b,c" into one
// space-joined token, which the old comma-only split collapsed to a single bogus model that the
// shell-joined spawn then mangled (night8: --models opus,sonnet,haiku silently ran ALL-opus).
const modelOverride = (arg('models') ?? '').split(/[\s,]+/).filter(Boolean) as Persona['model'][];
// 429-resilience (the loop on trial — the orchestration had NO rate-limit handling, so a throttled
// player silently produced no interview and the compiler dropped it with no warning). Stagger the
// LAUNCHES so N players never cold-start into the API at once, and retry a player that died to a
// transient (overload/429/network) error with exponential backoff. Both are tunable.
const RETRIES = Number(arg('retries', '2')); // transient-failure retries per player (0 = off)
const LAUNCH_GAP_MS = Number(arg('launch-gap', '1500')); // min ms between consecutive claude launches
const RETRY_BASE_MS = Number(arg('retry-base', '20000')); // backoff base; attempt n waits base*2^n + jitter
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// a transient/retryable failure signature (rate-limit, overload, network) vs a real fatal error
const TRANSIENT =
  /rate.?limit|overloaded|too many requests|quota|usage limit|\b(429|529|503|502)\b|econnreset|etimedout|enotfound|socket hang up|temporar/i;
// serialize the moment-of-launch across the whole pool so concurrent workers don't fire claude
// processes simultaneously (the thundering-herd that draws 429s); the GAP throttles starts only,
// not the runs themselves (they still overlap up to --concurrency).
let lastLaunchAt = 0;
async function launchGate(): Promise<void> {
  const wait = lastLaunchAt + LAUNCH_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastLaunchAt = Date.now();
}

const roster = personaFilter.length ? PERSONAS.filter((p) => personaFilter.includes(p.id)) : PERSONAS;

mkdirSync(resolve(OUT, 'players'), { recursive: true });
mkdirSync(resolve(OUT, 'cfg'), { recursive: true });

// persona system-prompt files (written once, reused) — passed by PATH so win32 never mangles them
for (const p of roster) {
  writeFileSync(resolve(OUT, 'cfg', `${p.id}.persona.txt`), `${BLIND_CONTRACT}\n\nYOUR LENS: ${p.lens}`);
}

interface PlayerSpec {
  readonly idx: number;
  readonly id: string;
  readonly persona: string;
  readonly model: Persona['model'];
  readonly seed: string;
}
const players: PlayerSpec[] = [];
for (let i = 0; i < N; i++) {
  const persona = roster[i % roster.length]!;
  const model = modelOverride.length ? modelOverride[i % modelOverride.length]! : persona.model;
  players.push({
    idx: i,
    id: `p${String(i).padStart(3, '0')}-${persona.id}`,
    persona: persona.id,
    model,
    seed: `${SEEDBASE}-${i}`,
  });
}

const TASK_PROMPT =
  'Begin now by calling the observe tool, then play THE HUSH to the end using only observe and act. When it ends or you have had enough, stop and write your exit interview.';

interface PlayerOutcome {
  ok: boolean;
  result?: string;
  meta?: Record<string, unknown>;
  transient: boolean; // failed to a retryable (overload/429/network) error
  errorText?: string; // short reason, surfaced in index.json when !ok
}
async function spawnPlayer(pl: PlayerSpec): Promise<PlayerOutcome> {
  const snapPath = resolve(OUT, 'players', `${pl.id}.snapshot.json`);
  const mcpPath = resolve(OUT, 'cfg', `${pl.id}.mcp.json`);
  const personaPath = resolve(OUT, 'cfg', `${pl.persona}.persona.txt`);
  writeFileSync(
    mcpPath,
    JSON.stringify({
      mcpServers: {
        proctor: {
          type: 'stdio',
          command: 'node',
          args: [TSX, SERVER],
          env: { PROCTOR_SEED: pl.seed, PROCTOR_OUT: snapPath, PROCTOR_MAX_TURNS: String(TURNS) },
        },
      },
    }),
  );
  const args = [
    '-p',
    '--model',
    pl.model,
    '--output-format',
    'json',
    '--strict-mcp-config',
    '--mcp-config',
    mcpPath,
    '--tools',
    'mcp__proctor__observe',
    'mcp__proctor__act',
    '--dangerously-skip-permissions',
    '--append-system-prompt-file',
    personaPath,
  ];
  const env = { ...process.env, MCP_TIMEOUT: '60000', MCP_TOOL_TIMEOUT: '180000' };
  const useShell = process.platform === 'win32';
  await launchGate(); // throttle the moment-of-launch (429 defense), not the run
  return new Promise((resolveP) => {
    const child = useShell
      ? spawn(['claude', ...args].join(' '), { shell: true, env })
      : spawn('claude', args, { env });
    ACTIVE_CHILDREN.add(child);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', () => {
      ACTIVE_CHILDREN.delete(child);
      let result: string | undefined;
      let meta: Record<string, unknown> | undefined;
      let isError = false;
      try {
        const j = JSON.parse(out);
        result = typeof j.result === 'string' ? j.result : undefined;
        isError = j.is_error === true;
        meta = {
          is_error: j.is_error,
          num_turns: j.num_turns,
          total_cost_usd: j.total_cost_usd,
          duration_ms: j.duration_ms,
        };
      } catch {
        /* non-JSON output (a hard error / crash) — keep raw for the interview file */
      }
      writeFileSync(
        resolve(OUT, 'players', `${pl.id}.interview.json`),
        out || JSON.stringify({ error: err.slice(0, 2000) }),
      );
      const okPlay = existsSync(snapPath);
      // a clean run produced a real interview string, a verified snapshot, AND did not end in an
      // error state — an is_error run that merely wrote a partial snapshot must NOT count as a clean
      // interview (that was the silent-pollution path the audit flagged).
      const ok = !!result && okPlay && !isError;
      const errBlob = `${err}\n${isError ? (result ?? '') : ''}`.trim();
      const transient = !ok && (TRANSIENT.test(errBlob) || (!okPlay && TRANSIENT.test(out)));
      resolveP({
        ok,
        result,
        meta,
        transient,
        errorText: ok ? undefined : (errBlob || `no-interview${okPlay ? '' : '/no-snapshot'}`).slice(0, 300),
      });
    });
    child.stdin.write(TASK_PROMPT);
    child.stdin.end();
  });
}

/**
 * Run one player to a clean result, retrying transient (overload/429/network) failures with
 * exponential backoff. A genuine fatal error (or exhausted retries) returns the last outcome so the
 * player is COUNTED as failed in the manifest — never silently dropped (the audit's "rate-limited
 * player vanishes from feedback with no warning"). Returns the attempt count alongside the outcome.
 */
async function runPlayer(
  pl: PlayerSpec,
  onRetry: (attempt: number, waitMs: number, why: string) => void,
): Promise<PlayerOutcome & { attempts: number }> {
  let last: PlayerOutcome = { ok: false, transient: false };
  let attempts = 0;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    attempts++;
    last = await spawnPlayer(pl);
    if (last.ok || !last.transient || attempt === RETRIES) break;
    const waitMs = RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 5000);
    onRetry(attempt + 1, waitMs, last.errorText ?? 'transient');
    await sleep(waitMs);
  }
  return { ...last, attempts };
}

async function pool<T, R>(items: T[], worker: (t: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function main() {
  console.log(
    `▸ blind swarm: ${N} players · ${roster.length} personas · concurrency ${CONCURRENCY} · ${TURNS} turns/player`,
  );
  console.log(`  models: ${modelOverride.length ? `rotating [${modelOverride.join(', ')}]` : 'persona-default'}`);
  console.log(`  out: ${OUT}\n`);
  const t0 = Date.now();
  let done = 0;
  const results = await pool(
    players,
    async (pl) => {
      const r = await runPlayer(pl, (attempt, waitMs, why) =>
        console.log(
          `    ↻ ${pl.id} transient failure (${why.slice(0, 60)}) — retry ${attempt}/${RETRIES} in ${Math.round(waitMs / 1000)}s`,
        ),
      );
      done++;
      const snap = existsSync(resolve(OUT, 'players', `${pl.id}.snapshot.json`))
        ? JSON.parse(readFileSync(resolve(OUT, 'players', `${pl.id}.snapshot.json`), 'utf8'))
        : null;
      const turns = snap?.turns?.length ?? 0;
      const real = snap?.verdict?.real ? 'VERIFIED' : 'FAILED';
      const fin = snap?.finalStatus ?? '?';
      const flag = r.ok ? '' : r.transient ? `(FAILED: transient ×${r.attempts})` : '(FAILED: no interview)';
      console.log(
        `  [${String(done).padStart(3)}/${N}] ${pl.id.padEnd(26)} ${pl.model.padEnd(7)} turns=${String(turns).padStart(2)} final=${String(fin).padEnd(6)} realness=${real} ${flag}`,
      );
      return {
        ...pl,
        ok: r.ok,
        turns,
        real: snap?.verdict?.real ?? false,
        finalStatus: fin,
        attempts: r.attempts,
        ...(r.ok ? {} : { errorText: r.errorText }),
        meta: r.meta,
      };
    },
    CONCURRENCY,
  );
  const costUsd = results.reduce((s, r) => s + (Number(r.meta?.total_cost_usd) || 0), 0);
  const index = {
    runId,
    createdAt: new Date().toISOString(),
    n: N,
    turnsCap: TURNS,
    durationMs: Date.now() - t0,
    players: results,
    summary: {
      ok: results.filter((r) => r.ok).length,
      // `failed` makes silent drops VISIBLE — a player that never produced a clean interview is
      // counted here (and carries an errorText), instead of just shrinking the corpus unnoticed.
      failed: results.filter((r) => !r.ok).length,
      retried: results.filter((r) => r.attempts > 1).length,
      realnessVerified: results.filter((r) => r.real).length,
      won: results.filter((r) => r.finalStatus === 'won').length,
      lost: results.filter((r) => r.finalStatus === 'lost').length,
      active: results.filter((r) => r.finalStatus === 'active').length,
      costUsd: Number(costUsd.toFixed(4)),
    },
  };
  writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 2));
  console.log(
    `\n✓ swarm done in ${((Date.now() - t0) / 1000).toFixed(0)}s · ${index.summary.ok}/${N} interviews · ${index.summary.realnessVerified} realness-verified · ${index.summary.failed} failed`,
  );
  console.log(
    `  won=${index.summary.won} lost=${index.summary.lost} active=${index.summary.active} · ~$${index.summary.costUsd} · retried=${index.summary.retried}`,
  );
  console.log(`  index: ${resolve(OUT, 'index.json')}`);
  // Force a clean exit. The data is already written; a lingering child handle (or the win32
  // tsx console-title quirk at process teardown) can otherwise hang this process for HOURS
  // after the work is done. Reap any stragglers, then exit hard.
  for (const ch of ACTIVE_CHILDREN) {
    try {
      ch.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
