# agent-cleaner PLAN — ugaf / loom-engine

Mode: **QUICK** (104 tracked files, ~8.3k LOC TS + 32 md; fits one context → single-pass inline).

Safety: branch `chore/agent-cleaner` off `main` @ b3260d3. Tree was clean. 9 unmerged local
branches present — DO NOT touch/delete. No CI (local gate authoritative). Ships to `main`
per repo operational reality, but this branch will NOT be merged by me — left for operator.

## Canonical gates (the repo's own, do not replace)
- `npm run gate` → typecheck · boundaries · integrity · tests · coherence · golden
- `npm run typecheck` (`tsc --noEmit`)
- `npm test` (`vitest run`)
- Custom: `npm run boundaries`, `npm run integrity`, `npm run coherence`, `npm run golden`

## Tiers
1. **Core config / baseline** — run `npm run gate`, capture output. Establish red/green baseline.
2. **Hygiene** — secrets scan (gitleaks), giant artifacts, gitignore sanity, stray tracked files.
3. **Deps** — lockfile↔manifest consistency, `npm audit` (osv-scanner missing), unused/missing deps.
4. **Docs↔code** — README quickstart literal check; documented commands/paths/env vars exist; dead refs.
5. **Code audit** — TODO/FIXME triage; dead-code flagging (flag, don't delete unless provably safe).
6. **Verify + Report** — re-run global gate; write STATE.md with FIXED / NEEDS DECISION / INTENTIONAL.

## Standing decisions
- Initially flagged the missing formatter as NEEDS DECISION; operator granted full authority →
  RESOLVED: adopted Prettier as the gate's `format` stage + removed unused `zod`. See STATE.md F4/F5.
- Repo is opinionated; honor its custom gate/boundary/integrity philosophy (Prettier was added to
  COMPLETE the gate's coverage, not replace any working tool).
- Fixes must be safe + reversible + evidence-backed (re-run the relevant gate).
