# UGAF — the LOOM design corpus

*(Universal Game Architecture Framework)*

**LOOM is a single-player, deterministic text game where an AI writes the game and a swarm of AI agents
play-test it and report back — two self-running loops that improve it over time.** Flagship world: **The
Hush**, an anomaly zone where survival means learning the world's hidden, *lawful* physics.

> **Status: IMPLEMENTED AND PLAYABLE.** The design corpus below has been built. The deterministic kernel,
> the eight intact modules, **The Hush / Cordon's Edge** world, the narrator, and a playable CLI are live and
> gate-passing; PROCTOR play-tests it and the build→feedback flywheel has turned. The specs remain as the
> design record. **To play, see ▶ Play it below.**

## ▶ Play it

```bash
npm install
npm run play           # drop into The Hush (default seed)
npm run play -- --seed cordon-7
```

You arrive at the Cordon waystation, broke and under-informed, after a rumour of "the core" out in the drowned
bottoms. The Hush is an anomaly zone with **hidden but lawful physics** — its dangers obey consistent,
discoverable rules. **Read the world's tells, deduce the laws into your codex, and use them** to reach the core
and carry it out alive. Type plain words: `examine the milepost`, `look back`, `listen`, `deduce the greywater`,
`drop the knife`, `talk to lyle`, `ask lyle about the greywater`, `say maren`, `hide`, `codex`, `help`.

The first brush with any law **warns you — it never kills you outright.** There are at least three independent
ways to the core (learn the anomalies' timing, strip your metal, or buy the route). Everything is deterministic
and replayable — the same seed always tells the same Hush.

**It improves itself.** Two loops, coupled only through immutable artifacts: **Loop A** (build) can't seal a
red gate; **Loop B** (playtest) drives blind play through PROCTOR, every session realness-verified, and a
critic swarm synthesizes [`feedback/NNNN.md`](feedback/) that Loop A consumes. The loop has turned 5 cycles
this build (see the `feedback/` trail). How to turn it yourself: [docs/FLYWHEEL.md](docs/FLYWHEEL.md).

**Developer commands:** `npm run gate` (typecheck + boundaries + integrity + tests + coherence + golden tape) ·
`npm test` · `npm run playtest` (the Loop B persona swarm) · `npm run coherence` (the law-fairness pass) ·
`npm run coverage-report` (catalog + CREDITS from the filesystem).
See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for the architecture-as-built and
[docs/FLYWHEEL.md](docs/FLYWHEEL.md) for the self-improvement loop.

---

> *Original design-corpus framing (now realized):* Every doc here is a spec/plan that was written,
> adversarially red-teamed by AI panels, and hardened — then implemented.

## Start here (you only need these three)
1. **[MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md)** — the whole system end to end. Open this first; its
   **▶ START HERE** section orients you in 30 seconds.
2. **[v2-reconciliation](docs/superpowers/specs/2026-06-19-v2-reconciliation.md)** — the cheat-sheet of
   *what's decided and what supersedes what* (read before any base spec).
3. **[EXECUTABLE-INVARIANTS-ADDENDUM.md](EXECUTABLE-INVARIANTS-ADDENDUM.md)** — the latest hardening canon
   (post external-LLM-council review + repo-verified market intel): invariants **K6–K11**, the **first
   milestone**, and the frontier-for-build / "local"-correction / MCP-as-adapter calls. **Wins on conflict.**

## The design in 5 bullets
- **Deterministic game:** the *engine*, not an AI, decides every outcome — replayable, watchable, trustworthy.
- **The AI's job is split:** it writes prose + content (offline) and renders text (online), but **never decides
  game outcomes**; the engine owns all math and state.
- **Two loops:** *A* = an AI codes the game (plan→code→commit, gated so it can't ship broken work);
  *B* = blind AI agents play it, get an exit interview, and their feedback steers Loop A.
- **Honesty bound:** *correctness* is engine-guaranteed; *fun* is **human-anchored** — a trajectory, not a
  promise. No "greatest game by [date]" claim.
- **Flagship demo:** "The Cordon's Edge," a slice of The Hush.

## Map
| Doc | What it is |
|---|---|
| [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) | the capstone system plan (read first) |
| [00-REVIEW-FINDINGS.md](00-REVIEW-FINDINGS.md) | why these choices (prior-art audit + the RuleMesh feedback) |
| [01-ARCHITECTURE.md](01-ARCHITECTURE.md) | the deterministic engine (state, determinism, modules) |
| [02-PROCTOR-MCP-HARNESS.md](02-PROCTOR-MCP-HARNESS.md) | how AI agents play it (MCP harness, watchable, paced, blind) |
| [03-STRUCTURE-AND-ROADMAP.md](03-STRUCTURE-AND-ROADMAP.md) | repo layout + build phases |
| [docs/superpowers/specs/](docs/superpowers/specs/) | rules + world + concrete-ruleset specs · hardening passes · the v2 reconciliation |

---

*Designed collaboratively with Claude Code. This repository is design/specification only — not yet implemented.*
