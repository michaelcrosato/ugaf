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
  it('a march to the cache wins — but the core is watched-for, so you must slip the gate to carry it out', () => {
    const s = freshSession('win-1');
    const path = [
      'out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache',
      'take core', // the Cordon now watches the gate for it
      'out', 'back', 'back', 'mile', 'back', 'back', 'gate',
      'ask holt about the gap', 'hide', 'back', // slip the watched gate: learn its blind spot, then go low (iron's gone to the Greywater)
    ];
    let last = { status: 'active' as string };
    for (const cmd of path) last = s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(s.state.facts['flag.intercepted']).toBe(true); // taking the core marked you
    expect(last.status).toBe('won');
  });

  it('the mastery ending is REACHABLE: deduce ALL THREE laws, carry the core out, get "Read True"', () => {
    const s = freshSession('mastery-1');
    const path = [
      'out', 'road', 'road', 'examine the milepost', 'on', 'examine the walker', 'deduce the mile road',
      'antennas', 'examine the names', 'listen', 'deduce the antenna field', // the listening field is now load-bearing for mastery
      'fork', 'water', 'examine the rust', 'listen', 'deduce the greywater',
      'in', 'cache', 'take core', 'out', 'back', 'back', 'mile', 'back', 'back', 'gate', 'ask holt about the gap', 'hide', 'back',
    ];
    // all three laws were read true at some point (even if drift later re-Settled them)
    let last = { text: '', status: 'active' as string };
    for (const cmd of path) last = s.act(cmd);
    expect(s.state.facts['known.mile_road.ever_surveyed']).toBe(true);
    expect(s.state.facts['known.greywater.ever_surveyed']).toBe(true);
    expect(s.state.facts['known.antenna_field.ever_surveyed']).toBe(true);
    expect(last.status).toBe('won');
    expect(last.text).toContain('Read True'); // the flagship mastery epilogue, not the nerve-not-knowing fallback
  });

  it('return-trip interception: carrying the core, the gate reads the metal/debt facts you wrote', () => {
    // a primed scene at the watched checkpoint, carrying the core
    const base = () => {
      const g = createGame(HUSH_PACK, 'intercept-1');
      const sess = new Session(g);
      sess.state = { ...sess.state, facts: { ...sess.state.facts, 'loc.pc': 'cordon_checkpoint', 'possession.pc.salvage_core': true, 'flag.intercepted': true } };
      return sess;
    };
    const exitOpen = (sess: Session) => sess.obs().scene.exits.some((e) => e.to === 'waystation');

    // blocked by default (no resolution)
    expect(exitOpen(base())).toBe(false);

    // (a) WORKING iron: USE it to pry the wire-gap wide
    const iron = base();
    iron.state = { ...iron.state, facts: { ...iron.state.facts, 'possession.pc.crowbar': true, 'possession.pc.crowbar.class': 'metal' } };
    iron.act('use the crowbar');
    expect(iron.state.facts['flag.intercept_clear']).toBe(true);
    expect(exitOpen(iron)).toBe(true);

    // (b) SLUMPED iron (Greywater ate its temper): the pry FAILS
    const slumped = base();
    // every start kit now deals iron; degrade ALL of it so the only iron on hand is the slumped bar
    slumped.state = { ...slumped.state, facts: { ...slumped.state.facts, 'possession.pc.crowbar': true, 'possession.pc.crowbar.class': 'metal', 'possession.pc.crowbar.condition': 'ore', 'possession.pc.iron_knife.condition': 'ore' } };
    const fail = slumped.act('use the crowbar');
    expect(slumped.state.facts['flag.intercept_clear']).toBeUndefined();
    expect(fail.text.toLowerCase()).toContain('warm wax');

    // (c) a STRIDER debt (you bought your way in) walks you out
    const debt = base();
    debt.state = { ...debt.state, facts: { ...debt.state.facts, 'reputation.pc.striders': 1 } };
    expect(exitOpen(debt)).toBe(true);
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

  it('Antenna Field (summon): first contact is clamped non-lethal AND leaving the field is a fair escape', () => {
    const s = freshSession('antenna-1');
    for (const cmd of ['out', 'road', 'road', 'on', 'antennas']) s.act(cmd); // -> antenna_field
    expect(s.state.facts['loc.pc']).toBe('antenna_field');
    const said = s.act('say maren'); // speak a name aloud -> summon (first contact, clamped)
    expect(s.state.facts['law.antenna_field.contacts']).toBe(1);
    expect(s.state.facts['survival.pc']).toBe('alive'); // delegated-lethality clamp: first Changed never kills
    expect(s.state.facts['law.antenna_field.active']).toBe(true); // the Changed is now hunting
    expect(said.text.toLowerCase()).toMatch(/changed|antenna|voice|dark/);
    // LEAVING the field is the fair escape — the Changed loses the thread (knowledge, not twitch)
    const fled = s.act('mile'); // leave to the Mile Road
    expect(s.state.facts['survival.pc']).toBe('alive');
    expect(s.state.facts['law.antenna_field.active']).toBe(false);
    expect(fled.text.toLowerCase()).toMatch(/loses the thread|behind you|turns away/);
  });

  it('Antenna Field: speaking the name twice is lethal — but you were warned and given a way out', () => {
    const s = freshSession('antenna-2');
    for (const cmd of ['out', 'road', 'road', 'on', 'antennas']) s.act(cmd);
    s.act('say maren'); // warning
    const dead = s.act('say maren'); // ignore the warning, speak again -> lethal
    expect(s.state.facts['survival.pc']).toBe('dead');
    expect(dead.status).toBe('lost');
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

  it('the brave path: take the antenna relic and trade it to the Survey for the Greywater law-map', () => {
    const s = freshSession('relic-1');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('antenna_field');
    s.act('take the relic');
    expect(s.state.facts['possession.pc.antenna_relic']).toBe(true);
    s.act('mile'); // leave the field silently — alive (you never spoke)
    expect(s.state.facts['survival.pc']).toBe('alive');
    for (const c of ['back', 'back', 'survey']) s.act(c); // -> the Survey's lean-to
    s.act('give the relic to eun');
    expect(s.state.facts['possession.pc.antenna_relic']).toBeUndefined(); // traded away
    expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true); // got the Greywater table
    expect(s.state.facts['known.tell.grey_low_hum']).toBe(true);
  });

  it('Law Drift: a surveyed law is warned, then demoted — the codex is fallible (dwell engine)', () => {
    const s = freshSession('drift-1');
    // survey the Mile Road early, then dwell at a TRULY safe spot — mile_road_low, OUTSIDE the
    // Hollow Dark's scope (mile_road_high is inside it, and the Dark now bites after dark).
    for (const c of ['out', 'road', 'road', 'examine the milepost', 'on', 'examine the walker', 'deduce the mile road', 'back']) s.act(c);
    expect(s.state.facts['known.law.mile_road']).toBe('surveyed');
    const surveyTurn = s.state.facts['known.mile_road.surveyed_turn'] as number;
    expect(typeof surveyTurn).toBe('number');
    // dwell (driftAfter 12): a pre-demotion warning fires, THEN the codex demotes
    let warnedAt = -1;
    let demotedAt = -1;
    for (let i = 0; i < 40 && s.state.status === 'active'; i++) {
      s.act('wait');
      if (warnedAt < 0 && s.state.facts['law.mile_road.drift_warned']) warnedAt = s.state.turn;
      if (demotedAt < 0 && s.state.facts['known.law.mile_road'] === 'approximate') demotedAt = s.state.turn;
    }
    expect(warnedAt).toBeGreaterThan(surveyTurn); // warning fires after mastery, relative to it
    expect(demotedAt).toBeGreaterThan(warnedAt); // demotion strictly AFTER the warning (never silent)
    expect(s.state.facts['known.law.mile_road']).toBe('approximate'); // re-Settled: must re-learn
  });

  it('per-seed variance: the Hollow Dark (rotating slot) is live on some seeds, absent on others', () => {
    const live = (seed: string) => createGame(HUSH_PACK, seed).initialState().facts['law.hollow_dark.live'] === true;
    const results = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map(live);
    expect(results.some((x) => x)).toBe(true); // some seeds surface it
    expect(results.some((x) => !x)).toBe(true); // some seeds don't — a fresh second run
    // the three teaching laws are ALWAYS live
    const f = createGame(HUSH_PACK, 's1').initialState().facts;
    expect(f['law.mile_road.live']).toBe(true);
    expect(f['law.greywater.live']).toBe(true);
    expect(f['law.antenna_field.live']).toBe(true);
  });

  it('per-seed variance: different seeds can deal different starting kits', () => {
    const kitOf = (seed: string) => {
      const game = createGame(HUSH_PACK, seed);
      const st = game.initialState();
      return Object.keys(st.facts).filter((k) => k.startsWith('possession.pc.') && !k.includes('.', 'possession.pc.'.length) && st.facts[k] === true).sort().join(',');
    };
    const kits = new Set(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'].map(kitOf));
    expect(kits.size).toBeGreaterThan(1); // not every seed gives the identical kit
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
