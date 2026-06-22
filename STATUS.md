# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The headline: the one-button ending is fixed and merged; two more improvements are built and waiting

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — closed its named #1
problem and shipped it. The "lean on a smuggler's debt to walk out" escape used to be a **one-button "I
win"** that deleted the tense climax. It is now a **hands-on pass**: the guards search your bags, and if
you're carrying good iron they keep it as the toll. We proved it on **25 blind critics across two AI
brain-tiers — 22 won, exactly matching the last validated build** (so the cost was added without breaking
anything), and the tool measured the new cost firing on every single critic who used the debt. The cynical
"systems" critic who last time called it "a coin-operated button" this time didn't even use it — he reasoned
out the harder, earned exit instead. **That fix is merged to the trunk.**

## Trust, but verify — a tool caught the AI critics' own blind spot

While building the next fix (making the world's dangers actually bite a careful player), a deterministic
tool check caught something important the AI critics had missed. Their loudest complaint was that the
"Hollow Dark" — a danger the game threatens on every screen — **bit nobody (0 out of 22)**. But the tool
investigation found the real reason: **the game only switches that danger ON in about half of runs** (the
world "re-Settles" differently each playthrough, rotating which laws are live). So "0 out of 22" was mostly
the danger being *switched off*, not *toothless*. Our feedback machine had been **counting how often a danger
bit without checking whether it was even turned on** — a hidden flaw in how we read the playtests. That is
exactly the kind of thing the operator asked us to hunt: a cheap, deterministic tool catching a confident AI
judgment that was partly wrong. The fix to the *machine* (record which dangers were live, and measure "bit
when it was on") is now the top loop-hardening item.

We also found that where the Hollow Dark *was* on, it worked correctly out in the open — the real hole was
that the drowned-hamlet "shelter" was **infinitely safe**, so a clever player just waits out the whole night
there for free. We fixed that too: the shelter is now a **generous but finite grace** — wait a reasonable
stretch and you're safe and taught the rule, but make a whole night of it and the cold creeps in even there,
with the same fair, telegraphed warnings, escapable by simply moving. Both this and a small earlier
legibility fix (the rust no longer contradicts itself in daylight) were then **blind-validated by a fresh
15-critic cohort — clean, no fairness regression — and merged** (`feedback/0026.md`). But that cohort also
taught us something sharper, by tool not opinion: the "shelter" fix is *correct but low-impact*, because the
real reason that danger rarely bites is two structural things our fix didn't touch — the danger is **only
switched on in ~43% of runs**, and it **only acts at night**, so even a critic who deliberately sat still
~30 times got charged exactly once. The honest next target is to make that danger *reliably* present and
*reliably* bite a lingerer — and to teach our feedback machine to stop counting "did it bite" without first
checking "was it even on."

## A real hiccup, handled: the workspace got torn down mid-run — and nothing was lost

Partway through, the session's working folder was **wiped out from under us** — almost certainly the same
"chat archiving" that's been interrupting these runs (archiving the chat also dismantles its private
workspace, especially right after a merge). Because every finished piece of work had already been **saved up
to the shared repository**, nothing was lost: we detected the wipe, pushed the in-progress fix to safety,
rebuilt the workspace, and confirmed everything was intact and gate-green. **Recommended fix for the
operator: turn off "Auto-archive after PR merge or close" in the Claude Code desktop settings** — because
each finished cycle ends in a merge, that setting keeps pulling the rug right when a cycle completes.

## Where the work branch stands (ready for the operator)

- **Merged to trunk:** the debt-keystone fix (the one-button ending, gone).
- **Built, gate-green, pushed to the branch, awaiting a blind cohort:** (1) the Greywater rust daylight
  legibility fix; (2) the finite-shelter fix that makes dawdling in the deep actually dangerous.
- **Top of the backlog (in `feedback/0025.md`):** make the *optimal* player pay, not just the careless one
  (the prize should "hum" at the final gate so even the stealthy exit costs); make the world's other
  telegraphed dangers bite; and the loop-hardening above (measure dangers against whether they were live).

## Bottom line

One keystone fixed and merged; two more improvements built and safely parked on the branch pending their
fairness cohort; a genuine workspace-teardown survived with zero lost work; and — most valuable of all — a
cheap tool caught a real blind spot in how the AI critics' feedback was being read. The loop is working, and
it is now also being turned on *itself*. Full detail in `feedback/0025.md` and the branch commit log.
