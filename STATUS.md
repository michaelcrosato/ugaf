# Where things stand — in plain English

*A living snapshot of the autonomous build sessions. The work keeps going after this is written.*

## The engine validated the big win across the board — then caught and fixed its own bugs

The whole project rests on one idea: AI players who play the game **truly blind** (seeing only the game,
never the answers), as **demanding, cynical critics**, then report back — and we use that, over and over,
to make the game better. This stretch the loop did two complete things at once: it took the hard-won
"earned win" and **proved it holds for every kind of player**, and then — in the same cycle — the blind
critics **found three real bugs the automatic safety net could never catch**, and we **fixed them**.

So far: **over 700 blind players across many play-sessions**, every change checked by the automatic
safety net, a fresh second opinion, and merged clean. The repo is tidy.

## The win is fair, earned, and learnable — confirmed by 16 fresh critics, every kind of player

We ran two fresh cynical cohorts (16 players, every persona, three different AI brains). The result was
as clean as it gets: **everyone who played carefully and learned the rules won; everyone who rushed or
deliberately broke the rules lost — and lost fairly, warned first.** Eight wins, eight losses, split
perfectly along *how they played*, not which AI they were. The harshest prose critic we have won the
game and called it "a review of a game that works." That is the foundation working at its best.

## The frontier moved: the rules are fair, but they don't yet *bite* the player who learns them

Here is the sharp new finding — and it comes from the critics who **won**. The cleverest "systems" player
put it plainly: *"The rules never bit. Knowing the rules is sufficient to feel nothing."* Each danger
punishes a *mistake* — look back, speak a name, carry iron at night — so once you've learned the rule,
you simply never make the mistake, and you stroll through with no tension. The dangers are a *checklist*,
not a *gauntlet*. That is exactly the thing we most want to fix next: **make the dangers force real
choices and real pressure, not just "don't do the wrong thing."** That is the next big swing (night13).

## What we shipped this stretch (night12)

- **The shop is honest now:** the salvager Mox finally tells you the *actual* safe hour ("the bottoms
  sleep at midday, wake at six") when you pay her — before, she sold "an hour" without ever saying which,
  and a player lost a whole run because of it.
- **The dark reads right:** when you wait out the night in a sheltered spot, the game now tells you *why*
  you're safe there — turning a confusing non-event into a learned rule.
- **The listening field is worth visiting:** the game now points you to a coin-free way to learn the
  water's law by braving the antennas — so a whole third of the world stops being decorative.
- **Three bugs the critics caught, fixed:** examining your own knife used to show a dead man's dissolved
  blade from another place (in the first minute!); "wait until day" looked broken when it was quietly
  protecting you (now it explains itself); and a reported "reading the walls breaks a trade" turned out
  to be a false alarm (now guarded against).
- **We put our own tools on trial:** the playtest swarm now survives the rate-limit errors that kept
  interrupting us (it paces itself and retries), and it can no longer quietly lose a player's report.

## What's next

The keystone above: **make the world's dangers bite the careful player too** — turn "don't do X" into
real dilemmas with real pressure, the way a great showcase level keeps you on edge even when you know the
rules. Plus a clear list of smaller fixes the critics named: the way *out* of the Zone needs to feel
earned (right now it can resolve itself), and one confusing pair of place-names ("the fork" vs "the
ford") cost a careful player their prize. Full detail in `feedback/0017.md`.

## Bottom line

The two-loop engine — AI builds, AI blind-plays, feedback drives the next build — had its strongest
cycle yet: it **proved** the central promise (learn the world to survive it) holds for every kind of
player and every AI tier, **caught and fixed its own bugs** in the same breath, **hardened itself**
against the rate-limit pain that was slowing us down, and **named the next mountain** — making the
dangers genuinely *bite*, not just gate. The foundation is sound; the next swing is the fun.
