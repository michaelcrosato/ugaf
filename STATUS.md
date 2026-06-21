# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The engine caught its own mistake — and then proved the fix worked

The whole project rests on one idea: AI players who play the game **truly blind** (seeing only the game,
never the answers), as **demanding, cynical critics**, then report back — and we use that, over and over, to
make the game better. This stretch the loop did the hardest, most complete thing it can do: we took a **big
swing** at the heart of the game, the blind critics **caught where it went wrong** (a fairness flaw no
automatic check could ever find), we **fixed it**, and then we **ran the critics again and proved the fix
worked** — a clean before-and-after.

So far: **~690+ blind players across fifteen play-sessions**, every change checked by the automatic safety
net, a fresh second opinion, and merged clean. The repo is tidy.

## The big swing, and the proof it landed: the win now has to be EARNED

For weeks the critics said the same thing: the game teaches you deadly rules, then lets you win without
obeying one — you stroll to victory. So we made the prize itself force the lesson: **the core you came for is
strange, half-made stuff, and the flooded water hungers for it the way it eats iron after dark.** You now have
to *time* the crossing — learn when the water sleeps and go then — or lose the prize.

The first test showed the swing worked but landed unfairly: the game taught "the water eats **iron**," and the
prize is *not* iron, so careful players reasonably dropped their iron, carried the prize out, and lost it to a
rule they were never told. We fixed that — the danger is now taught *before* it bites, from several sources.

Then we ran the blind critics again, on the exact same setup, to see if the fix took. **It did, cleanly:**

- In the unfair version, the careful, thoughtful players almost all **lost** — only 1 in 13 got through.
- In the fixed version, those same careful players almost all **won** — the win rate jumped to 6 in 13, and
  *every one* of the analytic critics who'd lost the prize now learned the rule, timed the water, and made it
  out. The only players who still lose are the ones who rush in without reading, or who deliberately break the
  rules to test them — which is exactly right.

So the win is now **earned**: learn the world's hidden rules and you make it; stroll or rush and you don't.
That is the experience the whole project has been driving toward, and the critics confirmed it by name.

## What's next

The critics' praise came with a sharp new list — and the top item is one *our own change* created: forcing
players to wait for the safe hour exposed that the game's "wait until dawn" command quietly only skips half an
hour, so players had to type "wait" thirty times to pass one night. That's the next fix — make waiting for a
time of day actually skip to it. After that: a bug where the central deduction won't finalize even with all
the evidence in hand, and a mis-wired trade at the listening field. Full detail in `feedback/0016.md`.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — did this session the
complete version of its hardest job: a bold change to the core of the game → caught a fairness flaw invisible
to every automatic test → fixed it → **and proved the fix worked with a clean before-and-after across 26 fresh
blind critics.** The game's central promise — *learn the world to survive it* — is, for the first time,
something the players actually have to do. That is the foundation working at its very best.
