# LOOM — the architecture as built

The design corpus (root `*.md` + `docs/superpowers/specs/`) is the *plan*. This is what actually shipped,
and where to find it. Stack: TypeScript ESM, Node ≥20, Zod, Vitest, `tsx`. One package; hard import
boundaries enforced by `scripts/check-boundaries.ts` (the kernel imports no concrete module; modules import
only the SDK; composition is by jurisdiction routing, not import).

## Layout

```
src/
  sdk/        contracts only: json (canonical), facts (typed namespaces + write-perms), intents (generic
              physical-act ontology), tape (reader contract), types (module interface, events, manifest),
              law (grammar: 6 effect-categories, K6 matrix, K10 bounded predicate language), worldpack
              (setting schema + reactive-prose model), define (manifest + validation)
  kernel/     deterministic, content-free, module-free: hash (sha256, null-proto), rng (splitmix64,
              counter-addressable), tape (record/replay draws), state (+ load gate), router (+ boot
              collision audit), scheduler (in engine), engine (Plan→Diff→Validate→Apply + K7 same-beat
              beats + K8 severity), eventlog (+ engine fingerprint), replay (first-divergence oracle),
              registry
  modules/    the 8 intact rule systems (spine, time, travel, anomaly, invest, stealth, social, combat)
  narrator/   parse (deterministic, forgiving, K8-honest) + render (reactive variant prose) + firewall seam
  game/       assemble (composition root: wire modules from a pack, per-seed variance, armed-set, masked
              observation, ReplayDriver) + session (the turn loop, codex, save, goals)
  proctor/    protocol (the typed player verbs + nonce + delay), oracle (realness), transcript, playtest
  gates/      coherence (the law-fairness CHECK)
  cli/        the playable REPL (npm run play)
content/hush/ The Hush / Cordon's Edge world pack (DATA: regions, nodes, edges, items, laws, tells, npcs)
test/         hostile-slice (kernel), hush (integration), gates (acceptance), proctor
scripts/      gate, check-boundaries, verify-integrity, coherence-pass, golden-tape, playtest, coverage
```

## The spine

- **Three state layers.** Canonical world facts (typed dotted namespaces, write-permission allow-lists ⇒ no
  crosswalks structurally) · per-module native slices (one writer each) · derived presentation (never written).
- **The pure transition.** `step(state, registry, intent, opts)` routes to one jurisdiction owner, legality-
  checks, executes on a copy, runs the K7 same-beat scheduler (canonical phase order: travel → phase → law →
  summon → drift → fuse → schedule), enforces K8 (an uncertain intent can never commit a lethal/irreversible
  outcome), and atomically commits — or returns the unchanged prior state.
- **Laws are data, interpreted reactively.** A `LawDefinition` lives in the world pack; `anomaly.hush` owns it
  and fires it on the `law_trigger` beat via a bounded fact-predicate (so triggers never couple to verbs and
  can't leak). Effects emit canonical facts the base modules read (e.g. the Mile Road writes `law.behind_mult`,
  which `travel.graph` applies). Two laws compose via the total category×category matrix, never the spine d6.
- **Determinism.** No wall-clock, no `Math.random` in the deterministic layers (integrity-gated). Game-time is
  the turn counter; entropy is the recorded tape. Every run replays bit-for-bit; the golden tape proves it in CI.
- **Fairness is enforced, not hoped.** Coherence pass: non-lethal learnability + fail-safe first contact +
  delegated-lethality clamp + pre-demotion drift tells + matrix totality + ≥1 authored cross-law coupling.

## The two loops, as built

- **Loop A (build).** The gate (`npm run gate`) is the single-writer correctness point: typecheck + import
  boundaries + integrity (no `.only`/`.skip`, no entropy in deterministic layers, test-count baseline) + the
  full test suite + coherence + golden-tape bit-identical replay. Nothing seals if any stage is red.
- **Loop B (playtest).** PROCTOR drives blind play over the three-verb protocol; every session emits a signed
  manifest the realness oracle verifies (nonce chain + wall-clock + replay). `npm run playtest` fans personas
  over The Hush; findings flow to `feedback/NNNN.md`, which Loop A consumes (see `feedback/0001.md` for the
  first closed cycle).

## Honesty bound (unchanged from the design)

Correctness is engine-guaranteed (Tier 1) with two named, panel/human-anchored exceptions inside it:
parse-correctness and tell-sufficiency (Tier 1.5). Quality/fun is a human-anchorable *trajectory* (Tier 2),
steered by Loop B — never an oracle. "Greatest text world" is the direction, kept honest by the feedback loop.
