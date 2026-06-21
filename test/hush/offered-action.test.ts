/**
 * B7 (night12a speedrunner + night12b greywater-breaker, cross-corroborated P1): at the timed core
 * escape, typing the EXACT offered way ("back to the ford", verbatim from the "ways from here" list)
 * parsed at 0.7 — just below CONFIDENT (0.75) — so near the irreversible core-slump the K8 gate
 * clarified, and RE-ISSUING the same offered command looped forever ("say your move again" never
 * confirmed; only rephrasing to "go to the ford" at 0.88 committed). A player doing exactly what the
 * game offered, at the most tense beat, was betrayed by the parser (snapshot: turns #27/#28 loop, #29
 * rephrase commits — and loses the core to the wasted beats).
 *
 * Fix: a verbless input that exactly names an OFFERED exit (its dir or its listed label) is an
 * unambiguous move and is now CONFIDENT — it COMMITS instead of stalling into a clarify loop. The K8
 * safety for genuinely hedged/uncertain commands is untouched (hostile-slice + core-carry FIX-1 guard it).
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

function freshSession(seed: string) {
  // force the 'broke' kit (iron_knife + lantern + coin) for a deterministic core-carry setup
  return new Session(
    createGame(
      {
        ...HUSH_PACK,
        seedVariance: {
          ...HUSH_PACK.seedVariance!,
          startKits: [{ id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} }],
        },
      },
      seed,
    ),
  );
}

// reach rung 2 carrying the core in the dark, hungry bottoms — the EXACT beat that looped in play
// (the next acting move would commit the irreversible slump, so K8 guards it). Same path core-carry.ts uses.
const reachClimax = (s: Session) => {
  for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache', 'take core', 'out']) s.act(cmd);
  expect(s.state.facts['loc.pc']).toBe('greywater_bottoms');
  expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('unstable');
  expect(s.state.facts['law.greywater.core_warned']).toBe(2); // one beat from the irreversible slump
};

describe('the exact offered action commits at the climax (B7 — no clarify loop)', () => {
  it('"back to the ford" (the exact offered way) COMMITS — it does not return a clarify loop', () => {
    const s = freshSession('b7-offered');
    reachClimax(s);
    const r = s.act('back to the ford'); // verbatim from "ways from here: back to the ford"
    expect(r.clarify).toBeFalsy(); // NOT held on the K8 clarify...
    expect(r.text).not.toMatch(/half-meant|say your move again|truly mean/); // ...no loop prompt
  });

  it('a genuinely HEDGED intent at the same beat still gets the K8 confirm (safety preserved)', () => {
    const s = freshSession('b7-hedged');
    reachClimax(s);
    // a fuzzy, verbless non-exit phrase that is NOT an offered way — must still be guarded by K8,
    // proving the fix only confidence-boosts EXACT offered exits, not uncertain commands generally.
    s.act('maybe shuffle about a bit');
    // it must not silently commit the irreversible loss on a guess (the gate still holds)
    expect(s.state.facts['possession.pc.salvage_core.condition']).not.toBe('ore');
  });
});
