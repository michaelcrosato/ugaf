# LOOM — Red-Team Hardening (resolutions before build)

> **Status:** Resolutions to the world-layer red-team (run `w29ygmaug`, verdict: *conditional-go, not
> build-ready*). These amend the [rules spec](2026-06-18-loom-rules-governance-design.md) and
> [world spec](2026-06-19-loom-world-layer-design.md); both get folded to v2 once the §"Open product
> fork" below is decided.
> **Root cause the red-team found:** the design solved per-node problems with node-local mechanisms, but
> the flagship's fun (lawful deduction, composition, fairness, replay) lives in *global/cross-node*
> properties no node-local validator can see. The fixes below move coherence to the layers that can see
> the whole graph, and give laws a real owner.

## Kill-shots → resolutions

| # | Kill-shot | Resolution (adopted) |
|---|---|---|
| K1 | **Arming contradiction**: world-spec says laws gate specialist arming / rewrite routes *at runtime*; rules-spec says "the engine never auto-arms at runtime." | **Arming is a pure function of statically-enumerable, author-declared conditions.** Each route/node author-arms a finite `{condition → specialist}` guard set at author time (e.g. `arm:anomaly WHEN time==night`). Laws **toggle among author-declared arming conditions**; they never invent arming at runtime. The collision audit (K5) now quantifies over a *finite* condition set. |
| K2 | **Laws have no owning module** (category error): a `LawDefinition` is a state-transition function smuggled in as an inert "world-fact"; the kernel routes intents to module *owners*, and a fact has no owner. | **Define a first-class Anomaly module** (kernel-sense: manifest, jurisdiction `domain: anomaly`, own `native_state`, `validateLegality`, `execute()` off the seeded tape). The World Pack populates it with `LawDefinition`s **as data**. Law *effects* emit facts; the law itself is module content. The setting-agnostic spine never reads laws — law-affected travel beats route to the Anomaly module, which holds precedence over the spine floor. (Also resolves the dual-determinism collision: spine d6 vs. a law's fixed effect — the Anomaly module owns it.) |
| K3 | **Determinism vs. the 25× replay bar**: fixed slice + fixed laws + 3 one-shot reveals ⇒ same optimal line by play ~3; mystery is fuel that runs out. | **Per-seed variance + knowledge-as-meta-progression.** A "new play" = a new seed that re-rolls a curated set: which 2–3 of ~8–10 authored laws are **live**, the truth/distortion assignment of rumors, starting kit/debt, Cordon posture. The engine stays bit-deterministic *for any given seed* (PROCTOR's oracle intact); the player gets run-to-run novelty. The player keeps discovered laws as a growing in-fiction **law codex** — the meta-progression *is* the knowledge model. (See the product fork for how aggressively to lean roguelike.) |
| K4 | **Intent-parser on the lethality path**: the one nondeterministic step sits between the player and a lethal outcome — (a) replay can re-map words to a different intent and desync the tape; (b) a trigger verb missing from the vocab → benign spine → lethal law **silently never fires**; (c) enumerating trigger verbs **leaks** the hidden laws. | **Record-and-replay the resolved intent token** (parse may be nondeterministic live, but is persisted to the tape; replay consumes the record, never re-runs the LLM). **Add generic, always-present physical-action intents** (`look_back`, `carry_item_class`, `speak_aloud`, `cross_threshold`, …) so laws key off these via guard predicates — the parser never needs law-specific verbs (kills silent-no-fire *and* vocab-leak at once). Add a paraphrase-recall eval harness for trigger intents. |
| K5 | **Boot-time collision audit may be intractable in the Hush**: laws mutate the reachable-state space, so static reachability enumeration is state-space explosion. | Made tractable **by K1**: arming is a finite author-declared condition set, so the audit quantifies over conditions, not a law-mutated state space. The audit checks: no two exclusive specialists share an arming condition on the same node/route. |

## P0 fixes (must close before authoring any Hush node)

1. **K1 + K2 + K5** above — the arming/owner/audit triad (one coherent pass touching jurisdiction wiring).
2. **K4** parser record-and-replay + generic physical intents.
3. **Lock the `LawDefinition` schema + write the law-consistency validator + author a LAW GRAMMAR first** — a closed taxonomy of what a law may modify (`topology/distance · material-state · causality/time · perception · agency`) plus an explicit composition rule for overlapping regions. The single-writer *seal* step literally cannot run on a law-bearing node without these.
4. **Global post-isolation COHERENCE PASS** (the root-cause fix): after nodes are authored in isolation, before sealing, a stage that sees the *whole graph* proves cross-node properties the isolated writer cannot: (a) every lethal law is **learnable to Surveyed via non-lethal observation before it can kill** (fairness/solvability); (b) no globally-contradictory rumors vs. the live law set; (c) the law-interaction graph has the authored cross-law edges; (d) faction-reach propagation is consistent.

## P1 fixes (before the demo ships)

- **Run-loop & stakes** (see fork): commit a model; pair with a **fail-safe first contact** (first brush with a lethal law warns/costs, never instakills) so "test it on a route" isn't "die on a route."
- **Author law COMPOSITION as a first-class artifact** + validate it (a law-interaction matrix; assert > 0 cross-law edges; cap composable laws per route). Three *isolated* laws = a branch, not emergence.
- **Corpus-level distinctiveness validation**: append-only fingerprint ledger (cadence / opening-beat / sensory register / template), pairwise embedding-distance + n-gram overlap across all sealed nodes, minimum-distinctiveness floor + template budgets, and one critic with a **whole-corpus** read-only view authorized to reject "node 7 = node 12 reskinned." (Isolation prevents conflict but causes homogenization; nothing currently checks for slop.)
- **Pin replay**: bind an engine/runtime **fingerprint** (engine version + RNG-algorithm id + ordered-collection guarantee + float mode) into the replay contract alongside the pack hash; **golden-tape CI** (a recorded session must replay bit-identically or the build fails); derive **all game-time from turn/event count** (wall-clock is *only* the anti-cheat delay, never a rule input); one path-independent tape-draw order with **separate seeded streams per LOD tier**; hard rule: **renderer output is write-only to the display, never read back into kernel state**.
- **Tier-consistency invariant**: background "resolve on approach" must be the *same* deterministic resolver the active tier would run (path-dependent laws don't commute across LOD); regression harness asserts identical state via background vs. regional vs. active arrival.
- **Lock the law-cue/"tell" vocabulary**: each law's learnable trigger/tell renders from a fixed authored *tell library* (stable signifiers) while surrounding color varies; extend the fiction firewall to guarantee phrasing-consistency for learnable cues (LLM paraphrase otherwise makes a "misread = lethal" law un-learnable).
- **Instrument the bar + pre-commit a kill-criterion**: PROCTOR logs per-session duration, replay count, drop-point, laws discovered + order, solution-paths used; pre-commit e.g. "median tester < 5 replays or < 2 distinct solution paths ⇒ loop fails"; test on **5–10 real humans**, not only LLM agents. (Guards the project's known breadth-gaming failure mode.)

## P2 fixes

- **Reposition originality** (adopted): stop selling "deterministic/lawful anomaly" as the hook (STALKER's bolt-trick, *Roadside Picnic*, *Control*'s AWEs already hold that hill). **Lead with the LEARNING SYSTEM** — *a survival game whose character sheet is a growing, fallible, in-fiction map of physical laws* — and add a **dread-preserving mechanic** so mastery doesn't kill the horror: **Law Drift** (a periodic partial re-Settling invalidates some Surveyed knowledge on a seeded schedule — which *doubly* serves the replay bar by refilling mystery), and/or higher-order laws legible only after lower ones, and/or costly observation (the Transformed stage has an irreversible in-world price). Push the twist into the social/economic layer (e.g. the Survey runs a *verified-law futures market*; a Holdout's viability is a function of which laws encircle it).
- **Reconcile the SCALE axis**: `jurisdiction.scale` (entity-size: character/squad/settlement/faction/empire/abstract) ≠ graph-LOD (state/regional/local) ≠ sim-tier (active/regional/background). Give each its own named axis in both specs; fix the world-spec sentence "three world scales become the scale axis."
- **Per-jurisdiction UNCLASSIFIED handling**: an armed module declares its own unclassified policy (in the Hush, an unmapped action inside a law's trigger window resolves to the law's consequence or a budgeted clarify-reprompt — *not* a benign spine beat).
- **Runtime LLM-call budget + render caching**: 25× replay of the same deterministic state should hit *warm* cached renders; tiered prose (description-library fills for low-salience beats, full LLM render for high-salience moments); track calls/session.

## Resolved product fork — DEMO RUN-STRUCTURE = "persistent world, soft replay" (user, 2026-06-19)

The demo is a **persistent open-world slice — no permadeath, no roguelike run loop** (truest to the
`world-feedback` frame: "the world comes first"). The 25× bar is **reframed from run-count to
dwell + voluntary revisit** (Skyrim / immersive-sim "I sank two hours wandering"), not a permadeath
counter. Since there's no run loop to drive repetition, the replay/dwell engine is carried by, in
priority order:

1. **Per-seed variance** — a new save re-rolls which 2–3 of ~8–10 laws are *live*, rumor truth/distortion,
   starting kit/debt, Cordon posture. (Bit-deterministic per seed; PROCTOR oracle intact.)
2. **Law Drift** — periodic partial re-Settling invalidates some *Surveyed* knowledge on a seeded
   schedule, refreshing mystery **within a single save** and preserving dread after mastery. (Now
   load-bearing, since no permadeath refreshes the world.)
3. **Genuinely multiple solution paths** — requires MORE orthogonal systems than "laws + 2 factions"
   (the red-team's valid point): law-composition + faction posture + economy/codex-trading + the
   physical-intent surface must multiply into distinct approaches, not a 4-way branch.
4. **Fast, legible consequence propagation** — at least one consequence must visibly change the start
   location on the player's next pass (rendered, not a journal stat).

**Stakes model:** the frame's §15.4 "recovery instead of immediate failure" holds. "Misread law =
lethal" softens to **"misread = costly/dangerous, with a recovery path,"** and every lethal law has a
**fail-safe first contact** (warn/cost, never instakill) plus the non-lethal learnability gate (P0 #4).

**Acknowledged risk (user owns it):** soft replay makes the 25× compulsion gentler than a roguelike;
mitigated by 1–4 above. The instrumentation + kill-criterion (P1) measures whether dwell/revisit
actually lands, on real human testers.
