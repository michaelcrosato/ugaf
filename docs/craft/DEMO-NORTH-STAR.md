# The Hush — Demo North-Star (vertical-slice & engagement design)

> **What this is.** A steering document the self-improvement **flywheel** reads every cycle to build and
> sharpen the ~10-minute demo of The Hush — *The Cordon's Edge*. It is the **complement** to
> [`IF-CRAFT-RESEARCH.md`](./IF-CRAFT-RESEARCH.md): that doc governs *how the game is crafted at all*
> (world / prose / law authoring, the parser); **this** doc covers *how the first ten minutes hook a player
> and the next ten hours keep them*. Where a rule here would restate a sibling rule, it **cites it by number**
> (`IF-CRAFT Rule N`) instead of repeating it.

## Provenance & honesty

Produced 2026-06-19 by a deep-research web pass (5 angles → 23 sources) plus an adversarial re-verification
pass, then reviewed against the actual `content/hush/` build. **Both verification passes were partially
rate-limited**, so treat confidence labels as *indicative, not earned*:

- **Most findings are single-source craft writing** — experienced designers' considered opinion, re-verified
  for *survival* (it wasn't refuted), **not** promoted to empirical fact about deterministic single-player
  text games. The medium-specific evidence base is thin; these are **hypotheses to test against Loop B**.
- **One finding cleared both passes cleanly** — the parser-as-deliberate-tradeoff finding (Emily Short, 2010).
  It is still a single craft essay, just the best-supported one here.
- **One candidate was killed:** the "variable-ratio reward / dopamine compulsion-loop" claim
  ([Compulsion loop](https://en.wikipedia.org/wiki/Compulsion_loop)) was refuted 2/3 on re-verification — it
  is live-service / RNG craft that does **not** transfer to a deterministic, no-RNG game. We do not chase it.
- **As-built invariants are a different category.** A handful of rules below rest on things *enforced in code
  and the gate* (the `failSafe.firstContact` discipline, the engine/narrator firewall, the coherence pass).
  Those are marked **Enforced (code/CI)** — they are not opinions and not subject to the craft caveat.

**The governing rule:** where any rule here disagrees with a Loop B finding (`feedback/NNNN.md`), the finding
wins. This doc is the prior; playtest data is the evidence.

---

## The north-star in one line

**The Cordon's Edge is finishable in ten minutes and masterable over ten hours.** A first-time player can
carry the core out alive just by reading the tells the world hands them; a returning player keeps coming back
because each run their *model of the hidden physics* gets sharper — same seed, same Hush, but a better-informed
*you*, choosing a faster, cleaner, more elegant line to the core. The demo is the MGS2-tanker / Ground Zeroes
promise in prose: a complete, self-contained slice that **teaches the whole game by being played**.

---

## Directly-applicable rules for the demo area

Each rule is imperative, tied to a real Cordon's Edge mechanic by name, and carries `(basis; confidence)`.

### (a) The engagement loop — what actually makes "one more run"

1. **Ground the "one more run" pull in the deduction *click*, not in reward-scheduling.** The medium-appropriate
   driver is the moment a law resolves: every probe of a law (`look back` on the Mile Road, `listen` in the
   Greywater, `examine the name-stones` at the Antenna Field) must visibly **confirm or correct** the player's
   model, advancing the `codex` a stage (referenced → approximate → surveyed). That stepwise "I understand it
   now" is the reward. Never return a flat "nothing happens" to a genuine probe of a law.
   *(flow theory, [Game Developer](https://www.gamedeveloper.com/design/the-flow-applied-to-game-design), as a
   weak analogy only — the dwell-time half didn't transfer; **low**, see Open Q1.)*

2. **Difficulty must rise from the player's *choices*, never an engine ramp.** First contact with each live law
   fires its `failSafe.firstContact` (Unsettled / your iron is failing / be quiet now) and never kills; a law
   turns lethal only on a *missed* warning. The stakes climb because the player chose the night ford or carried
   iron — not because difficulty scaled. *(warn-before-kill is **Enforced (code/CI)** via `failSafe`; see
   `IF-CRAFT Rule 6`. The flow-channel framing is **low**.)*

3. **Manufacture per-run novelty from route/order and seed-variance — never RNG.** `same-seed-same-Hush` is
   inviolate. The four sources of legitimate variety, all already built (`content/hush/index.ts`): the **three
   routes** to the core, the **four exits at the Fork**, the **rotating Hollow Dark slot** (`liveLaws` surfaces
   a never-before-seen fourth law on ~half of seeds), and the **three start kits** (broke / pry / light). Lead
   with route/order; treat the authored cross-law coupling (Mile Road × Antenna Field) as the "surprising but
   lawful" layer. *(as-built `seedVariance`; **medium** — built and checkable, but that it *feels* varied is Open Q2.)*

### (b) Mastery & replay depth — the intuitive puzzle

4. **Author each law so the solved rule retroactively illuminates every earlier tell.** The Mile Road's three
   tells — `mile_milepost_reset` (the repeating numeral), `mile_shadow_long`, the `mile_dead_walker` (bootprints
   looping forever) — must snap into one statable rule (*look back and the road behind you doubles*) that makes
   the player re-read all three as having said so all along. The `known.law.mile_road: 'surveyed'` variant
   ("eyes front… never once turning round") is the world re-narrating itself to someone who now *gets it*.
   *(intuitive-puzzle craft, [IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf);
   **medium-low**.)*

5. **Reward re-runs with a better LINE and a better ENDING — not new content.** The replay ladder is already
   encoded in the three win goals (`content/hush/index.ts`): `recover_core` (out by nerve) → `recover_core_bought`
   (the Striders' bought map; Mox "does not forget a debt") → `recover_core_mastery` ("…and the Hush, Read True",
   gated on having `ever_surveyed` both anchor laws). A mastered player walks the core out in a fraction of the
   moves *and* earns the higher ending. This is the Ground Zeroes optimization loop; make sure the fast line is
   real and discoverable, not just theoretically present. *(as-built `goals`; **medium** — the endings are built
   and gate-checked.)*

6. **Make clue-redundancy a *replay* lever: a re-runner should be able to take a different deduction channel each
   run.** The Greywater can be surveyed via `examine the rust-bloom` **or** `listen for the hum` (`minTellsToSurvey: 2`),
   bought as a law-table from **Eun**, or warned of by **Holt** — and those redundant *true* channels also exist
   to out-vote a planted *false* belief (Lyle's `r_grey_false`, "the bottoms eat gold", reliability 0.3). Surfacing
   that the same law has multiple honest paths (and one trap) is what makes a second run feel like a new approach.
   *(redundancy requirement: `IF-CRAFT Rules 8 & 16`; the replay/false-belief framing is the demo-specific add; **medium**.)*

### (c) The demo as a secret tutorial — onboarding disguised as exploration

7. **Hold the slice to its 12 nodes and let confinement force the teaching re-read.** The map
   (Waystation → Checkpoint → Lyle's Rest [+ Survey lean-to, Striders' camp] → Mile Road → Fork → Greywater
   ford/bottoms/pump-house → Antenna Field) is small enough that a player naturally re-visits, re-examines, and
   checks the `codex` — and that silent re-reading *is* the tutorial. Resist adding breadth; depth-per-room is
   the teacher. *([IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf) +
   [Game Developer onboarding](https://www.gamedeveloper.com/design/how-onboarding-should-be-applied-to-tutorials)
   + [GMTK](https://www.youtube.com/watch?v=MMggqenxuZc); **medium** — multi-source craft.)*

8. **Front-load the fairness contract on the Waystation notice wall.** The `firstReveal` map already states the
   three anchor rules in folk form (DON'T LOOK BACK / EATS IRON AFTER DARK / NEVER SAY A NAME), echoed by the
   `notices` examinable. That up-front awareness is what makes every later death the player's *deducible mistake*,
   not an ambush — fairness is awareness, not the absence of failure.
   *([zarf, "Cruelty Revisited"](https://eblong.com/zarf/essays/cruelty-revisited.html); **medium** — strong craft
   consensus, and the warn-before-kill half is Enforced.)*

9. **The demo's job is the *sequencing* of first contacts, not re-deriving warn-before-kill.** (`IF-CRAFT Rules 6 & 7`
   already own warn-before-kill and the Dead Adventurer.) The demo-specific decision is **order**: a first-timer's
   natural path is Mile Road (topology, harmless to probe) → Greywater (where knowledge first *pays*, at dusk) →
   Antennas (where the hazard is a word). Tune that order so the difficulty curve is *felt* inside a ten-minute
   run, each law's `failSafe.firstContact` landing before its lethal version. *(sequencing is the add; **medium**.)*

### (d) IF-specific — parser, prose dread, the narrator/engine split

10. **Treat the parser as a deliberate tradeoff and pay its cost at first contact.** The parser is justified for
    The Hush because players deduce hidden *verbs* (`look back`, `say <name>`, `hide`, `deduce`), not just laws —
    but it implies it understands everything and does not. The opening turns must catch near-misses and surface
    the safe verb set (the README's own `examine · look back · listen · deduce · hide · codex · help`) so a
    newcomer is never silently stuck. (`IF-CRAFT Rules 19 & 20` set the forgiving-parser baseline; this is the
    demo first-contact application.) *([Emily Short, "So Do We Need This Parser Thing Anyway?", 2010](https://emshort.blog/2010/06/07/so-do-we-need-this-parser-thing-anyway/);
    **highest-confidence craft finding here** — cleared both verification passes — but still one designer's essay,
    not empirical.)*

11. **Split the verb space by *safety* to keep onboarding alive without killing the dread.** When redirecting a
    stuck newcomer, volunteer only mundane/universal verbs (examine, listen, go, codex, help); keep the
    dangerous/clever verbs (`look back`, `say <name>`, `wait` in the deep dark) discoverable and **never
    auto-suggested**. The Antenna Field is the sharpest case: there the hazard *is* a verb the player might type
    (`say <name>` → summons the Changed). Surfacing every verb kills the discovery reward; surfacing none strands
    newcomers. *(unresolved tension — Open Q3; **high** on the risk, **low** on the resolution.)*

12. **Dread by concealment — and, uniquely to the parser, by the hidden verb-space itself.** (Concealment pacing
    is `IF-CRAFT Rules 11 & 12`: imply the climax, never describe the Changed in monster detail.) The genuinely
    parser-specific contribution: *not knowing what you are allowed to say* at the antennas is itself a source of
    fear — the empty prompt in a dangerous room is dread, not just a usability cost. Lean into it there.
    *([IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf); **medium-low**.)*

13. **(Inherited invariant — keep it airtight.)** The narrator renders; the engine decides. Laws fire on
    fact-predicates, never on verbs, and prose only reports committed facts. *Demo consequence:* the reactive
    variants (the `possession.pc.salvage_core` lines, the `phase.now` Greywater escalations) are exactly what make
    a re-run *feel* different without breaking determinism — the legitimate engine of Open Q2's "variable feel."
    *(`docs/IMPLEMENTATION.md`; **Enforced (code/CI)** — the firewall seam and the coherence pass.)*

### (e) Scoping the vertical slice

14. **Hold the slice to three always-live laws plus a rotating fourth, across 12 nodes.** `liveLaws.always` is
    `['mile_road','greywater','antenna_field']` — they cover three effect-categories (topology / material /
    summon) and the one authored cross-law coupling, every run. **Hollow Dark** (agency) is the rotating slot,
    present on ~half of seeds as the replay surprise — so design the showcase as *"three core categories
    guaranteed, the fourth as a per-seed surprise,"* never "all four, always." *(as-built
    `seedVariance.liveLaws` + `world.ts` NODES; **the 12-node / 3+1-law scope is the build's working default,
    not a proven optimum** — Open Q4.)*

15. **Guarantee three routes to the core and tune for the ten-minute first clear.** Preserve the three documented
    routes (`r_cache_paths`): **go by day**, **go stripped of metal**, or **buy the safe hour from a Strider
    (Mox)** — note Eun sells *knowledge* (the Greywater law-table), Mox sells the *route* (`objective.cache_route`).
    Preserve, too, the three checkpoint exits when carrying the core (`cordon_checkpoint` `blockedText`): **HIDE**
    past Holt / **lever the wire with un-eaten iron** / **lean on a Striders' debt**. Name the cross-law cost
    explicitly: a player who marched iron through the night Greywater has *spent* the wire-lever exit — the
    Greywater deduction literally pays off (or doesn't) at the gate. A vertical slice must show the whole game's
    shape — deduce, buy, sneak, talk — in one short arc. *(as-built routes/exits; **medium** — built and gate-checked.)*

---

## Applied mapping to The Cordon's Edge

How the rules become concrete choices in `content/hush/`:

- **The intuitive-puzzle "click" (Rules 1, 4) → the Mile Road.** Its three tells must resolve into the one rule
  the `known.law.mile_road: 'surveyed'` variant rewards. This is the flagship "answer illuminates all prior
  clues" beat; the flywheel should confirm a blind PROCTOR persona actually reaches `surveyed` and feels it.

- **Where knowledge starts paying (Rules 2, 9) → the Greywater ford.** `ambientGate: phase ['dusk','night']`
  means a naive straight march lands in the law's teeth at dusk — first contact *warns* ("your worked iron is
  failing"); only a *second* careless night crossing costs the blade. The `phase.now` variants ("minutes, not
  hours" → "every rivet on you is going soft") are pressure the player's own route choice created.

- **The parser-dread tension, sharpest (Rules 10–12) → the Antenna Field.** `trigger: { spokeName: true }`:
  the danger is a thing the player might *type*. The `name_stones` body is the contract; Lyle's lethally-false
  `r_antenna_false` ("say your OWN name and the field spares you") is the trap. Let a newcomer flounder *safely*
  on universal verbs while keeping `say` a discoverable, dreadful choice — do **not** auto-suggest it. Live test
  bed for Open Q3.

- **The replay ladder (Rule 5) → the three endings.** `recover_core` (nerve) vs `recover_core_bought` (Mox's
  debt) vs `recover_core_mastery` ("Read True", gated on `ever_surveyed` both anchor laws) are three *distinct
  moral conclusions* to the same ten-minute arc — the reason to run it again is to climb that ladder.

- **The economy/social/stealth proof-of-whole-game (Rule 15) → the Checkpoint, Survey lean-to, Striders' camp.**
  Eun's law-table (knowledge-key), Mox's safe-hour (route), Holt's true rumors vs. Lyle's mixed ones, and the
  three checkpoint exits demonstrate the slice contains the whole game's verbs — not just the law-deduction core.
  Two of these nodes (`survey_post`, `salvager_camp`) branch off Lyle's Rest, so they're optional depth a curious
  player finds, not forced corridor.

- **The codex as silent tutor (Rule 7) → confinement-forced re-reading.** Because the map is small and loops on
  itself (the Fork's four exits, the wire-cut shortcut), a player naturally re-visits and checks `codex`. The
  flywheel should confirm the knowledge-stage progression reads as *the player learning* — that *is* the onboarding.

---

## Open design questions

Genuine unresolved tensions the build must answer. Each has a **suggested default** to unblock the flywheel now;
revisit when Loop B data lands.

1. **Is there real evidence that flow/engagement theory raises dwell time for deterministic, single-player,
   non-monetized *text* games specifically (vs. the graphical/live-service contexts these sources come from)?**
   *Default:* assume **no** transfer is proven. Engineer for the deduction "click," not for dwell-time; let Loop B
   exit-interviews *report* whether replay desire is real. Dwell is an output to measure, not a target to chase.

2. **How do you make a fixed-seed world feel *variable* run-to-run without breaking `same-seed-same-Hush`?**
   *Default:* **route-first, both.** Lead with route/order variety (three routes, four Fork exits, three start
   kits) and the rotating Hollow Dark slot; treat authored cross-law couplings as the secondary surprise. Never
   add RNG to manufacture novelty.

3. **Which parser-onboarding techniques defuse "the command-prompt-is-a-lie" at first contact without dissolving
   the deduce-the-verbs dread?** (Rules 10–11; the sources do not resolve it.)
   *Default:* **split the verb space by safety** — auto-suggest only mundane verbs to a stuck newcomer; keep
   dangerous/clever verbs discoverable and never volunteered. A/B via Loop B personas (newcomer vs. veteran).

4. **How many laws / nodes is the right vertical-slice scope?**
   *Default:* **three always-live laws + a rotating fourth, across 12 nodes — the current Cordon's Edge.** If Loop B
   clear-times overshoot ten minutes, cut *node count* before cutting a law (laws are the showcase; nodes are
   connective tissue).

---

## Sources & confidence

| Basis | Source | Status |
|---|---|---|
| Engagement = flow channel; every action confirms/corrects the model | [Game Developer — flow](https://www.gamedeveloper.com/design/the-flow-applied-to-game-design) | **Low** craft — graphical-game theory, dwell-time half didn't transfer (Open Q1). |
| The intuitive puzzle; the solved rule illuminates prior clues | [IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf) | **Medium-low** craft — single source. |
| Lawful world via consistency + Chekhov-gun pacing | [IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf) | **Medium** craft — survived re-verification clean. |
| Onboarding disguised as exploration; confinement teaches | [IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf) · [Game Developer](https://www.gamedeveloper.com/design/how-onboarding-should-be-applied-to-tutorials) · [GMTK](https://www.youtube.com/watch?v=MMggqenxuZc) | **Medium** craft — multi-source agreement. |
| First contact is a safe practice space; warn before lethal | [GMTK](https://www.youtube.com/watch?v=MMggqenxuZc) + `README.md` | **Medium** craft; the discipline is **Enforced (code/CI)** via `failSafe`. |
| Parser is a deliberate tradeoff; catch near-misses | [Emily Short, 2010](https://emshort.blog/2010/06/07/so-do-we-need-this-parser-thing-anyway/) | **Highest-confidence craft** — cleared both verification passes; still one essay. |
| Prose dread by concealment; hidden verb-space as dread | [IF Theory Reader](https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf) | **Medium-low** craft — single source. |
| Danger is fair under a contract; fairness = awareness | [zarf, "Cruelty Revisited"](https://eblong.com/zarf/essays/cruelty-revisited.html) | **Medium** craft — strong consensus. |
| Narrator renders / engine decides; laws fire on fact-predicates | `docs/IMPLEMENTATION.md` | **Enforced (code/CI)** — an invariant, not an opinion. |
| Variable-ratio reward / dopamine compulsion loop | [Wikipedia](https://en.wikipedia.org/wiki/Compulsion_loop) | **Rejected** — refuted 2/3; live-service/RNG craft, does not transfer. |

*Two HIGH ratings, for different reasons: the as-built **architecture invariant** (enforced in code/CI) and the
**parser finding** (cleared both verification passes, though still a single craft essay). **Everything else is
single-source craft opinion**, re-verified for survival, not promoted to fact. Hold all of it against Loop B and
let real playtest data overrule any rule here.*
