# LOOM — Rules Governance Layer (Design Spec)

> ⚠️ **SUPERSEDED IN PLACES — read [v2-reconciliation](2026-06-19-v2-reconciliation.md) first.** This base spec carries pre-hardening text the v2 fold overrides (esp. licensing tiers: GUMSHOE → CC-BY-3.0-only; combat → no Cairn CC-BY-SA). Where they differ, the reconciliation doc + MASTER-BLUEPRINT v2 win.

> **Status:** Design approved on the two load-bearing decisions (see §0); awaiting full-spec review.
> **Date:** 2026-06-18
> **Companion docs:** [00-REVIEW-FINDINGS](../../../00-REVIEW-FINDINGS.md) · [01-ARCHITECTURE](../../../01-ARCHITECTURE.md) · [02-PROCTOR-MCP-HARNESS](../../../02-PROCTOR-MCP-HARNESS.md) · [03-STRUCTURE-AND-ROADMAP](../../../03-STRUCTURE-AND-ROADMAP.md)
> **Evidence:** two web-grounded, adversarially-verified research passes (158 agents total; primary-source licensing checks). Citations in §9.

This spec defines the **rules-governance layer**: which rule system governs which moment, the flexible default that handles everything in between, and — critically — how outcomes are adjudicated in an AI-run game **with no human GM** without the LLM ever faking or cheating the mechanics. It builds on the LOOM kernel (01-ARCHITECTURE) and is played only through PROCTOR (02).

---

## 0. Decisions locked (from brainstorming)

1. **LLM authority = renders only, never adjudicates live.** The deterministic kernel selects every mechanical outcome from authored, content-hashed data. The LLM's breadth is unleashed *offline* (authoring) and *online* (prose + playtesting), but it is fenced out of live mechanical adjudication. This is what makes play faithful, replayable, and watchable (the PROCTOR thesis).
2. **Default spine = Freeform Universal primitive + Powered-by-the-Apocalypse move-pattern.**

Adopted without a separate gate (implied by the project's "borrow / be inspired" mandate):

3. **Licensing posture:** ship 🟢-tier open systems faithfully (with attribution); for 🔴-tier proprietary systems, reimplement only the *uncopyrightable mechanic* clean-room (never text/dice/brand). See §4.

**This spec covers** the spine, the GM-less adjudication mechanism, the module catalog + licensing, the jurisdiction/hand-off model, and how the LLM's breadth is deployed. **It does not re-derive** the kernel, state model, determinism, or PROCTOR (those live in 01/02).

---

## 1. The two-plane principle (the LLM deal)

Everything in this layer follows from one split:

| Plane | The LLM is… | Produces | Constraints |
|---|---|---|---|
| **Offline authoring** | *unleashed at massive scale* | move-sets, world content, factions, region maps, NPC logic, lore | output is sealed as **content-hashed static data**, validated by per-module static validators before it can ship |
| **Online play** | *renderer only* | prose, dialogue, choice menus | reads committed facts; passes the 4-gate firewall (§3.4); cannot mutate state or pick outcomes |

The LLM's "superhuman" reach — describing any of a century of rule systems, writing libraries of content no human could — is realized in the **offline** plane. The **online** plane is deliberately small and fenced so the running game is deterministic and provably real. This is the resolution of the central tension: *the model's breadth builds the world; the kernel runs it.*

---

## 2. The default spine — FU primitive + PbtA move-pattern

The spine governs every "in-between" moment no specialist module claims. It is itself an intact, lowest-priority **module** (`loom.spine.fu-pbta`) with a catch-all jurisdiction (`domain: narrative`, all scales/phases, `entity_selectors: ["*"]`), conditional on *no intact module claiming the question*.

**Resolution primitive (Freeform Universal, CC-BY-4.0):** pose a closed yes/no question about the intent; the kernel rolls one d6 off the seeded tape and reads a six-step ladder — **Yes-and (6) · Yes (4) · Yes-but (2) · No-but (5) · No (3) · No-and (1)**. Relevant descriptors/conditions add bonus/penalty dice (take best/worst; + and − cancel). One roll resolves a punch or a war by *dialing the question's scope*. Only the "player" side is rolled.

**Complication-content pattern (PbtA, mechanics uncopyrightable, courtesy credit):** the "but/and/no" half of the ladder is filled by a **move-set** — PbtA-style "moves + GM-moves-on-a-miss" represented as authored data, not LLM improvisation. (Dial: a move-set may instead declare a PbtA `2d6+stat → 10+/7-9/6-` profile; the band normalization in §3 is internal to this one module and is **not** a cross-system crosswalk.)

---

## 3. GM-less adjudication mechanism (the crux)

Per in-between turn, mapped onto 01-ARCHITECTURE §7 (the transactional pipeline):

```
1 PARSE   (LLM, non-authoritative) → {intent, approach, scope, tags}. No outcome, no effect, no magnitude.
2 ROUTE   (kernel)  → jurisdiction match. Spine is the priority-floor catch-all; can never exclusive-collide.
3 DEGREE  (kernel)  → seeded tape draw through the move-set's dice_profile (FU d6 ladder | PbtA 2d6),
                      normalized to an internal band+valence enum (INTERNAL to this module only).
4 SELECT  (kernel)  → from the move-set's shipped static menu, filter by {band} + boolean fact
                      predicates (requires/forbids) + cost cap + anti-repetition window; sort by id;
                      weighted-pick off the tape; GUARANTEED per-band fallback. ← replaces any LLM "propose"
5 EXECUTE (kernel)  → returns worldEvents (facts only), sets_facts, clock_ticks, native_delta,
                      and a render_payload {band, valence, labels, render_hints}.
6 COMMIT  (kernel)  → validate delta (Zod, fact-write perms, no-crosswalk guard, invariants);
                      atomically commit; record event + prior/next state hashes + tape draws.
7 RENDER  (LLM)     → prose over COMMITTED facts only, behind the 4-gate firewall (§3.4).
8 FAIL    (kernel)  → on a render-gate violation, bounded typed-feedback regen (2–3, temp drops);
                      on exhaustion, emit the move's authored render_hint / template string.
                      Regen RE-RENDERS the same committed state — it NEVER re-rolls (replay-safe).
```

**Why SELECT is the kernel's, not the LLM's:** the move-set *is* the closed possibility space (Sicart's "rules"); the kernel's tape-driven pick *is* the single mechanic (Sicart's "mechanic," and the kernel is the sole agent of mechanics). If the LLM picked — even from a kernel-approved envelope — the committed outcome would depend on model sampling, breaking exact replay (01-ARCHITECTURE §6) and re-crossing the line LOOM drew. So we keep the propose/validate/commit *discipline* and **delete the LLM "propose" step.**

### 3.1 `move` / `move-set` data shape (authored offline, content-hashed)

```jsonc
MoveSet = {
  id: "spine.tavern.social",            // jurisdiction-scoped
  dice_profile: "fu-d6" | "pbta-2d6",
  moves: [{
    id: "m.rumor.partial",
    band: "yes-but" | "no-but" | "no" | "no-and" | ... ,   // which ladder rung this fires on
    valence: "cost" | "boon" | "neutral",
    requires: [FactPredicate],          // boolean over canonical facts; NO numbers crosswalked
    forbids:  [FactPredicate],
    cost_tier: 0..3,                     // capped per scene; bounds severity
    weight: number,                      // tape-weighted selection
    world_events: [WorldEvent],          // FACTS only ("rumor_spread", "guard_suspicious")
    clock_ticks:  [{clock, by}],         // spine ticks its OWN clocks; never touches HP/money/position
    render_hints: { labels: [...], fallback_prose: "…" }   // used if RENDER exhausts retries
  }],
  fallback_per_band: { ... }             // guarantees an outcome with zero LLM judgment
}
```

### 3.2 The 4-gate render contract (the firewall, hardened)

Upgrades 01-ARCHITECTURE §8 from pattern-matching high-stakes facts to **closed-world claim extraction**:

- **Gate A — effect legality:** prose references only committed `worldEvents`/`sets_facts` ids.
- **Gate B — affordance grounding:** every entity/property the prose leans on exists in the masked observation and is jurisdiction-permitted.
- **Gate C — fiction firewall (closed-world):** extract candidate state-claims from the prose; each must be entailed by a committed event or an already-true fact; forbidden categories (invented entities, rules, locations, numbers) are rejected regardless of entailment. **Fails closed** on low confidence. *This is the single hardest component and gets its own eval harness.*
- **Gate D — continuity/tone/length lint:** soft-fail allowed.

**Worst case** is blander prose with a correct, already-committed outcome — never wrong state, never a hang.

---

## 4. Module catalog & licensing tiers

Modules are classified on the canonical axes (§5) and tagged with a licensing tier that decides what may ship.

### 4.1 Function-axis taxonomy (the catalog backbone)

Eight functional axes (board-mechanics survey + TTRPG + video-game patterns all slot in):

| Axis | Representative borrowed mechanics |
|---|---|
| **Resolution** | FU d6 ladder · PbtA 2d6 · d20-vs-DC · d100 roll-under · dice-pool count-successes · narrative-symbol dice · card-driven · deterministic compare · CRT tables |
| **Turn / initiative** | spotlight · cyclic-init · simultaneous-reveal · priority-stack · variable phase order · rondel · time-track |
| **Progression** | XP→levels · playbook moves · skill trees (tier/keystone) · point-buy · clocks · legacy/persistent |
| **Economy / resources** | gold · spell slots · meta-currency (fate points/bennies/plot points/momentum) · worker-placement · engine-building · deck/bag-building · survival needs+crafting recipes |
| **Conflict** | attack-defense · opposed · mass-combat (hex/CRT) · social · chase · clock-race · area-control |
| **Spatial** | grid · hex · zones · theater-of-mind · node-map · range-bands · tile-laying · route/network |
| **Information** | perfect · hidden-hand · fog · hidden-roles · deduction · stealth-detection FSM (vision-cone/noise/last-known-position) |
| **Randomness** | seeded dice · cards (depletable) · oracle · deterministic · push-your-luck |

Video-game patterns enter as modules/capabilities: **immersive-sim systemic-interaction** (an *engine ethos*: consistent global rules → emergent multi-solution play), **roguelite meta-progression**, **two-axis reputation/faction** (Fallout Fame/Infamy), **dialogue skill-checks** (Disco-Elysium-style skill+roll vs target).

### 4.2 Licensing tiers (all verified against primary sources — §9)

| Tier | Systems | Permitted use |
|---|---|---|
| 🟢 **Ship faithfully** | D&D 5e SRD (CC-BY-4.0) · Fate Core (CC-BY-3.0 / OGL) · **FU (CC-BY-4.0)** · Blades/Forged-in-the-Dark (CC-BY-3.0) · Old-School Essentials (OGL) · Cairn (CC-BY-SA-4.0) · Into the Odd (Mark-of-the-Odd) · GUMSHOE (OGL + CC-BY-3.0) · BRP-UGE (ORC) | implement rules text faithfully, with the prescribed attribution |
| 🟡 **Open mechanic, caveat** | Year Zero Engine (free license **excludes video games** — use the abstract mechanic, don't claim the grant/brand) · BRP engine open but **Call of Cthulhu** itself proprietary (Miskatonic Repository is supplements-only) | use the uncopyrightable mechanic; no brand/compat claim |
| 🔴 **Clean-room mechanic only** | GURPS · Cortex Prime · Genesys (Foundry license **forbids software/apps**) · Savage Worlds · Risus · PbtA *text* | reimplement the procedure in our own words (mechanics are uncopyrightable); **never** copy text, custom dice, or brand |

> Posture: the 🔴 tier *is* the "be inspired / borrow" path — legally clean because **game mechanics are not copyrightable** (17 U.S.C. §102(b); Copyright Office; *Tetris v. Xio*), only their expression is.

---

## 5. Jurisdiction & hand-off

### 5.1 Module manifest (routing key)

Each module declares a **jurisdiction tuple** `{scales, domains, phases, entity_selectors}` + a typed `(intent_class, guard_predicate)` claim over the kernel's **canonical intent ontology** (a closed vocabulary). It owns named native-state paths and reads named canonical-fact types. Authority is the ownership layer: **each touched axis binds to exactly one owner.**

### 5.2 Hand-off protocol — Author-Armed, Fiction-Triggered, over a Pushdown Stack

1. **Author-arm:** each region/scene declares which specialists are *live*; the engine never auto-arms at runtime; the FU/PbtA spine is the permanent floor and can't be armed away.
2. **Parse → classify:** the LLM maps prose to an intent envelope using only the closed ontology + existing entity ids (unmappable → `UNCLASSIFIED`; confidence may trigger a clarify re-prompt but **never** breaks ties or picks a module).
3. **Match → resolve:** kernel evaluates armed modules' guards over current facts → exactly one claimant dispatches; zero → spine handles it; **two+ exclusive → impossible**, because…
4. **Boot-time collision audit:** if two exclusive modules could claim the same intent in any reachable state, the region **fails to boot**. Runtime collision is unreachable-by-construction; runtime rejection remains as a dead backstop.
5. **Push / run / pop:** a pushdown stack suspends the frame below (its clocks freeze); only the top frame owns the turn; nesting allowed (combat inside heist); a mandatory **terminal set + fuse** guarantees no frame wedges.
6. **Interchange = ludeme triple:** **Players + Equipment** cross the seam as canonical handles; **Rules stay sovereign and never cross.** On pop, the return is a canonical outcome — `world_fact_deltas` (the only authoritative mutation) + terminal label + a `narrative_seed`. The frame below **re-reads mutated facts** — no foreign numbers ever pass (no HP→Stress crosswalk).

PARSE is the *only* non-deterministic step and is quarantined to classification; every state-changing step is pure and replayable.

---

## 6. How the LLM's breadth is the wheelhouse (not a constraint)

- **Offline content generation at scale:** the model authors thousands of move-sets, regions, factions, NPC logic, and lore — each validated by static validators (winnability/fairness proofs, the AdventureForge pattern) and sealed as content-hashed data. This is where "describe every rule set imagined in a century" actually happens.
- **Online rendering:** infinitely varied prose over a fixed, correct mechanical skeleton.
- **Multi-model / multi-disposition playtesting (PROCTOR tie-in):** players *and* critics drawn from different model families, versions, temperatures, and dispositions (happy / hardcore / critic) — all driving the game only through the MCP harness, watchable in the browser, paced by the tamper-proof delay. The variety ceiling from §3 (mechanical outcomes bounded by authored content) is countered by *generating more content offline*, never by loosening live adjudication.

---

## 7. Integration points
- **Kernel (01):** the spine is a module on the same `Rules` resolver seam; SELECT/COMMIT use the existing tape + hashing + event log.
- **PROCTOR (02):** adjudication's determinism is what makes the nonce-chain + wall-clock + replay "realness" oracle meaningful; multi-disposition agents are the playtesters.
- **Structure/roadmap (03):** the spine + GM-less mechanism land in **P1**; jurisdiction + hand-off in **P4–P5**.

## 8. Open decisions (deferred, not blocking)
1. **Band normalization granularity** for the spine (FU's 6 rungs vs a coarser 3-band cost/neutral/boon) — affects move-set authoring volume.
2. **Clarify-reprompt budget** on `UNCLASSIFIED` parses before falling to the spine.
3. **First specialist module** to prove the hand-off (recommend a 🟢 combat subsystem — 5e SRD or Into-the-Odd damage — at `scale:character, domain:combat`).
4. Whether YZE's survival subsystem is worth a clean-room reimplementation given its video-game license exclusion.

## 9. Verified sources (primary)
- FU CC-BY-4.0: perilplanet.com/freeform-universal · the classic-rules PDF license string.
- PbtA policy + 2023 SRD: apocalypse-world.com/pbta/policy · lumpley.games.
- Fate licensing (CC-BY-3.0 / OGL): fate-srd.com/official-licensing-fate.
- D&D SRD 5.2 CC-BY-4.0 (5.1 dual OGL): dndbeyond.com/srd · media.wizards.com SRD-OGL_V5.1.
- Blades/FitD CC-BY-3.0: bladesinthedark.com/licensing.
- OSE OGL · Cairn CC-BY-SA-4.0 · Into the Odd Mark-of-the-Odd: necroticgnome.com · cairnrpg.com · bastionland.com.
- GUMSHOE OGL + CC-BY-3.0: pelgranepress.com GUMSHOE SRD.
- BRP-UGE ORC (CoC proprietary): chaosium.com/orc-license · /miskatonic-repository.
- YZE free license (excludes video games): freeleaguepublishing.com community licenses.
- Cortex / Genesys / GURPS / Savage Worlds / Risus proprietary: cortexrpg.com · DriveThruRPG Genesys Foundry guidelines · sjgames.com GURPS Lite · shop.peginc.com licensing · risusiverse.com.
- Mechanics uncopyrightable: copyright.gov/register/tx-games · 17 U.S.C. §102(b) · *Tetris Holding v. Xio Interactive* (2012).
- Theory: Sicart "Onto. of Game Mechanics" (rules vs mechanics) · Ludii ludemes · OpenSpiel dimensions · BGG mechanics list.

## 10. Acceptance criteria
1. An in-between turn produces a graded outcome with **zero** LLM mechanical choice; the committed effect is a pure function of `(intent, facts, native-state, tape)`.
2. Re-running a recorded session reproduces identical `resulting_state_hash` values (no dependence on model sampling).
3. A render that asserts an un-committed fact is caught by Gate C and regenerated or replaced by the authored fallback.
4. A region whose armed specialists could exclusive-collide on any reachable intent **fails to boot** (caught by the static audit).
5. No module reads or writes another module's native numbers; only canonical `world_fact_deltas` cross the seam.
6. Every shipped module carries a licensing tier; 🔴-tier modules contain no copied text/dice/brand (clean-room only).
