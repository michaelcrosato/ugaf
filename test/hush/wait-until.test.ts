/**
 * `wait until <phase>` is a REAL fast-forward (feedback/0016 #1). The keystone forced players to
 * wait out the dark to time the Greywater crossing — which exposed that the fast-forward verb did
 * not fast-forward: `wait until dawn` advanced thirty minutes, so players typed `wait` ~30× to pass
 * one night ("a loading screen with extra steps"). Now, at a SAFE node, `wait/rest/sleep until
 * <phase>` jumps the clock to that boundary in ONE turn — but it NEVER silently skips a hazard: at a
 * Hollow-Dark node (death by stillness), or at the Greywater carrying metal or the anomalous core
 * (the irreversible slump), the jump is refused and the clock advances one ordinary step instead, so
 * the law fires turn-by-turn exactly as it does today.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

const tod = (s: Session) => s.state.facts['clock.tod'] as string;
const phase = (s: Session) => s.state.facts['phase.now'] as string;

describe('wait until <phase> — a real single-turn fast-forward at safe nodes (feedback/0016 #1)', () => {
  it('`wait until night` then `wait until dawn` jumps the clock in ONE turn at a safe node', () => {
    const s = sess('ff-safe');
    for (const c of ['out', 'road']) s.act(c); // -> Lyle's Rest (a settlement; no law in scope)
    expect(s.state.facts['loc.pc']).toBe('lyles_rest');
    expect(phase(s)).toBe('day');

    s.act('wait until night'); // ONE turn: ~16:26 -> 21:00
    expect(phase(s)).toBe('night');
    expect(tod(s)).toBe('21:00');

    s.act('wait until dawn'); // ONE turn across the whole night: 21:00 -> 06:00
    expect(phase(s)).toBe('day');
    expect(tod(s)).toBe('06:00');
  });

  it('the single-turn jump narrates the long passage (not a terse one-beat "you wait")', () => {
    const s = sess('ff-narration');
    for (const c of ['out', 'road']) s.act(c);
    const r = s.act('wait until night');
    expect(r.text.toLowerCase()).toMatch(/hours run|hours,|it is 21:00 now|the light has turned|the light turn/);
    expect(r.text).not.toContain('Time moves on; the Hush does not hurry'); // the terse beat is suppressed
  });

  it('`rest until dawn` and `sleep until dawn` both fast-forward (rest/sleep aliases)', () => {
    const s = sess('ff-rest');
    for (const c of ['out', 'road']) s.act(c);
    s.act('rest until dawn');
    expect(tod(s)).toBe('06:00');

    const s2 = sess('ff-sleep');
    for (const c of ['out', 'road']) s2.act(c);
    s2.act('sleep until dawn');
    expect(tod(s2)).toBe('06:00');
  });

  it('HAZARD-HANDLED: at the fork (the Hollow Dark) `wait until dawn` does NOT skip the dark', () => {
    const s = sess('ff-fork');
    for (const c of ['out', 'road', 'road', 'on', 'fork']) s.act(c); // -> the_fork (Hollow Dark scope)
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    expect(s.state.facts['law.wait_ff_unsafe']).toBe(true); // the gate marks a long wait here hazardous
    const before = tod(s);
    s.act('wait until dawn');
    // it advanced only one ordinary +30 step — the dark was NOT silently skipped
    expect(tod(s)).not.toBe('06:00');
    expect(before).not.toBe(tod(s)); // time did move (one normal step)
    // and the player is still in (or approaching) the dark, where the Hollow Dark can fire turn-by-turn
    expect(['day', 'dusk']).toContain(phase(s)); // not teleported past the night
  });

  it('HAZARD-HANDLED: at the ford carrying iron, `wait until predawn` will not skip the Greywater', () => {
    const s = sess('ff-ford-iron');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(c); // -> greywater_ford, carrying the iron knife
    expect(s.state.facts['loc.pc']).toBe('greywater_ford');
    expect(s.state.facts['law.wait_ff_unsafe']).toBe(true); // metal-in-the-water makes a long wait hazardous
    const before = tod(s);
    s.act('wait until predawn');
    // no multi-hour jump — one ordinary step, so the iron degrade is not silently skipped
    const after = tod(s);
    expect(after).not.toBe('04:00');
    expect(before).not.toBe(after);
  });

  it('dropping the metal makes the ford safe again — then the fast-forward fires', () => {
    const s = sess('ff-safe'); // this seed deals the iron knife (the metal we drop)
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('greywater_ford');
    expect(s.state.facts['law.wait_ff_unsafe']).toBe(true);
    s.act('drop the knife'); // leave the metal — the Greywater law she is taught
    expect(s.state.facts['possession.pc.iron_knife']).toBeUndefined(); // it really left the kit
    s.act('wait'); // one ordinary step lets the anomaly gate re-publish (now safe)
    expect(s.state.facts['law.wait_ff_unsafe']).toBe(false);
    s.act('wait until predawn'); // now a real single-turn jump
    expect(phase(s)).toBe('predawn');
    expect(tod(s)).toBe('04:00');
  });

  it('HAZARD-HANDLED: carrying the core in the Greywater, a long wait never silently skips the slump', () => {
    // fetch the core through real play — on this seed you reach the cache at dusk, carrying the core
    // in the Greywater's hungry hours. The anomalous core makes a long wait hazardous, so the fast-
    // forward must refuse and step one ordinary beat — the core's slump ladder is never skipped.
    const s = sess('ff-ford-core');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache', 'take core']) s.act(c);
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(s.state.facts['law.wait_ff_unsafe']).toBe(true); // the anomalous core makes a long wait hazardous
    const before = tod(s);
    const r = s.act('wait until dawn');
    expect(r.status).toBe('active'); // not catapulted into a lost run by a silent jump
    expect(tod(s)).not.toBe('06:00'); // no multi-hour jump — the core's slump ladder cannot be skipped
    expect(before).not.toBe(tod(s)); // but time still advanced one ordinary step
  });
});
