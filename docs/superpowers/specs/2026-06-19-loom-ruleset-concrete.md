# LOOM — Concrete Rule Set (engine modules · the Law Grammar · the demo)

> ⚠️ **SUPERSEDED IN PLACES — read [v2-reconciliation](2026-06-19-v2-reconciliation.md) first.** P0 demo-blocker: **`time.cycle` + `travel.graph` are real modules** ("travel is not a module" below is wrong); law grammar pins to `effect_category`; "modules multiply" → "N effect-categories → N axes". Where this base spec differs, the reconciliation doc + MASTER-BLUEPRINT v2 win.

> **Status:** Design draft; pending adversarial red-team + user review.
> **Date:** 2026-06-19
> **Why now:** with the world concrete (graph, the Hush, factions, knowledge stages, the Cordon's Edge
> demo), we can name the *actual intact modules* the engine ships — and close the world red-team's two
> P0 gaps: the **Law Grammar** and the **orthogonal systems that make "many solutions" real.**
> **Companions:** [rules-governance](2026-06-18-loom-rules-governance-design.md) · [world-layer](2026-06-19-loom-world-layer-design.md) · [redteam-hardening](2026-06-19-redteam-hardening.md)
> **Licensing tiers** are from the verified catalog (runs `wf_c8775456`, `wf_cb2b4616`). 🟢 ship faithfully · 🟡 mechanic-only-caveat · 🔴 clean-room only.

---

## 1. The module roster (the intact rule set)

Each module is an *intact* borrow (faithful to a real system or an uncopyrightable pattern), owns one
native-state slice, and **arms by static author-declared conditions** (never auto-armed at runtime).

| Module | Borrowed from | Tier | Domain | Owns (native state) | Arms when… |
|---|---|---|---|---|---|
| `spine.fu-pbta` | Freeform Universal + PbtA move-pattern | 🟢 FU CC-BY-4.0 | narrative (catch-all floor) | move-history, last-band | always (lowest priority) |
| `anomaly.hush` | bespoke (the Hush's "physics") | n/a (original) | anomaly | active laws, law-codex, drift-clock | a `LawDefinition` declares this node/route in scope |
| `invest.gumshoe` | GUMSHOE | 🟢 OGL + CC-BY-3.0 | investigation | clue pools, deduction state, the **law-codex** | the player examines/gathers (the learning loop) |
| `survival.exposure` | Year-Zero supply/condition idea + survival-needs pattern | 🟡 YZE license excludes video games → **clean-room** the supply-die + condition-stack | survival | exposure, supply, condition stack | always-on in the Zone (passive ticks) |
| `stealth.detection` | video-game detection FSM (uncopyrightable) | 🟢 pattern | stealth | per-NPC awareness FSM (unaware→suspicious→searching→alert), last-known-pos | a hostile/patrol entity can perceive the player |
| `social.fate` | Fate aspects/create-advantage + two-axis reputation (Fallout pattern) | 🟢 Fate CC-BY-3.0 | social | scoped reputation (per-NPC/faction/region), aspects | a social contest is declared (parley, bribe, intimidate) |
| `combat.ito` | Into the Odd / Cairn (auto-hit, damage-first, STR-save crit) | 🟢 Mark-of-the-Odd / CC-BY-SA-4.0 | combat | HP, wounds, conditions | violence is joined (fast, lethal-but-fair; fits text + the recovery model) |
| `econ.salvage` | encumbrance + commodity-market (BGG patterns) + the Survey's law-map trade | 🟢 pattern | economy | inventory, encumbrance, prices, debt | a trade/carry/haul action |

**Notes & faithful-source discipline.** Travel itself is **not** a separate module — it's the world
graph + knowledge stages, with travel beats governed by `spine.fu-pbta` and *distorted by* `anomaly.hush`.
Combat is **Into-the-Odd-style on purpose**: no to-hit roll (attacks deal damage; a STR save resists
*Critical Damage*) — minimal rolls, deadly but fair, and it renders cleanly as prose. `survival.exposure`
is clean-room because the **Year Zero license excludes video games** (verified) — we borrow the *idea*
(supply-die depletion, stacking conditions) implemented in our own deterministic rules, claiming no YZE
compatibility or brand.

---

## 2. The orthogonal-systems principle (how "many solutions" becomes real)

The world red-team's load-bearing critique: *laws + 2 factions isn't enough system surface for genuine
immersive-sim multiplicity — you get "use law A vs law B," a branch, not emergence.* The fix is that the
modules above are **orthogonal** — each independently engages a situation, and they **multiply**:

> **Worked example — reaching a guarded anomalous cache:**
> - `anomaly.hush` — find/time a route the law makes passable (cross the Mile Road *without looking back*).
> - `stealth.detection` — slip the Cordon patrol's vision cone instead.
> - `social.fate` — bribe a Salvager for a law-map, or parley the Holdout gatekeeper.
> - `invest.gumshoe` — deduce the cache's safe window from environmental *tells* before going in.
> - `survival.exposure` — wait for daylight (costs supply) so the dark-triggered law never fires.
> - `econ.salvage` — trade an anomalous item to a Survey factor for the coordinates outright.
>
> Six intact systems → six *independent* approaches, and their **combinations** (deduce the window *and*
> go silent *and* carry non-metal tools) are unscripted third options the author never paired. That is
> "problems, not puzzles." Determinism is preserved — every system resolves off the seeded tape.

---

## 3. The Law Grammar + `LawDefinition` schema (world red-team P0 #3)

A law may modify **exactly one** category from a **closed grammar** (this is what keeps lawful anomalies
*lawful*, machine-checkable, and composable — not free-form weirdness):

| Grammar category | A law in this category may alter… | Demo example |
|---|---|---|
| **topology/distance** | route adjacency, distance, passability | "looking back doubles the distance behind you" |
| **material/state** | item/matter properties | "worked metal slumps to ore after dark" |
| **causality/time** | ordering, timers, repetition | "the hour before dawn repeats once" |
| **perception/information** | what is observable / how far | "a spoken name is heard a mile off" |
| **agency/body** | what an actor may physically do | "you cannot run while watched" |

```jsonc
LawDefinition {
  id, scope: { region|route|node, condition },          // WHERE/WHEN it's in force
  grammar: "topology|material|causality|perception|agency",   // exactly one (validator-enforced)
  trigger: GuardPredicate,        // over GENERIC physical-intents (look_back, carry_metal, speak_aloud,
                                  //   cross_threshold…) + facts + time — never law-specific verbs (P0 #4)
  effect: DeterministicTransform, // pure fn over (state, tape) owned by anomaly.hush
  tells: [TellRef],               // GUMSHOE-style clues, drawn from a FIXED tell-library (stable cue, P1)
  discovery: { to_surveyed_via: [...non-lethal observation...] },   // learnability gate (P0 fairness)
  fail_safe: FirstContactRule,    // first brush warns/costs, never instakills (P1)
  interactions: [LawId],          // declared composition edges (validated > 0 for the demo, P1)
  drift: DriftPolicy              // seeded re-Settling schedule (renews mystery / preserves dread)
}
```
**Composition rule:** two laws may share a route/condition only if their grammar categories are
non-conflicting (e.g. topology + perception compose; two topology laws on one edge must declare
precedence). The global **coherence pass** proves: every lethal law is learnable-to-Surveyed
non-lethally before it can kill, no contradictory rumors, and the law-interaction graph has the
authored cross-law edges.

---

## 4. Investigation *is* the learning engine (the on-theme, on-license keystone)

The pitch is "a survival game whose character sheet is a growing, fallible map of physical laws." That
is **literally GUMSHOE**, repointed from mysteries to *physics*:

- A law's **tells** are GUMSHOE **core clues**: if you have the relevant investigative ability and you
  look, you *automatically* learn a tell (no roll, no failed-investigation dead end — exactly GUMSHOE's
  signature, and it keeps the learning loop frustration-free).
- Assembling enough tells advances a law through the **knowledge stages** (Referenced → Approximately →
  …→ **Surveyed**) — at which point it's safely usable. The **law-codex** is the character sheet.
- **General-ability spends** (GUMSHOE's depleting pools) buy edges under pressure (a faster read, a
  safe-window confirmation) — the resource tension.
- **Law Drift** periodically demotes some Surveyed laws back to Referenced → the codex is *fallible*,
  mystery refreshes, dread survives mastery. GUMSHOE is 🟢 open (OGL + CC-BY-3.0), so this ships faithfully.

This makes `invest.gumshoe` the spine of progression, `anomaly.hush` the environmental physics it reads,
and the two compose into the core loop: **observe tells → deduce the law → exploit it (many ways) →
drift invalidates → re-learn.**

---

## 5. The Cordon's Edge demo — concrete rule set

**Armed modules:** `spine.fu-pbta` (floor) + `anomaly.hush` + `invest.gumshoe` + `survival.exposure`
(passive) everywhere; `stealth.detection` armed on Cordon-patrolled routes; `social.fate` armed in
Holdouts + at Survey/Salvager contacts; `combat.ito` armed only where violence is reachable;
`econ.salvage` at markets/contacts.

**The 3 anchor laws** (teachable in ~10 min, composable, lethal-but-fail-safe):
1. **The Mile Road** (topology) — *looking back doubles the distance behind you.* Tells: the milepost
   count resets; your shadow lengthens wrongly. Fail-safe: first look-back loses time + adds *Unsettled*.
2. **The Greywater** (material) — *after dark, worked metal slumps toward ore; iron tools/blades fail.*
   Tells: rust-bloom on rivets, a low hum. Interacts with `combat.ito` (no blades) + `econ.salvage`.
3. **The Antenna Field** (perception) — *a spoken name is heard a mile off, and the Changed come.*
   Tells: the field hums when you speak. Interacts with `stealth.detection` + `social.fate`.

**Composition (the authored cross-law edges):** Mile Road (distance) × Antenna Field (sound) → calling
for help on the road near the field *doubles your exposure window*. Greywater (metal) × combat → steel
is a trap after dark.

**Many-solutions check (demo must demonstrate ≥3 paths to one situation):** reaching the Greywater
cache → (a) cross at *daylight* so the metal-law sleeps (survival cost); (b) go in with *non-metal*
gear deduced from tells (investigation + economy); (c) buy the safe-window from a Salvager (social +
economy). All deterministic, all off the seeded tape.

## 6. Open / deferred
1. `survival.exposure` final form (clean-room supply-die vs BRP-UGE percentile conditions, both open).
2. Whether `combat.ito` (Into-the-Odd, minimal) vs a 5e-SRD tactical option is the demo default
   (recommend Into-the-Odd for text pacing + the recovery model).
3. The GUMSHOE general-ability pool list for the Zone (which abilities exist).
4. Exact tell-library entries for the 3 laws (the stable-signifier P1 fix).

## 7. Acceptance criteria
1. Every shipped module names its source + tier; 🔴/🟡 modules contain no copied text/dice/brand.
2. Each module owns a disjoint native-state slice; only canonical world-facts cross seams.
3. The demo demonstrates ≥3 independent, deterministic solution paths to one situation (§5).
4. Every demo law is learnable-to-Surveyed non-lethally before it can kill (coherence pass); a misread
   law is costly-with-recovery, never an instakill (fail-safe).
5. Laws validate against the closed grammar (exactly one category each) + declare ≥1 composition edge.
6. The learning loop (tells → deduce → exploit → drift → re-learn) runs entirely on `invest.gumshoe` +
   `anomaly.hush`, deterministically, with the LLM rendering only.
