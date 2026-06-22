# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The loop's tightest turn yet: it found the biggest problem, fixed it, and proved the fix on a clean run

The whole project rests on one idea: AI players who play the game **truly blind** (seeing only the game,
never the answers), as **demanding, cynical critics**, then report back — and we use that, over and over,
to make the game better. This stretch did the complete cycle, cleanly: the blind critics **found the one
thing losing the most players**, we **fixed it**, and a fresh, perfectly clean set of twelve critics
**proved the fix works** — the exact players who lost to that problem before now win.

## The biggest problem was a hidden deadline. Now it's the hook.

For a while, the most common way to lose was subtle and unfair: the dangerous water crossing has a clock —
get across and out before dark, or the prize dissolves in your hands — but the game told you the *rules*
loudly and the *timing* late, so careful players who'd learned everything still lost to a deadline nobody
told them about in time. One critic called it *"learn before you go, then punished for having done so."*

We fixed it two ways: the warden now tells you the deadline plainly and early (cross before dusk, the prize
dissolves too, not just iron), and we widened the grace window so a player heading for safety makes it out
instead of losing the prize one step short.

The result, measured on a clean run of twelve blind critics: **ten wins, two losses — and the two losses
were players who deliberately broke a clearly-marked rule, not the timing trap.** Last time this was the
problem, it was five wins to seven losses. **Seven players this run hit the danger and recovered the prize
where they'd have lost it before** — including the two specific critics who lost to this exact trap last
time and now win. Best of all, the deadline stopped being a trap and became the *hook*: one player said
that the moment she realised she had a daylight clock racing nightfall, she was *"committed."*

## We caught the playtest engine going dark — twice — and handled both

Earlier this project, the playtest machine silently produced nothing in our isolated workspace (a wiring
bug); we found and fixed it. Then, mid-run, the AI service itself got overloaded and started failing — the
exact "server's too busy" error we keep hitting. Instead of hammering it, we let the bad run finish
honestly (it flags its own failures), waited, ran a tiny two-player check to confirm the service had
recovered, and only then ran the full clean validation above. The loop is honest about its own health.

## What's next — the critics already named it

The same clean run that proved the fix also named the next thing: an inconsistency. Your *iron* dissolves
in the dark water silently and instantly, with no warning — but the *prize* dissolves with three escalating
warnings and a grace period. A critic flagged the asymmetry as incoherent ("both are worked matter"). We'll
give the iron its own warning beat so the two read as one coherent law. Plus smaller items: a lore-hint that
asks you to stand still in a place that punishes standing still, and confirming the new "throw the guards'
attention with the antenna shard" escape gets used in the wild. Full detail in `feedback/0022.md`.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — ran its cleanest full
cycle: it **found** the dominant problem (a hidden deadline punishing careful players), **fixed** it (tell
the deadline early, widen the grace window), and **proved** the fix on a flawless twelve-of-twelve run (the
losses dropped from seven to two, seven players recovered the prize, and the deadline became the hook) — all
while staying honest about its own health through a service outage. The thing that was quietly losing the
most players is gone, and the next improvement is already on the board.
