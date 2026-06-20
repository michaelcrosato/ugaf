/**
 * The Hush — end-to-end integration. Drives real Sessions over the Cordon's Edge
 * pack: a full winning there-and-back, the lawful anomalies firing (Greywater
 * degrades iron at night; the Antenna Field's first Changed is clamped
 * non-lethal), and bit-identical golden-tape replay of a real session.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';
import { replay } from '../../src/kernel/replay.js';

function freshSession(seed = 'test-seed') {
  // force the 'broke' kit (iron_knife + lantern + coin) for deterministic tests
  return new Session(createGame({ ...HUSH_PACK, seedVariance: { ...HUSH_PACK.seedVariance!, startKits: [{ id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} }] } }, seed));
}

describe('The Hush — Cordon’s Edge', () => {
  it('a brisk day-march wins: reach the cache before night, carry the core out', () => {
    const s = freshSession('win-1');
    const path = [
      'out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache',
      'take core',
      'out', 'back', 'back', 'mile', 'back', 'back', 'gate', 'back',
    ];
    let last = { status: 'active' as string };
    for (const cmd of path) last = s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(last.status).toBe('won');
  });

  it('the learning loop: examine a tell, trigger the fail-safe, deduce to surveyed', () => {
    const s = freshSession('learn-1');
    s.act('out');
    s.act('road');
    s.act('road'); // -> mile_road_low
    s.act('examine the milepost'); // acquire mile_milepost_reset
    expect(s.state.facts['known.tell.mile_milepost_reset']).toBe(true);
    const lb = s.act('look back'); // trigger Mile Road: non-lethal fail-safe
    expect(lb.text.toLowerCase()).toContain('twice as long');
    expect(s.state.facts['survival.pc.unsettled']).toBe(1);
    expect(s.state.facts['survival.pc']).toBe('alive'); // never lethal on first contact
    s.act('on'); // mile_road_high
    s.act('examine the walker'); // second tell (dead adventurer)
    s.act('deduce the mile road'); // -> surveyed
    expect(s.state.facts['known.law.mile_road']).toBe('surveyed');
  });

  it('Greywater (material): after dark, worked iron slumps toward ore', () => {
    const s = freshSession('grey-1');
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(cmd); // -> greywater_ford, ~dusk
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBeUndefined();
    s.act('rest'); // -> dusk/night
    const r = s.act('rest'); // -> night: the law fires on metal
    expect(s.state.facts['phase.now']).toBe('night');
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBe('ore');
    expect(r.text.toLowerCase()).toContain('iron');
    expect(s.state.facts['survival.pc']).toBe('alive'); // material law is non-lethal (a fail-state, not a kill)
  });

  it('Antenna Field (summon): a spoken name calls the Changed — first contact is clamped non-lethal', () => {
    const s = freshSession('antenna-1');
    for (const cmd of ['out', 'road', 'road', 'on', 'antennas']) s.act(cmd); // -> antenna_field
    expect(s.state.facts['loc.pc']).toBe('antenna_field');
    const said = s.act('say maren'); // speak a name aloud -> summon
    expect(s.state.facts['law.antenna_field.contacts']).toBe(1);
    expect(s.state.facts['survival.pc']).toBe('alive'); // delegated-lethality clamp: first Changed never kills
    expect(said.text.toLowerCase()).toMatch(/changed|antenna|voice|dark/);
  });

  it('the non-metal path: drop your iron, and the Greywater has nothing to take', () => {
    const s = freshSession('nometal-1');
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(cmd);
    s.act('drop the knife'); // shed the metal
    expect(s.state.facts['possession.pc.iron_knife']).toBeUndefined();
    s.act('rest');
    s.act('rest'); // night, but no metal to degrade
    expect(s.state.facts['phase.now']).toBe('night');
    // nothing degraded because nothing metal is carried
    const oreKeys = Object.keys(s.state.facts).filter((k) => k.endsWith('.condition') && s.state.facts[k] === 'ore');
    expect(oreKeys.length).toBe(0);
  });

  it('exact replay: a real Hush session replays bit-for-bit', () => {
    const game = createGame(HUSH_PACK, 'replay-1');
    const s = new Session(game);
    for (const cmd of ['out', 'road', 'talk to lyle', 'ask lyle about the mile road', 'road', 'examine the milepost', 'look back', 'on', 'examine the walker', 'deduce the mile road']) {
      s.act(cmd);
    }
    const golden = s.log.toGolden();
    expect(golden.records.length).toBeGreaterThan(5);
    const res = replay(game.driver(), golden);
    expect(res.ok, JSON.stringify(res)).toBe(true);
  });

  it('determinism: two runs of the same seed + commands reach the identical state hash', () => {
    const run = () => {
      const s = freshSession('det-1');
      for (const cmd of ['out', 'road', 'survey', 'talk to eun', 'out', 'road', 'on', 'examine the milepost']) s.act(cmd);
      return s;
    };
    const a = run();
    const b = run();
    expect(a.log.latestHash()).toBe(b.log.latestHash());
  });
});
