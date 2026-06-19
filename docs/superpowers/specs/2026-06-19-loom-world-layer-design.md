# LOOM — World Layer (Design Spec)

> ⚠️ **SUPERSEDED IN PLACES — read [v2-reconciliation](2026-06-19-v2-reconciliation.md) first.** P0 demo-blocker: laws use **static author-declared arming** (not runtime "gate specialist arming"). Where this base spec differs, the reconciliation doc + MASTER-BLUEPRINT v2 win.

> **Status:** Design forks approved (§0); draft pending adversarial red-team + user review.
> **Date:** 2026-06-19
> **Companion docs:** [rules-governance spec](2026-06-18-loom-rules-governance-design.md) · [00-REVIEW-FINDINGS](../../../00-REVIEW-FINDINGS.md) · [01-ARCHITECTURE](../../../01-ARCHITECTURE.md) · [02-PROCTOR](../../../02-PROCTOR-MCP-HARNESS.md)
> **Source frame:** `world-feedback-20260619.md` (open-world simulation thesis — adopted structurally).
> **Evidence base:** the mid-2026 capability research (context-rot, multi-agent fragility, deterministic-orchestration, LOD simulation, cost-∝-agents) — citations in the rules spec / run `w7jx7tk12`.

Defines the **world layer**: how the world is represented, simulated, authored at scale, and how the
flagship **Anomaly Zone** pack makes the engine's systems sing. Sits on the LOOM kernel + rules layer
and is played only through PROCTOR.

---

## 0. Decisions locked (from brainstorming)

1. **World-as-data.** The engine is setting-agnostic; a world is a **World Pack** (data conforming to a
   schema derived from the frame's §17 model). **The Anomaly Zone is the *first* pack, not the engine.**
2. **Fully deterministic simulation; the LLM is confined to parse + render.** No live LLM agents drive
   the world. All simulation is deterministic event-driven rules. Emergence is *systemic* (immersive-sim
   style), not improvised. The LLM's breadth lives **offline** (authoring) and **online** only as the
   prose renderer + the thin, quarantined intent-parser.
3. **Flagship setting = the Anomaly Zone** — a bounded region of **lawful** strangeness.

These follow the evidence: context-rot ⇒ compact per-call context; parallel-writer fragility ⇒ single
writer; cost-∝-agents ⇒ no live swarm; self-report-unreliable ⇒ measure via PROCTOR; current frontier
specs unverified ⇒ model-agnostic + graceful degradation.

---

## 1. The World Pack format (generic, setting-agnostic)

A World Pack is sealed, content-hashed data conforming to the schema below (the frame's §17 model,
generalized). **Definitions are immutable; runtime state is separate** (mirrors the kernel's
authored-content vs canonical-world-facts split).

```
WorldPack
  meta { id, title, version, content_hash, schema_version, license_tier }
  graph
    nodes[]        : LocationDefinition   (settlement | district | junction | POI | interior | event-site | mobile)
    edges[]        : RouteDefinition       (typed, weighted; gameplay props beyond distance)
    regions[]      : RegionDefinition       (sensory palette, economy, factions, hazards, language library)
  entities
    npcs[]         : schedules + state machines (NOT live agents)
    factions[]     : territory, interests, logistics, influence layers
  content
    rumor_pools[]  : RumorDefinition        (origin, truth_value, reliability, mutation rules)
    quest_seeds[]  : QuestSeed              (world-condition-triggered; emergent, not catalog)
    encounter_pools[] : EncounterDefinition (contextual: region/route/time/state-gated)
    move_sets[]    : (the rules-layer spine content — FU/PbtA moves, §rules-spec)
    description_libraries[] : region-specific prose fragments (anti-"past some trees")
  laws[]           : LawDefinition          ← Anomaly-Zone-specific; deterministic local rules (see §6)
```

Three world scales (frame §2.1) become the **jurisdiction `scale` axis**: State graph → Regional graph
→ Local graph. A city is one node at state scale and a full subgraph at local scale.

**Modularity guarantee:** the kernel/rules/PROCTOR layers import no pack; a pack imports only the
schema. A new setting (fantasy, off-world) is a new pack, zero engine change.

---

## 2. Deterministic LOD simulation (no live LLM agents)

The whole world is never simulated at full detail. Three **levels of detail**, *all deterministic*:

| Tier | Scope | Mechanism | LLM? |
|---|---|---|---|
| **Active** | player's node + adjacent | full deterministic detail: NPC schedules, encounters, route activity, law effects | render only |
| **Regional** | current region | event-driven cascades (frame §18.2): "route blocked 3 days → clinic shortage → clinic jobs + price rise" | none |
| **Background** | distant regions | a deterministic **event scheduler** advancing coarse state (faction influence, supply, story beats); **resolved into detail on approach** | none |

**Emergence is systemic, not AI-improvised.** Consistent deterministic rules interact to produce
unscripted-feeling outcomes — exactly the immersive-sim model ("emergence is the product of consistent
systems," verified in the research). Factions traverse the *same route graph* as the player (frame
§12.3); securing/closing a route has strategic consequences computed by rules.

**Why deterministic-only is correct here (not a downgrade):** total replayability (PROCTOR's realness
oracle), near-zero runtime LLM cost (parse + render only), immunity to context-rot / parallel-writer /
cost-∝-agents failure modes. **Trade:** no spontaneous live NPC invention (Smallville-style); recovered
~mostly via rich schedules + faction logic + event cascades + a large body of *authored* reactive content.

---

## 3. Offline authoring pipeline (the scale mechanism)

Filling a region (hundreds of nodes) without slop, safely, per the evidence (**single-threaded
writers; read-only parallelism only**):

1. **Stratified authoring** (frame §19): *bespoke* (hubs, key POIs, region-defining questlines) hand-
   curated; *structured* (per-region templated nodes) and *systemic* (jobs, hazards, traveling NPCs)
   LLM-authored offline.
2. **One node, one writer, compact spec.** Each settlement is authored in isolation to the "minimum
   identity package" (frame §3.2) — a small, bounded brief (defeats context-rot). **Writers never run
   as parallel collaborators on shared state** (defeats the multi-agent failure modes).
3. **Read-only critique in parallel** is allowed and encouraged: critic agents (multi-model /
   multi-disposition — happy / hardcore / critic) review a node for distinctiveness, law-consistency,
   and slop — but propose, never write.
4. **Validate → seal → hash.** Every authored node passes the frame's §19.4 validators (disconnected
   nodes, routes with no mode, settlements without rumors, POIs with no discovery method, unreachable
   quest refs, low density, repetition, identity-hook missing) **plus** law-consistency checks (§6).
   Output is content-hashed and immutable.

This is where the LLM's "describe a century of rule systems / fill a state" superpower is realized —
fenced into offline, validated, sealed generation.

---

## 4. Knowledge & navigation (now also a performance necessity)

The frame's knowledge model *is* the engine's observation-masking — and context-rot makes it mandatory
for performance, not just immersion:

- **Knowledge stages** (frame §1.2: Unknown→Referenced→Approximately-located→Mapped→Visited→Surveyed→
  Transformed) gate what the renderer is even shown. Each LLM render call receives a **compact, masked
  slice** scoped to what the player knows + the active node — never the world graph.
- **Lead journal, not quest menu** (frame §4.3): records information with source + reliability; no
  omniscient objective markers.
- **Scoped reputation** (frame §12.2): per-NPC / settlement / faction / region — never one global number.

---

## 5. Rules-layer integration

- **Nodes & routes arm jurisdictions.** A quiet county road arms only the **FU/PbtA spine** (travel
  beats = FU rolls, §rules-spec); a checkpoint arms a social/negotiation specialist; an ambush arms a
  combat specialist; a Zone-anomaly site arms a survival/anomaly specialist. Boot-time collision audit
  guarantees no two specialists fight over one intent (§rules-spec §5).
- **Encounters = spine-governed in-between moments** (frame §8: signal→decision→outcome→**residue**);
  the residue is a committed **world-fact** that propagates through the same graph (frame §1.5, §7.3).
- **Quests emerge from world facts.** A `route_closed` fact + a `clinic_low_supply` fact ⇒ the spine's
  move-set surfaces delivery/escort work (frame §11.5). No quest catalog.
- **Laws are deterministic world-facts** (§6) that gate routes, encounters, and specialist arming.

---

## 6. Flagship pack: **THE HUSH** (Anomaly Zone) — *working title*

**Premise.** After an unexplained event (**"the Settling"**), a bounded inland region became a place
where physics and causality are **locally negotiable — but lawfully so.** The outside world has thrown
a quarantine **Cordon** around it. People still live inside (Holdouts); others go in to map it, strip
it, or worship it.

**The core principle — Lawful Anomaly.** Every anomaly is a **deterministic local rule** with discoverable
triggers and effects:
```
LawDefinition { id, region/route scope, trigger (time/condition/action), effect (on movement/items/
                state/perception), tells (how it's noticed), discovery_methods, interactions[] }
```
Examples: *"On the Mile Road, looking back doubles the distance behind you."* *"In the Greywater bottoms
after dark, worked metal slumps back to ore."* *"At the Antenna Field, spoken names are heard a mile off."*

This makes the engine's systems **core, not decoration**:
- **Knowledge-is-survival:** the knowledge stages (§4) become the primary progression — you survive by
  learning laws; rumors about laws are unreliable (a wrong law gets you killed).
- **Routes change state lawfully** (frame §7.3): a road is passable only under the right conditions; the
  Zone *rewrites edges* by rule, deterministically.
- **Emergence is systemic + replayable:** laws compose (two laws on one route create a solvable puzzle);
  no randomness, fully deterministic, watchable.
- **AI-authorable depth, disciplined:** offline authoring generates a large *taxonomy of lawful anomalies*
  + lore, each validated for consistency — endless strangeness that never contradicts itself.

**Factions (geographic, frame §12):**
- **The Survey** — cartographers of the laws (knowledge faction; sells/withholds law-maps).
- **Salvagers / "Striders"** — extract anomalous materials (economy faction; the black market).
- **The Cordon** — quarantine authority (control faction; checkpoints, restricted routes).
- **The Changed / a cult** — altered by or devoted to the Zone (wildcard faction).
- **Holdouts** — settlements of people who stayed (civilian texture; local economies + tensions).

**Regional identity** (frame §10): the Hush gets its own design bible — sensory palette (silence, wrong
light, hush), law-families per sub-region, route conditions, rumor themes, encounter families.

---

## 7. The DEMO vertical slice — **"The Cordon's Edge"** (the MGS-Ground-Zeroes bar)

A small, dense pocket just inside the Cordon — the equivalent of the frame's Mohawk Valley slice, but in
the Hush. **Scope:** the Cordon checkpoint + waystation (start), 2–3 Holdout settlements, ~10–15 route
segments, ~10–20 POIs, **3 lawful anomalies**, 2 factions (Cordon + Survey or Salvagers), ~30 rumors, a
broad encounter pool, ≥1 route whose condition changes, persistent aftermath.

**The addictive loop (10 minutes → 2 hours → 25 replays):**
> Arrive at the waystation broke and under-informed → overhear a **rumor of a law** ("don't take the
> Mile Road looking back") → test it on a real route → discover an anomalous POI the law guards →
> consequence propagates (a Holdout's supply, a faction's reach) → choose: exploit, expose, help, leave.

It earns replay because **the laws are the puzzle** — each run you can learn them in a different order,
exploit them differently, side with a different faction, and the immersive-sim "many solutions" property
means one situation has multiple law-based approaches. The §22 acceptance list (frame) + "someone spends
2 hours in a 10-minute slice" is the bar.

---

## 8. PROCTOR integration
Deterministic simulation makes every demo session **replayable and watchable** (nonce-chain + wall-clock
+ replay realness oracle, §02). Playtesting uses **multi-model / multi-disposition** agents (the
read-only-parallel pattern the evidence endorses) as both **players** (happy / hardcore / critic
personas, driving only via MCP, paced by the tamper-proof delay) and **offline critics** (§3.3).

## 9. Open decisions (deferred, not blocking)
1. Hush naming + tone calibration (how overtly "weird" vs grounded-eerie).
2. Which 3 laws anchor the demo slice (need to be teachable in 10 min, composable, lethal-if-misread).
3. Which 2 factions for the slice (Cordon + Survey recommended for the knowledge-as-power loop).
4. Law authoring schema details + the law-consistency validator's rules.
5. Background scheduler tick granularity (game-time vs event-count).

## 10. Acceptance criteria
1. The engine runs the Hush pack with **zero engine code specific to the Hush** (pure World Pack data).
2. A demo session is **bit-reproducible** on replay (deterministic sim; only parse is non-deterministic
   and is recorded).
3. Each LLM render call receives a **compact masked slice** (knowledge-scoped), never the full graph.
4. Hundreds of nodes can be authored offline, each validated + sealed, with **no parallel-writer** step.
5. The "Cordon's Edge" slice satisfies the frame §22 list + demonstrates ≥3 law-based solution paths to
   one situation (immersive-sim emergence), deterministically.
6. Laws behave identically every run (deterministic world-facts); a misread law has consistent lethal/
   costly consequences.
