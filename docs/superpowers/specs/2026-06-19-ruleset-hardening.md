# LOOM — Rule-Set Hardening (red-team resolutions)

> **Status:** Resolutions to the rule-set red-team (run `weis4tokb`, verdict: *needs-work, not build-ready*;
> 6 kill-shots). Amends [ruleset-concrete](2026-06-19-loom-ruleset-concrete.md); folded to v2 on build.
> **Root cause:** the design counted *modules* as solution axes and waved two hot state-slices (time,
> travel) away as "not modules," while pinning the engine's central guarantee (orthogonality + provable
> solvability) on a predicate that was never made decidable. The fixes pin the grammar to **effect**,
> make interaction **total at the category level**, and give time + travel real owners.

## Kill-shots → resolutions

| # | Kill-shot | Resolution (adopted) |
|---|---|---|
| K1 | **Determinism vs. emergence is a contradiction**: "coherence pass proves solvability over *declared* composition edges" + "unscripted combinations multiply" can't both hold — anything not pre-declared falls through to the spine d6 (a random oracle), the textbook tell of a dressed-up branch set. | Define **deterministic DEFAULT interactions at the grammar-CATEGORY level** — a *total* category×category interaction matrix (how a topology-effect composes with a perception-effect, etc.). Unscripted combos resolve deterministically with no per-law edge. The coherence pass proves the **matrix is total**, not that every concrete combo was enumerated. **The spine d6 decides narrative *color* only — never whether a physical solution succeeds.** |
| K2 | **Coherence pass undecidable**: "a law modifies exactly one category" never says EFFECT vs TRIGGER, and every anchor law spans both (Mile Road = perception trigger + topology effect). | Pin "exactly one category" to **`effect_category`** only. `trigger_predicate` and an `ambient_gate` (time-window / distance-threshold / orientation) are **category-free**, from published closed vocabularies. A topology law *triggered by* a perception act is still one category. Conflict/orthogonality checks operate **solely on `effect_category`.** |
| K3 | **`fail_safe` "never instakills" is FALSE for the flagship**: Antenna Field only warns, then delegates death to `combat.ito`'s auto-hit — an unsurveyed player dies. | Extend `fail_safe` to **delegated consequences**, enforced as a **checked invariant** in the coherence pass: any law whose effect routes into combat/summoning must guarantee the **first-contact** summoned threat is non-lethal (`combat.ito` clamps Critical Damage to non-fatal on first exposure to an *unsurveyed* law; first "Changed" is a costed warning that cannot kill). |
| K4 | **The demo can't run**: Greywater ("after dark") + Antenna ("the Changed come") have no **time/clock owner**; Mile Road ("looking back" / "behind you") has no **orientation owner**. Both declared "not modules" by fiat. | **Add `time.cycle`** (owns day-night phase + a deterministic event scheduler; `anomaly.hush`'s drift-clock and NPC arrivals become its consumers). **Promote `travel.graph` to a real module** (owns current node, heading/facing, edge cost, route memory); `anomaly.hush` *distorts* it and `invest.gumshoe` *gates* it, but one authority owns the state. (Travel is the hottest state-slice in a dwell world — making it a non-module was the exact ownership-smear the one-slice rule forbids.) |
| K5 | **Composition predicate unsound both ways**: over-bans (same-category laws barred from a route → forbids two topology laws) and under-checks (cross-category waved through on disjointness → misses the Mile Road × Antenna coupling that is the design's *own* showcase). | Redefine: (a) **same-category** laws may share a route unless their effects **operationally contradict** (assign incompatible values to the same state var); (b) **cross-category** pairs must pass a **quantitative-coupling check** (does A's effect change a parameter B reads?). Mile Road × Antenna passes via coupling: doubled distance → longer exposure window → more Changed. |
| K6 | **Two ship-blocking licensing wrong-tiers** for a commercial product. | (1) **GUMSHOE: commit to the CC-BY-3.0 SRD only; bar the OGL 1.0a version** (avoids the contested WotC OGL chain); credit **Hite & Kulp** (CC edition), not the OGL-version authors. (2) **`combat.ito`: source from Into the Odd's "Mark of the Odd" (attribution, NO ShareAlike) OR clean-room the uncopyrightable mechanic (auto-hit, damage-first, STR-save) with ZERO Cairn text.** Drop the combined "Into the Odd / Cairn CC-BY-SA" label — **CC-BY-SA copyleft can contaminate the proprietary kernel.** |

## Corrected module roster (net changes)

- **+ `time.cycle`** (new, P0) — day-night phase + deterministic scheduler. Owner of "after dark," arrivals, drift cadence.
- **+ `travel.graph`** (new, P0) — graph traversal + **facing/orientation** + route memory. Owner of "behind you."
- **`combat.ito` → reframed as a FAIL-STATE / pressure module**, not a solution axis. Avoiding combat is the *payoff* of the other axes. Re-sourced per K6 (Mark-of-the-Odd / clean-room, no SA).
- **`invest.gumshoe`, `econ.salvage`, `survival.exposure` → labeled ACQUISITION layers** (different ways to obtain the same knowledge-key), not parallel solution axes. (Re-tag GUMSHOE to CC-BY-3.0-only per K6.)
- **Demo trim (P2):** cut `econ.salvage` + `survival.exposure` from the *demo* build (keep as full-engine modules); "buy coordinates" becomes a `social.fate` info-option. **Demo's 3 honest paths:** anomaly-timing (`anomaly.hush` + `time.cycle`), stealth (`stealth.detection`), social-bribe/deduce (`social.fate` + `invest.gumshoe`).

## Corrected Law Grammar

- `effect_category` ∈ **6** categories: topology · material · causality · perception · agency · **summon/agency-spawn** (new — Antenna Field is *summon* with a *perception tell*; classify by **consequence**, not tell). A law may declare a primary + ≤2 secondary effect-categories, evaluated by the conflict machinery, for genuinely cross-domain laws.
- A **total category×category interaction matrix** is the deterministic emergence engine (K1).
- Any law routing into combat declares a `combat_consequence` edge the coherence pass evaluates (K3).

## Fairness invariants (checked in the coherence pass)
- **Delegated-lethality clamp** (K3): first contact with an unsurveyed lethal law (incl. summoned threats) is non-fatal.
- **Pre-demotion drift tell** (P1): every Law Drift event emits a GUMSHOE-acquirable "drift tell" ≥1 observable beat *before* the Surveyed→demoted transition lands, with a codex "confidence-decaying" state — so earned knowledge never silently reverts into a death (reads as the engine cheating otherwise).
- **Drift changes the puzzle, not the checkmark** (P1): drift mutates *which* tells are valid / shifts the trigger intent / alters the window phase, so re-Survey is genuine re-observation, not re-grind.

## Other P1 fixes
- **Combat/spine dispatch rule** (explicit arbitration edge): *intent to harm a creature's body* → `combat.ito`; all other contested actions → spine FU. Resolve thrown-rock/shove/grapple boundaries explicitly.
- **GUMSHOE in-play mastery** (P2→adopt): auto-acquire raw *tells*, but gate the final **Surveyed** stage / safe-use behind a deductive **assembly spend that can be done wrong**; general-ability pool spends are consequential (open faster windows, cut fail-safe cost), not cosmetic.
- **Licensing manifest** (P1): one CREDITS/LICENSES file with exact per-module notice text + license+version + link + an **"indication of changes"** statement (required by CC-BY-4.0 / ORC). Clean-room one-paragraph specs for the YZE supply-die and the stealth FSM (abstract mechanic only, no SRD text/trademarks). **Pin FU to "Classic (2020 update)"; exclude the copyrighted FU 2e beta.**

## Honesty reframe (the headline correction)
The multiplicity engine is **"when N laws of distinct `effect_category` bear on one scene, you get N independent, deterministic solution axes"** — *not* "8 modules multiply." Demo 3's topology/material/perception trio is the honest, working proof. This is a *stronger* claim because it's true and provable; the module count was marketing.

## Updated acceptance criteria (replacing/added to §7 of the base spec)
1. The category×category interaction matrix is **total** (every pair has a deterministic default); no physical-solution success is ever decided by the spine d6.
2. Every law declares exactly one `effect_category`; conflict/coherence checks run on `effect_category` only and **terminate** (decidable).
3. Coherence pass proves, as checked invariants: delegated-lethality clamp, pre-demotion drift tell, non-lethal learnability to Surveyed, and ≥1 quantitative-coupling composition among the demo laws.
4. The demo runs on `{spine, anomaly.hush, time.cycle, travel.graph, invest.gumshoe, stealth.detection, social.fate, combat.ito}` and demonstrates ≥3 *genuinely independent* paths (distinct `effect_category` axes), each deterministic.
5. No module's license forces copyleft onto the kernel; every borrow has an exact attribution + indication-of-changes notice; GUMSHOE is CC-BY-3.0-only; `combat.ito` carries no Cairn SA text.
