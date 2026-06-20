/**
 * The Mile Road now BITES (feedback/0009 #1, ~26/40 + both reckless personas):
 * the rule the swarm found toothless ("looked back six times, nothing happened")
 * now traps you on the fourth look-back — after three escalating, explicit warnings.
 * A telegraphed, deducible death, not a cheap one.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('the Mile Road has teeth', () => {
  it('warns three times, then takes you on the fourth look-back', () => {
    const s = sess('mile-teeth');
    for (const c of ['out', 'road', 'road']) s.act(c); // -> mile_road_low
    expect(s.state.facts['loc.pc']).toBe('mile_road_low');

    const r1 = s.act('look back'); // 1st — the fail-safe warning, never lethal
    expect(r1.text.toLowerCase()).toContain('twice as long');
    expect(s.state.facts['survival.pc']).toBe('alive');

    s.act('look back'); // 2nd — dread
    const r3 = s.act('look back'); // 3rd — an EXPLICIT final warning
    expect(r3.text.toLowerCase()).toContain('do not look back');
    expect(s.state.status).toBe('active'); // still alive after three

    const r4 = s.act('look back'); // 4th — the road keeps you
    expect(r4.status).toBe('lost');
    expect(r4.text).toContain('The Road Took You Home');
  });

  it('a single look-back is a non-lethal lesson (the fail-safe holds)', () => {
    const s = sess('mile-safe');
    for (const c of ['out', 'road', 'road']) s.act(c);
    s.act('look back');
    expect(s.state.status).toBe('active');
    expect(s.state.facts['survival.pc']).toBe('alive');
  });
});
