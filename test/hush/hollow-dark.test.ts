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
});
