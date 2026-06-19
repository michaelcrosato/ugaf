# LOOM — v2 Reconciliation (apply-before-build canon)

> **Status:** AUTHORITATIVE fold-list from the second-pass review (run `wtjvp22b3`, verdict: *sound plan,
> focused edit pass — not a redesign*). Where this doc conflicts with a base spec, **this doc + MASTER-BLUEPRINT v2 win.**
> The three base specs (`...rules-governance`, `...world-layer-design`, `...ruleset-concrete`) still carry
> pre-hardening text; this is the single place that states what supersedes it.
> **Fact-check result:** 7/8 of the Model-Council external citations confirmed against primary sources;
> the "June 2026 PDVA/POMDP preprint" is **unverifiable** (likely fabricated — "PDVA" resolves to nothing
> in this domain). **None are load-bearing** — LOOM imports/links none of them, so the engineering plan is
> unaffected. Only rhetorical action: never cite the PDVA preprint as precedent. Minor caveats if quoted:
> Ludax also covers capture/move (not just "placement"); the D&D 5e SRD is dual-licensed CC-BY-4.0 + OGL.

## P0 — demo-blocking reconciliations (the base specs would build the WRONG thing)
1. **Arming is STATIC (K1).** `world-layer-design.md` still says laws "gate specialist arming" / "rewrite
   routes" at runtime. Supersede: routes/nodes author-arm a **finite `{condition → specialist}` guard set**;
   laws only **toggle among author-declared conditions**; the engine never auto-arms at runtime; the
   boot-time collision audit quantifies over that finite set.
2. **`time.cycle` + `travel.graph` are real modules (K4).** `ruleset-concrete.md` still says "travel is not a
   separate module" and omits both. Supersede: **`time.cycle`** owns day-night phase + the deterministic
   scheduler (owner of "after dark"/arrivals/drift cadence); **`travel.graph`** owns current node, heading/
   facing, edge cost, route memory (owner of "behind you"). Without these the Cordon's Edge demo cannot fire
   its own anchor laws.

## P1 — the rest of the v2 fold (decisions already made in the hardening docs / blueprint)
- **Law grammar:** rename field `grammar → effect_category`; "exactly one category" is pinned to **effect**
  only; `trigger_predicate` + `ambient_gate` are category-free; add a **6th category `summon/agency-spawn`**;
  allow primary + ≤2 secondary; conflict checks run on `effect_category` only (K2).
- **Composition (K5):** same-category laws may share a route unless effects *operationally contradict*;
  cross-category must pass a **quantitative-coupling check**; emergence resolves via a **total
  category×category interaction matrix**, never the spine d6 (which is narrative color only).
- **Honesty reframe:** replace "8 modules multiply / six systems multiply" with **"N laws of distinct
  effect-category on one scene → N deterministic solution axes."** `combat.ito` is a **fail-state**, and
  `invest`/`econ`/`survival` are **acquisition layers**, not parallel solution axes.
- **`fail_safe` (K3):** add the **delegated-lethality clamp** — `combat.ito` clamps Critical Damage to
  non-fatal on first contact with an *unsurveyed* law (Antenna Field can otherwise instakill via summon).
- **Law Drift:** add the **pre-demotion drift tell** (a GUMSHOE-acquirable cue ≥1 beat before a Surveyed
  law demotes) + "drift changes the puzzle, not just the checkmark."
- **Demo armed set:** `{spine, anomaly.hush, time.cycle, travel.graph, invest.gumshoe, stealth.detection,
  social.fate, combat.ito}`; cut `econ.salvage` + `survival.exposure` from the *demo* (keep in full roster);
  rewrite the 3 honest solution paths.
- **Coherence pass:** "proves" → **"checks"** (a decidable subset is proven; the rest is an *untrusted lint
  that informs, never certifies*) — per blueprint §7.
- **Scale-axis split:** name three distinct axes — graph-LOD (state/regional/local) ≠ sim-tier
  (active/regional/background) ≠ `jurisdiction.scale` (entity size).

## P1 — licensing re-tags (ship-blocking for a commercial product)
- **GUMSHOE → CC-BY-3.0 SRD only**; bar the OGL 1.0a version; credit Hite & Kulp (avoids the contested WotC OGL chain).
- **`combat.ito` → drop the "Cairn / CC-BY-SA-4.0" tag**; source from Into the Odd **"Mark of the Odd"**
  (attribution, NO ShareAlike) or **clean-room** (CC-BY-SA copyleft can contaminate the proprietary kernel).
- **Pin FU to "Classic (2020), CC-BY-4.0"**; exclude the copyrighted FU 2e beta.
- Add a **CREDITS/LICENSES manifest** requirement (per-module exact notice + license+version + link + an
  "indication of changes" statement required by CC-BY-4.0/ORC; clean-room specs for the YZE supply-die + stealth FSM).

## P1 — FIVE new controls (novel objections the prior red-teams missed)
1. **PARSE is an un-oracle-able Tier-2 component on the lethality path.** The committed outcome is a function
   of the parsed intent token, so the parser's classification *is* adjudication, relocated upstream — and
   record-and-replay (K4) only guarantees identical *replay*, not a *correct* parse. **Wire in:** a
   human-labeled **parse ground-truth set gated on PRECISION as well as recall** (adversarial near-misses
   that must NOT fire a lethal trigger); **clarify (don't silently resolve) on low confidence inside a law's
   trigger window**; log parse-confidence + alternative intents and **quarantine low-confidence friction as
   "parse-confound" BEFORE the §4.3 capability-differential filter** (else a flaky parser masquerades as
   content signal across all model sizes); an **inter-parser-agreement** check on trigger-bearing turns.
2. **TELL-SUFFICIENCY is un-oracle-able.** The coherence pass can prove a tell *exists and is reachable*,
   not that it is *cognitively sufficient* to deduce the law. **Wire in:** a Tier-2 **tell-sufficiency oracle**
   (a panel given ONLY the rendered tells, world-knowledge analogues scrubbed, must reach the law above chance)
   gating seal; run it **before** the capability filter and **exempt learnability stalls** from the
   "correlates-with-size ⇒ capability noise" discard (inverted for this check); a **cold-start human
   deduce-from-tell test on the 3 anchor laws** before the offline pipeline authors derivative laws; until
   validated, acceptance #4 means "tell-present-and-reachable," not "learnable."
3. **Blind agents cannot measure long-horizon dwell/mastery** (the demo's actual bar). **Wire in:** a
   **longitudinal returning-human panel** playing the *same save across multiple sessions* (the dwell/revisit
   kill-criterion is measured on THEM, never agents) + a one-question post-drift "betrayal vs delight" probe;
   a **persisted-codex agent harness mode** (kernel-owned law-codex carried across sessions) so agents can at
   least exercise cross-session exploitation; **downgrade the demo claim** from "earns 2 hours of dwell" to
   "mechanically sound + short-horizon-engaging" until a longitudinal human signal exists.
4. **Player sandbox: invert deny-list → OS-enforced allow-list.** `--disallowedTools` is unsound under
   runtime/CLI change (the harness runs `claude -p` AND `codex`, with non-identical tool taxonomies). **Wire
   in:** an **OS-level sandbox** (container/namespace/seccomp or a locked-down user — no repo filesystem read,
   no network except the loopback MCP socket); a **per-CLI canary-probe** in the gate (a red-team player tries
   to read a fake law; if it surfaces, the build fails); pin the agent-runtime version (treat a bump like a
   golden-tape fingerprint bump); add a **blind-leak detector** to the realness oracle (the oracle proves a run
   was LIVE, not BLIND — e.g. avoiding a lethal law with zero prior tell-observation is a statistical tell of source-reading).
5. **Affordance-poverty is invisible to menu-driving agents** (steering drifts toward agent-legibility, away
   from immersive-sim depth). **Wire in:** log **out-of-menu / free-form intents as "attempted, no affordance"**;
   add a **creative-prober persona**; track **affordance-coverage as a counter-metric** (so "menu friction down"
   can't dominate); add periodic **human free-play** sessions whose divergence from agent sessions is itself a
   drift kill-criterion.

## P2 — coverage gaps (bounded tightening; not demo-blocking)
- **`nested_module_stack`:** add explicit snapshot-on-push / restore-on-abort (immutable hash of suspended
  frame; on pop restore then apply only declared terminal `world_fact_deltas`; fuse-expiry = discard nested deltas).
- **`campaign_charter`:** add a real schema keyed by the domain set {personal, investigation, settlement,
  faction, warfare, governance, encapsulated} (active module id+version+hash + arming conditions + jurisdiction
  map + seed + license manifest); the boot-time collision audit consumes it.
- **Acceptance suite:** assemble the 8 named tests into ONE consolidated suite; add `hidden_information` and
  `source_fidelity` as named pass/fail gates (source_fidelity = source-derived fixtures reproduced bit-for-bit,
  with source-section→fixture traceability so the integrity gate can enforce it).
- **UNCLASSIFIED-in-law-window override:** an armed module declares its own UNCLASSIFIED policy; an unmapped
  action inside a lethal law's trigger window resolves to the law's consequence or a budgeted clarify —
  **never** a benign spine beat (the base "UNCLASSIFIED → spine" default is unsafe here).

## RESOLVED — multiplayer is OUT OF SCOPE (user decision, 2026-06-19)
- **`fixed_role_preservation` / multi-human governance is explicitly OUT OF SCOPE.** LOOM is **single-player by
  design**; the RuleMesh contract's `fixed_role_preservation` acceptance test is **intentionally deferred**, not
  an unmet obligation. The existing `role` concept stays scoped to *observation-masking* (player / spectator /
  author for the single blind-player harness) — there is no multi-human participant→role binding to build.
- **Implication (keep the door open cheaply):** do not bake single-player assumptions into the *kernel* in a way
  that would force a rewrite later — the jurisdiction model (one authority per mechanical question) already
  generalizes to "out-of-role action rejection," so multi-human governance, if ever revisited, is an *additive*
  module + acceptance test, not a kernel change. No work now; just don't paint the kernel into a single-player corner.

## Net
No redesign. The architecture survived the second pass; the changes are (a) a documentation fold so the base
specs stop contradicting the v2 blueprint, (b) licensing re-tags, and (c) five honesty/controls additions that
**widen the §A "what's un-oracle-able" envelope to include parse-correctness and tell-sufficiency** — which is
exactly the kind of honesty the "irrefutably sound" bar demands.
