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

- Launch the MCP server with `node node_modules/tsx/dist/cli.mjs …`, **not** `npx tsx` — `npx` cold-start
  exceeds Claude's MCP startup window and the tools never register.
- Set `MCP_TIMEOUT=60000` so the server (which imports the whole engine) has time to boot.
- Persona prompts are passed by **file** (`--append-system-prompt-file`) and the task prompt via **stdin**,
  so the win32 shell never mangles multi-line args.
