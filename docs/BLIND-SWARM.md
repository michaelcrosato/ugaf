# The blind swarm — Loop B, for real

The original Loop B (`npm run playtest`) runs **scripted** personas: fixed command lists,
deterministic, no LLM. Useful as a regression tape, but it is not *blind play* — the commands
are authored by us, so it can't tell us what a real player finds confusing, boring, or unfair.

The blind swarm closes that gap. It runs many **headless `claude -p` players**, each connected to
its own **PROCTOR MCP server**, each able to do nothing but `observe` and `act`. A player can see
**only what the game shows it** — never the code, the content, or hidden state — so its reactions
are genuine. Players are drawn from a roster of **cynical, high-expectations gamer personas** across
**mixed models** (opus / sonnet / haiku), explicitly mandated to be critical, not polite — because a
people-pleasing playtester is worthless.

## The pieces

| File | Role |
|---|---|
| `src/proctor/mcp-server.ts` | `ProctorMcpBridge` — the thin MCP adapter `protocol.ts` always promised. Turns a `ProctorSession` into exactly two tools (`observe`, `act`). Content-free, unit-tested. |
| `scripts/proctor-mcp.ts` | The runnable stdio server a blind player connects to (JSON-RPC over stdin/stdout). Env: `PROCTOR_SEED`, `PROCTOR_OUT`, `PROCTOR_MAX_TURNS`. |
| `scripts/blind-swarm.ts` | Spawns N blind players in parallel across the persona roster + models; collects each one's exit interview + realness-verified transcript. `npm run swarm`. |
| `scripts/compile-feedback.ts` | Synthesizes a swarm run into a ranked, frequency-weighted feedback report — separating real GAME issues from TEST-HARNESS artifacts. `npm run feedback`. |

## Run it

```bash
npm run swarm -- --n 24 --concurrency 8 --turns 120     # 24 blind players, 8 at a time
npm run feedback                                         # compile the latest run -> compiled-feedback.md
```

Output lands in `playtest-runs/swarm/<runId>/` (git-ignored): per-player `*.interview.json`
(the player's exit interview) + `*.snapshot.json` (the realness-verified transcript), an
`index.json` manifest, and `compiled-feedback.md`.

### Rate limits, one cohort at a time

The swarm fans out real `claude -p` sessions, which share your account's rate limit. Two things keep
it from drawing 429/overload errors, both tunable:

- `--launch-gap <ms>` (default 1500) staggers the *moment of launch* so N players never cold-start
  into the API at once. It throttles starts only; runs still overlap up to `--concurrency`.
- `--retries <R>` (default 2) re-runs a player that died to a **transient** error (overload / 429 /
  network) with exponential backoff (`--retry-base <ms>`, default 20000 → 20s, 40s, …). A genuine
  fatal error or exhausted retries leaves the player **counted as failed** in the manifest (never
  silently dropped — `index.json.summary.failed`, with a per-player `errorText`).

**Run one cohort at a time.** Launching several swarm cohorts in parallel is the fastest way to get
throttled. Keep `--concurrency` modest (≤ 6–8), let a cohort finish, then start the next. The manifest
`summary` now surfaces `failed`, `retried`, and `costUsd` so a throttled run is visible at a glance.

### De-noising the persona↔model confound (two-cohort merge)

The roster hard-pairs each persona to one model (e.g. `parser-purist` is always opus), so within a
single cohort a persona only ever appears at one tier — and the compiler's capability-differential
filter (§4.3) can't fire. To span the size axis, run a second cohort that forces the analytic personas
onto a different model, then **merge** before compiling:

```bash
npm run swarm -- --personas soulslike-vet,parser-purist,speedrunner,qa-breaker --out cohort-default
npm run swarm -- --personas soulslike-vet,parser-purist,speedrunner,qa-breaker --models opus --out cohort-opus
npx tsx scripts/merge-cohorts.ts --out combined a=playtest-runs/swarm/cohort-default b=playtest-runs/swarm/cohort-opus
npm run feedback -- --run playtest-runs/swarm/combined
```

`merge-cohorts.ts` prefixes player ids by cohort tag (they collide otherwise) and rebuilds a combined
`index.json`. Always pass `--run` explicitly after a merge — `npm run feedback` with no arg picks the
newest run by `index.json` mtime, which a merge can shuffle.

## Why it is trustworthy (and where it isn't)

- **Blind by construction.** The player is launched with `--tools mcp__proctor__observe mcp__proctor__act`
  — those are the *only* tools it has. It cannot read a file even if it wanted to. The masked player
  observation (`role: 'player'` in `assemble.ts`) carries no hidden facts.
- **Provably played.** Every session emits a signed manifest the realness oracle verifies (nonce chain
  + wall-clock + deterministic replay). A fabricated transcript fails.
- **The turn cap is a GUARD, not a rule.** `PROCTOR_MAX_TURNS` exists only to stop a looping player. Keep
  it well above a natural win (~30 turns) — a *binding* cap silently distorts every interview (players
  blame the hidden limit instead of the game). If players complain about "running out of turns," that is
  a harness artifact; raise the cap, don't change the game. The compiler is told to filter these out.

## Operational notes (win32)

- Launch the MCP server with `node <tsx-cli> …`, **not** `npx tsx` — `npx` cold-start exceeds Claude's
  MCP startup window and the tools never register. The launcher resolves `<tsx-cli>` via
  `require.resolve('tsx/cli')`, **not** a hardcoded `node_modules/tsx/dist/cli.mjs` path.
  **Why this matters (the worktree trap):** in a git **worktree** the local `node_modules` is
  partial/absent and tsx really lives in the *main* checkout's `node_modules` (Node resolution walks
  up). The old hardcoded ROOT-relative path did not exist under a worktree, so the MCP server never
  spawned and **every blind player launched with no `observe`/`act` tool — it "narrated then stopped"
  (`num_turns=1`, no snapshot, counted `failed`).** If a whole cohort fails that way, check that the
  resolved tsx path exists before suspecting the game or the model.
- Set `MCP_TIMEOUT=60000` so the server (which imports the whole engine) has time to boot.
- Persona prompts are passed by **file** (`--append-system-prompt-file`) and the task prompt via **stdin**,
  so the win32 shell never mangles multi-line args.
