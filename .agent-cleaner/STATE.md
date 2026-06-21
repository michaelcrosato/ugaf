# agent-cleaner STATE — ugaf / `loom-engine`

System of record for the cleanup. Mode: **QUICK** (single inline pass; repo fits one context).

- Branch: `chore/agent-cleaner` off `main` @ `b3260d3` (clean tree at start).
- Repo: 104 tracked files · ~8.3k LOC TypeScript · 32 markdown · npm + tsx + vitest.
- Canonical gate (the repo's own — not replaced): `npm run gate`
  = typecheck · boundaries · integrity · tests · coherence · golden.
- **Baseline gate: GREEN** (`.agent-cleaner/gate-baseline.txt`).
- **Post-fix gate: GREEN** (`.agent-cleaner/gate-after-fixes.txt`), golden fingerprint
  identical to baseline (`db9670e9b3ff`) → fixes changed zero game behavior.
- 9 unmerged local branches present — **untouched** (preserved per safety rule).

---

## FIXED (verified by re-running the gate)

### F1 — README footer contradicted the documented, verified status
- `README.md:79` claimed *"This repository is design/specification only — not yet implemented"*,
  directly contradicting line 9 (*"Status: IMPLEMENTED AND PLAYABLE"*) and lines 11–12
  (*"are live and gate-passing"*). The body already reframes the corpus as "now realized" (line 45).
- **Fix:** rewrote the footer to state the corpus has since been implemented (engine, world,
  narrator, playable CLI live and gate-passing), specs remain the design record.
- **Evidence:** `npm run play` and `npm run play -- --seed cordon-7` both boot and exit 0
  (quickstart works literally); the new footer matches the verified reality.

### F2 — three pieces of dead code (unused imports / leftover placeholder)
Found by a non-destructive `tsc --noEmit --noUnusedLocals --noUnusedParameters` probe:
- `content/hush/world.ts:27` — leftover placeholder `const dim = (s) => s`, never referenced. Removed.
- `src/kernel/engine.ts:15` — unused `type BeatPhase` import (type-only, zero runtime). Removed.
- `src/modules/combat/index.ts:15` — unused `WorldEvent` in a type-only import. Removed.
- **Why safe:** all three are provably side-effect-free (one unused local + two type-only imports);
  removal verified by full green gate with an **identical golden fingerprint**.

### F3 — tightened the existing typecheck so dead code can't recur (no new tooling)
- Added `noUnusedLocals: true` + `noUnusedParameters: true` to `tsconfig.json`.
- **Not** a new dependency or tool migration — just two flags on the repo's own `tsc` gate.
  0 violations after F2, so the gate stays green and now blocks future dead locals/imports.
- **Evidence:** `npm run gate` green post-change (`gate-after-fixes.txt`).

---

## NEEDS HUMAN DECISION

### D1 — `zod` is an unused runtime dependency
- `package.json` declares `zod ^3.24.1` as the sole runtime `dependency`, but it is **never imported**
  anywhere in the source (the only repo mention is a *comment* in `scripts/check-boundaries.ts:68`).
  Validation uses plain `JSON.parse` + the custom canonical-JSON module (`src/sdk/json.ts`), not zod.
- **Not deleted** (unused-dep rule = flag, don't delete; it may be staged for a future validation layer
  that the design corpus anticipates).
- **Options:** (a) **Remove** it — `npm uninstall zod` (updates manifest + lockfile cleanly); zero code
  references, so no risk. (b) **Keep** if schema validation is on the roadmap.
- **Recommendation:** (a) remove — re-add when a validation layer actually lands.

### D2 — no formatter / linter exists (by design)
- The repo deliberately has **no** ESLint/Prettier/Biome; it relies on a custom gate
  (typecheck + boundaries + integrity + coherence + golden). Import **order** is therefore unenforced.
- Per the never-bend rule (don't migrate/replace working tooling), I did **not** impose one. Adding
  Prettier+ESLint would churn all 65 TS files and cut against the project's minimalist philosophy.
- **Options:** (a) **Leave as-is** — the custom gate is the project's chosen quality bar; I tightened
  it with tsc unused-code checks (D-adjacent, no new dep). (b) **Add Prettier** (format-only, low churn,
  one dev-dep) for tool-enforced formatting. (c) **Add Prettier + ESLint** (formatting + import-order +
  lint rules) — most coverage, most churn/maintenance.
- **Recommendation:** (a) leave as-is, or (b) Prettier-only if tool-enforced formatting is wanted.
  This is the operator's call, not mine to impose.

---

## INTENTIONAL (verified healthy, respected — no change)

- **Custom gate over standard linters** — deliberate; honored (see D2).
- **`scripts/proctor-mcp.ts`** has no npm script but is **not** orphaned — spawned by
  `scripts/blind-swarm.ts:29` and documented in `docs/BLIND-SWARM.md`.
- **Forward-looking spec docs** (`00–03`, `MASTER-BLUEPRINT.md`, `docs/superpowers/specs/*`) — the
  README explicitly frames these as "the design record"; their design-tense language is intentional,
  not stale (distinct from the F1 footer, which falsely described the *whole repo* as unbuilt).
- **Gitignored runtime dirs** (`node_modules/`, `.tmp/`, `playtest-runs/`, `saves/`, `.proctor/`) —
  correctly ignored and untracked.
- **Dev/internal env vars** (`PROCTOR_*`, `FLYWHEEL_AUTONOMOUS`, `LOOM_NOCOLOR`, `NO_COLOR`) — not part
  of the quickstart; no documentation reconciliation needed.

---

## Clean across the bar (checked, no findings)

| Area | Result | Evidence |
|---|---|---|
| Build/run from documented command | ✅ `npm install` + `npm run play` boots | smoke test, exit 0 |
| Lockfile committed & consistent | ✅ `package-lock.json` tracked; `npm ls` clean | `npm ls` |
| Types pass | ✅ incl. new unused-code flags | `npm run gate` |
| Tests run & pass, no silent skips | ✅ 64 passed / 12 files / 0 skipped | vitest output |
| Docs ↔ code, no dead refs | ✅ all relative md links resolve | dead-link scan (0 hits) |
| Secrets | ✅ none | `gitleaks detect` — 63 commits, no leaks |
| Vulnerable deps | ✅ none | `npm audit` — 0 vulnerabilities |
| Giant logs/artifacts | ✅ none >200KB tracked (golden tape is a fixture) | size scan |
| `.gitignore` sanity | ✅ covers env/secrets/build/runtime | reviewed |
| TODO/FIXME/HACK/ts-ignore | ✅ zero in src/scripts/content | `rg` scan |
| Git hygiene / unmerged branches | ✅ 9 branches preserved, clean tree | `git status` |

---

## Tooling added
- **Repo dev-deps:** none added (no missing standard *gate* — the repo's gate is comprehensive;
  unused-code enforcement added via existing `tsc` flags, not a new dependency).
- **My env (not committed):** used `gitleaks`, `tokei`, `rg`, `fd`, `npm audit`. `osv-scanner` was
  absent → fell back to `npm audit` (0 vulns) for the dependency-vuln gate.

## Token ledger
Single QUICK pass, no subagents (repo small enough to hold in one context). ~20 bounded tool
invocations (rg/fd counts before reads, targeted Reads only, 3 small Edits, 2 full gate runs).

## Re-verify commands
```bash
npm run gate                                   # full gate: must print "GATE PASSED"
npx tsc --noEmit --noUnusedLocals --noUnusedParameters   # 0 errors (dead-code clean)
printf 'quit\n' | npm run play                 # quickstart boots, exit 0
gitleaks detect --no-banner --redact           # no leaks
npm audit                                       # 0 vulnerabilities
```

## Disposition summary
- **FIXED:** 3 (README footer · 3 dead-code removals · tsc unused-code enforcement).
- **NEEDS DECISION:** 2 (unused `zod` dep · no formatter/linter by design).
- **INTENTIONAL:** 5 categories, respected.
- Branch `chore/agent-cleaner` left clean and **not merged** (operator's call; repo ships to `main`).
