# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The loop closed its named #1 problem, proved the fix on 25 blind critics, and named the next one honestly

The whole project rests on one idea: AI players who play the game **truly blind** (seeing only the game,
never the answers), as **demanding, cynical critics**, then report back — and we use that, over and over, to
make the game better. The last round's critics had converged on one verdict: the game has real teeth, but
**the best line of play refunds every cost** — and the single worst offender was the ending. The "lean on a
smuggler's debt to get walked out" escape was a **one-button "I win"** that deleted the tense climax everyone
else had to earn. This round fixed exactly that, and proved the fix.

## The debt is no longer a free button — and we proved it the hard way

Leaning on the debt is now a **hands-on pass**: the smuggler walks you through the gate, but the guards
search your bags on the way — a held-breath near-miss every time, and if you're still carrying good iron,
they find it and keep it as the toll. It's still always a win (you're never trapped), and the game now warns
you of the cost up front, so it's fair. We then ran **25 blind critics across two AI brain-tiers** (a normal
mix and an all-strongest-brain batch): **22 won, 3 lost — and all three losses were players who deliberately
broke a clearly-marked rule.** That's the exact same fairness score as the last validated build, so the
change **added the cost without breaking anything.** Best of all: every single critic who used the debt this
time **felt the cost** (a tool measured it firing on all nine of them, up from zero), and the cynical
"systems" critic who last time called the debt "a coin-operated button that deletes the climax" this time
**didn't even use it** — he reasoned out the harder, earned exit instead. The complaint is gone.

## We put our own work on trial before trusting it — and caught ourselves in a lie

Before spending a cent on blind critics, we ran a small army of reviewers against our own change, each one
trying to break it. They found a real flaw we'd have shipped: the game *told* the player "any iron you carry
will be taken," but the code only took **one** piece — so a player carrying two would keep one, and the game
would be quietly lying about its own cost. That's the precise kind of hidden unfairness this whole project
exists to kill, and we'd nearly committed it ourselves. We fixed it (the search now takes every piece, like
the iron-eating water does), and only then ran the validation. Tools checking the machine's own work, before
the expensive part — exactly the discipline this is built on.

## The honest part: we fixed the symptom we aimed at, and the deeper disease is now in our sights

The critics were scrupulously fair about what we *didn't* fix. The debt is no longer the easy button — but a
truly optimal player still glides past the gate, because by the time they reach it their iron is already
spent, so losing it costs them nothing. The "free exit" complaint didn't vanish; it **moved** — from the
paid debt to the *earned* sneak-out. And the biggest finding of all was somewhere else entirely: the
"Hollow Dark," a danger the game threatens on every screen, **bit literally nobody** — 0 out of 22 — because
waiting out the night is a free, instant time-machine. The world is telegraphed and fair *to a fault*: the
dread lives in the story, not yet in the mechanics. The critics even handed us the surgical fix for the
gate: the prize you're carrying is "the most anomalous thing on the whole Edge," so it should **hum at the
checkpoint itself** — making every exit cost something, not just the careless one's. That's the next swing.

## We also found a twin

Another autonomous session had quietly built its *own* version of this same fix on a side branch — a
genuinely clever variant (the smuggler refuses to walk you out while the guards are riled up). It was never
blind-tested, and its approach reached deeper into the engine than needed, so we shipped the proven one and
**wrote its best idea down as part of the next swing** rather than throwing it away. Worth a guard so two
sessions don't race the same task again.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — ran another complete clean
cycle: it took the critics' **named #1 problem** (the one-button ending), **fixed it** (the walk-out now
costs you a search, your iron, and a marked exit), **put the fix on trial twice** (a self-review that caught
our own honesty bug, then 25 blind critics that confirmed it clean and fair), and **named the next problem
precisely** (make the *optimal* path bite — the prize hums at the gate, the night grows the teeth it keeps
promising). Full detail in `feedback/0025.md`.
