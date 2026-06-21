# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The engine just caught its own mistake — exactly what it was built to do

The whole project rests on one idea: AI players who play the game **truly blind** (seeing only the game,
never the answers), as **demanding, cynical critics**, then report back — and we use that to make the game
better, over and over. This session that loop did the most important thing it can do: it let us take a **big
swing**, then **caught where the swing went wrong** — a kind of mistake no automatic check could ever find —
and we fixed it in the same sitting.

So far: **~680+ blind players across fourteen play-sessions**, every change checked by the automatic safety
net, reviewed by a fresh second opinion, and merged clean. The repo is tidy.

## The big swing: making the win have to be EARNED

For weeks the critics said the same thing: the game teaches you deadly rules, but you can win without ever
obeying one — you stroll to victory. So we made the prize itself force the lesson: **the core you came for is
strange, half-made stuff, and the flooded ground hungers for it the same way it eats iron after dark.** Since
the only way out carries the core back across that water, you now actually have to solve it — time the
crossing, or lose the prize.

It worked: the strolls are dead. In the previous round almost everyone won; with this change, **only one
careful player in thirteen** got through, by patiently learning the rule and timing the water. The game now
*forces* mastery.

## What the engine caught — and how we fixed it the same day

But the blind critics immediately found the swing's flaw, and it's a subtle one **no machine check could
catch**: the game taught "the water eats **iron**" everywhere — and the core is pointedly *not* iron. So
players sensibly dropped their iron, carried the core out… and lost it to a rule they were never told. As our
most exacting critic (a "brutal-but-fair" veteran) put it: *"a rules expansion that arrived at the worst
possible moment."* Worse, a raw internal error message leaked onto the screen at that exact, tense beat.

Both are now fixed:

- **The danger is taught before it bites.** Examine the core, read the rules table, ask the cartographer — and
  you learn the water hungers for *worked and strange matter*, the core included, not iron alone. So timing the
  crossing is now a thing you can *figure out*, not a trap sprung on you.
- **The error leak is gone.** At that life-or-death moment the game now asks you plainly — *"one more step and
  what you carry is gone for good; say your move again, plainly and sure"* — instead of dumping a debug string.
  And it never makes the loss any easier: a sure command still spends it.

A fresh, independent reviewer checked both fixes (no soft-locks, the difficulty isn't softened, the lesson is
genuinely learnable now) and passed them.

## What's next

Re-run the blind critics against the now-*learnable* version — the bet is that the win rate climbs back up,
because players can now learn to time the water, while the old strolls stay dead. Then sharpen the rest: make
the iron you lose actually matter (it should close a way out), give the shop a real choice, and align a couple
of warning lines with the rules they describe. Full detail in `feedback/0015.md`.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — did this session the single
hardest thing asked of it: it let us make a bold change to the heart of the game, then **caught a fairness
flaw that is invisible to every automatic test** (only a fresh human-like player can feel "I was punished for a
rule I was never taught"), and we closed it the same day. That is the foundation working at its best.
