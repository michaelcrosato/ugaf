# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The two big fixes landed and the critics confirmed them — and the engine itself is honest again

The whole project rests on one idea: AI players who play the game **truly blind** (seeing only the game,
never the answers), as **demanding, cynical critics**, then report back — and we use that, over and over,
to make the game better. This stretch the loop did exactly what it is built to do, twice: it **shipped two
targeted fixes and then proved, with a fresh set of blind critics, that both landed** — and along the way
it **caught the playtest engine quietly producing nothing and repaired it.**

## The endgame bites, the long empty waits are gone, and the "broken promise" is kept

Three things came together:
- **The climax now has teeth.** The escape past the guarded gate used to be a free stroll; now the three
  earned ways out genuinely diverge and cost something — and the sharpest critics, the ones who'd been
  demanding it, called the new danger *"fair, mechanically earned"* and *"the single most satisfying beat."*
- **The dead time is dead.** Players used to type "wait" twenty-five times to pass the long night, never
  finding the one-word command that skips it. Now the game *tells* them. Every single winner this round
  found and used it — where before, none of the smaller AI models ever did.
- **The bought favour can finally be spent.** The gate offered "lean on the debt," but players who'd paid
  for that favour couldn't figure out how to use it and hit a wall. Now the shopkeeper points them to it,
  and the game understands the words they actually type. Three players spent the debt this round; last
  round, nobody could.

A fresh cohort of twelve blind critics confirmed all three, with no backsliding — and we fixed a measuring
error too (the old turn limit was cutting off the deepest players; raised, and nobody got cut off).

## We caught the playtest machine producing nothing — and fixed it

Earlier this stretch, every AI player launched, said "let me begin," and then quietly stopped without
playing a single turn — no errors, just silence. A small wiring bug meant the game-server the players
connect to never started. It would have silently wasted every playtest. We found it, fixed it, and proved
the fix (twelve of twelve players then played for real). The engine is honest again.

## What's next — the frontier moved to the water's clock, and the listening field

The critics agree on where the game still isn't fair *enough*:
- **The water's deadline is told too late.** The dangerous crossing has a clock — get across before dark or
  the prize dissolves — but the game over-explains the *rules* while under-explaining the *timing*, so
  careful players who learned everything still lose to a deadline nobody told them about in time. Most of
  this round's losses were exactly this. We'll state the deadline plainly and early, and give the player a
  moment's grace and a visible warning as the prize starts to fail.
- **The listening field is a dead end.** You can brave the dangerous antenna field for a shard of glass —
  and then it's worth nothing. We'll give it a real, dramatic use: a way to throw the field's voice and
  pull the guards' attention at the gate — making the whole region matter, and turning the shard into a
  genuine choice (trade it for knowledge, or keep it to buy your escape).
- And smaller polish: stop the game from spoon-feeding the answer at the climax, fix a danger-warning that
  shows up in broad daylight where it doesn't apply, and a prose clean-up pass.

Full detail in `feedback/0020.md`.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — is turning cleanly and
fast: it **validated two targeted fixes** with a fresh blind cohort (the fast-forward is found, the debt is
spent, the gate still bites — all confirmed, no backsliding), **repaired itself** when the playtest machine
went dark, and **named the next frontier** — make the water's deadline legible and put the listening field
on the path that wins. Each swing raises the floor; the next ones add the depth that makes a slice you keep
coming back to.
