# UGAF — the LOOM design corpus

*(Universal Game Architecture Framework)*

**LOOM is a single-player, deterministic text game where an AI writes the game and a swarm of AI agents
play-test it and report back — two self-running loops that improve it over time.** Flagship world: **The
Hush**, an anomaly zone where survival means learning the world's hidden, *lawful* physics.

> **Status: design corpus — nothing is coded yet.** Every doc here is a spec/plan that has been written,
> adversarially red-teamed by AI panels, and hardened. The next step is implementation.

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
