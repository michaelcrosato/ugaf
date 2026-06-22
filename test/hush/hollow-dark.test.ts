/**
 * The Hollow Dark now BITES (night7 #1 / #5: the agency law was "a fake threat that
 * never charges"). Holding still in the deep night four times — after three escalating,
 * explicit warnings — closes the distance (the lost_to_hollow_dark goal). Same fair,
 * telegraphed ladder the rule-breakers unanimously approved on the Mile Road.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

describe('the Hollow Dark has teeth', () => {
  it('warns three times, then closes the distance on the fourth held breath', () => {
    // the Hollow Dark is the rotating slot — find a seed where it's live
    let seed = '';
    for (const cand of ['hd1', 'hd2', 'hd3', 'hd4', 'hd5', 'hd6', 'hd7', 'hd8', 'hd9', 'hd10', 'hd11', 'hd12']) {
      if (createGame(HUSH_PACK, cand).initialState().facts['law.hollow_dark.live'] === true) {
        seed = cand;
        break;
      }
    }
    expect(seed, 'no seed with a live Hollow Dark found').not.toBe('');

    const s = new Session(createGame(HUSH_PACK, seed, { startMinutes: 22 * 60 })); // start deep in the night
    for (const c of ['out', 'road', 'road', 'on', 'fork']) s.act(c); // -> the_fork, in the Hollow Dark's scope
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    expect(s.state.facts['phase.now']).toBe('night'); // the law is armed

    s.act('wait'); // 1 — the fail-safe warning, never lethal
    expect(s.state.facts['survival.pc']).toBe('alive');
    s.act('wait'); // 2 — dread
    const w3 = s.act('wait'); // 3 — an explicit final warning
    expect(w3.text.toLowerCase()).toContain('do not stop again');
    expect(s.state.status).toBe('active'); // still alive after three

    const w4 = s.act('wait'); // 4 — the dark closes
    expect(w4.status).toBe('lost');
    expect(w4.text).toContain('Closed the Distance');
  });

  // feedback/0016 #4: the Hollow Dark read as a BLUFF because a player who held still in the drowned
  // pump-house at 3 AM felt nothing (p006) — but the bottoms are a SHELTERED pocket out of the law's
  // open-deep scope, and the game never said so. The safe pocket must be LEGIBLE: holding still there
  // costs no nerve AND the prose teaches why (shelter breaks the open dark), turning a confusing
  // non-event into a learned rule (the OPEN deep is the danger; behind walls you are safe).
  it('the drowned bottoms are a legible SAFE POCKET when the Hollow Dark is live', () => {
    let seed = '';
    for (const cand of ['hd1', 'hd2', 'hd3', 'hd4', 'hd5', 'hd6', 'hd7', 'hd8', 'hd9', 'hd10', 'hd11', 'hd12']) {
      if (createGame(HUSH_PACK, cand).initialState().facts['law.hollow_dark.live'] === true) {
        seed = cand;
        break;
      }
    }
    expect(seed, 'no seed with a live Hollow Dark found').not.toBe('');

    const s = new Session(createGame(HUSH_PACK, seed, { startMinutes: 22 * 60 }));
    // get down into the drowned bottoms; drop metal first so ONLY the Hollow-Dark question is in play
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'drop knife', 'water', 'in']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('greywater_bottoms');
    expect(s.state.facts['phase.now']).toBe('night');

    const r = s.act('rest');
    expect(s.state.facts['survival.pc']).toBe('alive');
    // the open-deep agency law cannot reach a sheltered pocket — no nerve cost accrues here
    expect((s.state.facts['law.hollow_dark.closer'] as number) ?? 0).toBe(0);
    // and the game SAYS why, so the safe pocket reads as a rule, not a toothless bluff
    expect(r.text.toLowerCase()).toMatch(/drowned walls|behind stone|open deep|no open reach|lee of/);
  });
});

// feedback/0025 #1: the swarm found the Hollow Dark never bit (0/22) — but tool investigation showed the
// shelter was INFINITE: the optimal line just waits out the whole night in the lee for free, defusing the
// timed crossing. The lee is now a GENEROUS but FINITE grace — the first held breaths teach the contrast,
// but a real dawdler outstays it and the cold creeps in by the same fair, telegraphed ladder (recoverable
// by moving up out of the bottoms). The golden single wait-until-the-window never reaches the grace.
describe('the lee of the drowned walls is a FINITE grace — dwelling past it BITES (feedback/0025 #1)', () => {
  // prime the player AT the sheltered ford, deep night, Hollow Dark forced LIVE (it is the rotating slot),
  // metal-free (so the Greywater iron-hazard doesn't confound). Turn-0 setup avoids an event-log chain break.
  const atLee = (seed: string) => {
    const s = new Session(createGame(HUSH_PACK, seed, { startMinutes: 22 * 60 }));
    s.state = {
      ...s.state,
      native: {
        ...s.state.native,
        'time.cycle': { minutes: 1320 },
        'travel.graph': { ...(s.state.native['travel.graph'] as object), node: 'greywater_ford' },
      },
      facts: {
        ...s.state.facts,
        'loc.pc': 'greywater_ford',
        'phase.now': 'night',
        'clock.minutes': 1320,
        'law.hollow_dark.live': true,
        'possession.pc.iron_knife.condition': 'ore', // metal-free: no Greywater iron noise
      },
    };
    return s;
  };

  it('the first held breaths in the lee are SAFE — the shelter teaches; the golden single wait never bites', () => {
    const s = atLee('lee-safe');
    const r = s.act('wait');
    expect((s.state.facts['law.hollow_dark.closer'] as number) ?? 0).toBe(0); // no close on the first wait
    expect(r.text.toLowerCase()).toMatch(/lee of the drowned walls|no open reach|a loan, not a haven/);
    expect(r.status).toBe('active');
  });

  it('dwelling PAST the grace makes the cold creep in — telegraphed first, then it closes (a fair death)', () => {
    const s = atLee('lee-bite');
    const texts: string[] = [];
    let status = 'active';
    for (let i = 0; i < 9; i++) {
      const r = s.act('wait');
      texts.push(r.text.toLowerCase());
      status = r.status;
      if (status !== 'active') break;
    }
    expect(status).toBe('lost'); // a serious dawdler eventually dies in the lee...
    // ...but ONLY after the telegraphed creep ladder warned (no untelegraphed death)
    expect(
      texts.some((t) => /no haven after all|finding the edges|failing shelter|stillness is the thing/.test(t)),
    ).toBe(true);
  });

  it('leaving the bottoms before the close RECOVERS — resistance, never a wall', () => {
    const s = atLee('lee-recover');
    for (let i = 0; i < 5; i++) s.act('wait'); // dwell past grace — the cold is creeping (warned)
    expect(s.state.status).toBe('active'); // warned, not dead
    expect((s.state.facts['law.hollow_dark.closer'] as number) ?? 0).toBeGreaterThan(0); // it WAS climbing
    s.act('back'); // up out of the bottoms, toward the fork
    expect(s.state.status).toBe('active'); // leaving stops the close — recoverable
  });
});
