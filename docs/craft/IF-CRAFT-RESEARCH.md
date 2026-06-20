# The Hush — Craft Research Synthesis (authoring reference)

> Sourced craft guide that drives world/prose/law authoring (M5) and the parser/narrator (M6).
> Produced by a fan-out research pass over IF prose, hidden-rule discovery, immersive-sim emergence,
> parser design, replayability, and eerie-but-lawful atmosphere. Use the **Top 20** as the authoring checklist.

## Top 20 directly-applicable design rules for The Hush

1. **Knowledge is the only key.** Every "lock" is a law the player doesn't yet understand; the world is
   solvable from minute one. No item/stat gates. (Outer Wilds / metroidbrainia)
2. **Define laws at the property/class level** ("anything cold," "anything that emits sound"), never
   per-room scripting, so a few deterministic rules generalize and combine. (Harvey Smith)
3. **Differentiate laws/tools orthogonally** — each adds an independent verb/axis, not a stronger variant.
4. **Problems, not puzzles, with recovery.** Multiple lawful solutions; a botched approach always leaves a
   path back to play; never punish/moralize a choice. (Spector)
5. **Make every law's state perceivable** — a prose "light gem": an observable tell that lets the player
   reason about and predict the rule, else emergence reads as randomness. (Thief)
6. **Warn before you kill.** Every hazard emits ≥1 observable tell (visual/sound/smell/touch/taste) before
   it can be lethal; death follows a *missed* warning, never an unforeseeable instakill. (Korsaro)
7. **Use the "Dead Adventurer."** Show a prior victim/aftermath to demonstrate a law's lethality so the
   player learns it without dying to it.
8. **Telegraph through redundant channels** (prose + a sound-word + a smell) so warnings read under split
   attention.
9. **Wrong but lawful is the whole aesthetic.** The anomaly obeys consistent rules "from the outside" —
   wrong ontologically, not morally — and is indifferent, not malevolent. (Fisher; Roadside Picnic)
10. **Establish a strict baseline, then violate it legibly.** A repetitive "lawful" norm makes each anomaly
    read as a rule-break; rigid structure makes the surreal land. (Control; VanderMeer)
11. **Pace dread as unease → dread via glimpses and tremors** — accumulation not assault; imply more than
    illustrate; show the anomaly only through its effects.
12. **Few particular details, deeply examinable.** Build rooms from a small number of very specific sensory
    details; every notable noun is a real object; reveal richness through EXAMINE/LISTEN, not wall-of-text.
13. **Reactive prose at scale (micro-reactivity).** Track tiny player choices and echo them later, even
    mechanically "meaningless" ones, so the world feels like it's paying attention.
14. **Vary text on revisit and by state** with conditional fragments + cycling ambient lines; gate dramatic
    reveals on first-visit flags.
15. **Teach laws without tutorials.** Order encounters so players *induce* the grammar; use diegetic,
    partly-unreadable in-world documents; calibrate ambiguity by stakes. (The Witness; Tunic)
16. **Build a tester that proves deduction without enabling guessing** — confirm laws in batches
    (rule-of-three) and give multiple independent clue-paths to each law. (Obra Dinn)
17. **The codex is fallible and drift can silently invalidate it.** Present it as untrustworthy guidance
    with visible confidence states; keeps deduction alive past first mastery.
18. **Drift = Koster's "noise."** Re-open the learning curve exactly when mastery would end the fun; lean on
    uncanny repetition/doubles to make drift feel ominous, not arbitrary.
19. **Forgiving parser, "Polite or better."** Generous synonyms, state-gated understanding, "does the player
    mean…" ranking, enriched disambiguation, OOPS correction, auto-rewrite near-misses, anchored pronouns —
    never stuck/dead without it being obvious. (Nelson; Plotkin)
20. **Surface affordances without breaking immersion.** Highlight interactive nouns; let bare-noun input do
    the obvious thing; keep free typing for experts; treat *when* to reveal a verb as a narrative-timing
    decision (surprise-discovery is itself a reward).

## Applied mapping to LOOM systems

- Rules 1/15/16/17 → `invest.gumshoe` + the law codex (knowledge stages; batched deduction; fallible codex).
- Rules 2/3/4/5 → the law grammar (effect-categories) + the category×category interaction matrix.
- Rules 6/7/8 → `fail_safe` first-contact + the delegated-lethality clamp + tell libraries (redundant channels).
- Rules 9/10/11 → The Hush regional design bible (strict sensory baseline; lawful violations; indifference).
- Rules 12/13/14 → the reactive variant renderer (when-gated fragments, cycling ambients, first-visit flags).
- Rule 18 → Law Drift + pre-demotion drift tell.
- Rules 19/20 → the deterministic parser (synonyms, disambiguation, OOPS, affordance surfacing) + K8.

*(Full sourced section-by-section guide retained in the research transcript; URLs inline there. Quotes flagged
secondary where the agent could not reach a primary source.)*
