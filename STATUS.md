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

## Then the deeper read caught a hidden unfairness — and we fixed that too

When we ran the *careful* analysis on that clean batch (one strong critic-of-critics, the way the design
demands), it caught something the raw numbers had hidden: a player who *learned* the dangerous-water law the
honest way — by studying it, or buying the knowledge from the cartographer — was then *refused* when they
tried to buy the salvager's "I'll-walk-you-out" favour, because the game lumped the favour together with the
knowledge they already had. So the most careful players were quietly locked out of one of the three ways
home, and only saved by stumbling onto a free gap. That's the exact kind of hidden unfairness the whole
project exists to catch. We separated the two — you can always buy the walk-out, even if you already know the
water — and a fresh clean batch of twelve proved it: the favour-route was used *twice as often*, by the very
players who'd been locked out. We also gave the dissolving *iron* its own warning beat, so it warns and can
be saved just like the prize, instead of vanishing silently.

## We proved it holds for the smartest players too — and the engine now verifies itself

We re-ran the whole batch a second time forcing the *strongest* AI brain (to be sure the wins weren't an
artifact of weaker players), added a dedicated explorer to test the one escape nobody had tried (throwing
the guards' attention with the antenna shard — it works, it's fair, and a player won with it), and merged
both batches: **twenty-two of twenty-five won, on every tier, with no unfair death and no dead-end.** We
also built the engine a new pair of eyes: a *deterministic checker* that reads every transcript and proves,
by tool not opinion, that every death was warned, every play was genuinely played (not faked), and nobody
was walled in — run automatically before the AI critics ever weigh in. Trust, but verify.

## What's next — one honest flaw, named clearly: the smart player pays for nothing

The careful critics converged on a single, deep truth: the game has real teeth, but **the best line of play
refunds every cost.** The bought "walk me out" favour is a single free button that deletes the tense escape
the other routes make you earn; waiting until noon refunds the water's deadline; the "your knowledge is
decaying" warnings never actually bite; and the listening field — the whole third of the map — is skippable.
The dangers exist, but a clever player glides past all of them. The next swing (built carefully on a side
branch and only kept if a fresh batch confirms it) starts at the highest-leverage spot: **make leaning on the
favour cost something in the moment** — a guard's second glance, a price, a near-miss — so carrying the prize
out is the hardest thing in the game for everyone, not an opt-out. Full detail in `feedback/0024.md`.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — ran its cleanest full
cycle: it **found** the dominant problem (a hidden deadline punishing careful players), **fixed** it (tell
the deadline early, widen the grace window), and **proved** the fix on a flawless twelve-of-twelve run (the
losses dropped from seven to two, seven players recovered the prize, and the deadline became the hook) — all
while staying honest about its own health through a service outage. The thing that was quietly losing the
most players is gone, and the next improvement is already on the board.
