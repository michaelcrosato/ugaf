/**
 * feedback/0014 #1 — the core-carry across the dark Greywater ford. The salvage core is now
 * anomalous WORKED MATTER, and the dark Greywater hungers for worked matter the way it hungers for
 * iron. So carrying the core out across the (unavoidable, linear) Greywater nodes after dark threatens
 * the prize itself — the one deduced, failable law made UNAVOIDABLE on the win path (the demo's first
 * mastery-gated lose-state). This proves the acceptance:
 *   - a naive after-dark carry-out LOSES the core (the law is ON the path, not bypassable);
 *   - first contact on the carry-out WARNS non-lethally (rung 1 = `unstable`), survivable;
 *   - RECOVERABLE: leave the water OR wait out the dark and the core knits back whole;
 *   - all THREE routes still win with an INTACT core — LEARN (time the safe window), BUY (Mox's
 *     safe hour + a Strider debt), and STRIP/TIME (cross by full daylight, pry the gate with iron).
 * Fairness: first contact is non-lethal and the carry-out adds its OWN warning rungs before any loss;
 * leaving or waiting recovers fully. No unwarned core loss, ever.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';
import type { ParsedIntent } from '../../src/sdk/intents.js';

function freshSession(seed = 'core-seed') {
  // force the 'broke' kit (iron_knife + lantern + coin) for deterministic tests
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

describe('The Hush — the core across the dark Greywater (feedback/0014 #1)', () => {
  it('LINGERING in the dark water with the core LOSES it — the slump ladder runs to ore on the 4th beat (feedback/0020 #2)', () => {
    const s = freshSession('naive-carry');
    // take the core in the hungry dark and LOITER in the water (cache<->bottoms) instead of beelining
    // out: the widened ladder runs warn -> warn -> last-warn -> ore over four in-scope beats.
    const path = ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache', 'take core', 'out', 'in', 'out'];
    let last = { status: 'active' as string, text: '' };
    for (const cmd of path) {
      last = s.act(cmd);
      if (last.status !== 'active') break;
    }
    expect(last.status).toBe('lost');
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('ore'); // slumped to ore (the lose-state)
    expect(last.text).toContain('The Water Remembered'); // the bespoke lose epilogue, not a win
    expect(last.text.toLowerCase()).toMatch(/red, rotten ore|slumps in your hands/);
  });

  it('feedback/0020 #2 — a player who BEELINES out with the core now RECOVERS (the widened 4-move window)', () => {
    const s = freshSession('beeline-out');
    // take the core in the dark and head straight for the exit (cache->bottoms->ford->fork): with the
    // longer window, reaching dry ground at the fork (out of the water) on the 4th beat recovers the
    // core whole, instead of losing it one step short of safety (the night15a "2-move no-meter" trap).
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache', 'take core']) s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('unstable'); // rung 1
    s.act('out'); // bottoms (rung 2)
    s.act('back'); // ford (rung 3 — the last warning, still in scope)
    expect(s.state.facts['law.greywater.core_warned']).toBe(3);
    expect(s.state.facts['possession.pc.salvage_core.condition']).not.toBe('ore'); // not lost yet — margin remains
    const r = s.act('back'); // ford -> fork: OUT of the water, onto dry ground -> recovery
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // knit whole — you made it out
    expect(r.status).toBe('active');
  });

  it('FIX 1 (feedback/0015 #2): an UNCERTAIN intent at the core-loss beat asks the player diegetically — it never dumps an engine debug string', () => {
    const s = freshSession('uncertain-climax');
    // reach rung 3 (the last warning) carrying the core in the dark, hungry water — the next acting
    // beat is the loss (the window is now four beats; rung 3 = last margin).
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache', 'take core', 'out', 'in'])
      s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('unstable');
    expect(s.state.facts['law.greywater.core_warned']).toBe(3); // rung 3 — one more beat is the loss

    // a HEDGED, low-confidence acting intent (a fuzzy synonym, the way blind players phrased it) —
    // the kind K8 must not let spend the irreversible loss on the strength of a guess.
    const uncertain: ParsedIntent = { class: 'wait', tags: [], confidence: 0.5, raw: 'just sort of linger here' };
    const r = s.applyIntent(uncertain, 'just sort of linger here');

    // the irreversible loss did NOT silently commit on a guess (the gate held)...
    expect(s.state.facts['possession.pc.salvage_core.condition']).not.toBe('ore');
    expect(s.state.status).toBe('active');
    // ...and the player sees a readable, IN-WORLD confirm/refusal — NO engine token, ever.
    for (const token of ['K8', 'cap=', 'core_lost', 'NOT_UNDERSTOOD', 'irreversible', 'StepReject', 'severity']) {
      expect(r.text).not.toContain(token);
    }
    // it is a diegetic line the player can act on (a confirm question, or a hesitation)
    expect(r.text.trim().length).toBeGreaterThan(0);
    expect(r.text.toLowerCase()).toMatch(/sure|anyway|certain|step|hold|water|dark/);

    // and a CONFIDENT re-issue of the same move still spends the loss in full — the loss is NOT softened
    const sure: ParsedIntent = { class: 'wait', tags: [], confidence: 0.95, raw: 'wait' };
    s.applyIntent(sure, 'wait');
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('ore'); // earned loss, uncapped
    expect(s.outcome()).toBe('lost');
  });

  it('first contact on the carry-out WARNS non-lethally — rung 1 sets `unstable`, survival still possible', () => {
    const s = freshSession('warn-1');
    // take the core deep in the dark bottoms: the first hungry beat is a WARNING, not a death.
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache']) s.act(cmd);
    const r = s.act('take core');
    expect(r.status).toBe('active'); // never lethal on first contact
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('unstable'); // rung 1 — recoverable
    expect(s.state.facts['law.greywater.core_warned']).toBe(1);
    expect(r.text.toLowerCase()).toMatch(/goes soft|sloughing/); // it telegraphs the danger
    expect(r.text.toLowerCase()).toMatch(/dry ground|leave the water|wait out the dark/); // and names the recovery
  });

  it('RECOVERABLE — after the warning, waiting out the dark (the safe hour) knits the core back whole', () => {
    const s = freshSession('recover-wait');
    // take the core at night (rung 1), step out (rung 2), then REST until the safe predawn breaks:
    // the phase goes safe ON the in-scope beat, so the ladder CLEARS and `unstable` is deleted.
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water', 'rest', 'rest', 'rest', 'rest']) s.act(cmd);
    for (const cmd of ['in', 'cache', 'take core']) s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('unstable'); // warned
    s.act('out'); // rung 2 at the bottoms (still dark)
    expect(s.state.facts['law.greywater.core_warned']).toBe(2);
    const rec = s.act('rest'); // wait out the dark — predawn breaks, the core recovers
    expect(s.state.facts['phase.now']).toBe('predawn'); // the safe hour
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // knit back whole
    expect(s.state.facts['law.greywater.core_warned']).toBe(0); // the ladder cleared
    expect(s.state.facts['survival.pc']).toBe('alive');
    expect(rec.text.toLowerCase()).toMatch(/firms back|whole|let go|gone back to sleep/);
  });

  // feedback/0022 #1 — the iron-degrade was the one place the Greywater law broke the game's "first
  // contact warns, never destroys" principle: iron slumped silent+instant to ore while the core has a
  // fair warn-ladder. Give iron the SAME fail-safe-first treatment (warn -> grace -> slump, recoverable)
  // so the two worked-matter degrades read as ONE coherent law (greywater-breaker: "incoherent").
  it('feedback/0022 #1 — iron gets a WARNING beat before it slumps (fail-safe first, like the core)', () => {
    const s = freshSession('iron-grace');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(c); // ford, dusk approaching
    const r1 = s.act('rest'); // first hungry beat: WARN (softening), NOT destroyed
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBe('softening'); // grace state, not ore
    expect(r1.text.toLowerCase()).toMatch(/soft|begin|clear of the water|shed/); // it telegraphs + names the fix
    s.act('rest'); // second hungry beat: now it slumps the rest of the way
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBe('ore');
  });

  it('feedback/0022 #1 — softening iron RECOVERS on leaving the water, like the core', () => {
    const s = freshSession('iron-recover');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(c);
    s.act('rest'); // softening
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBe('softening');
    s.act('back'); // ford -> fork: out of the water, onto dry ground -> recover
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBeUndefined(); // firmed back whole
  });

  it('RECOVERABLE — leaving the water for dry ground also knits the core back whole', () => {
    const s = freshSession('recover-leave');
    // a predawn dive (safe — core taken intact), out to the fork, then a full day later RE-ENTER the
    // ford after dusk: rung 1 fires (unstable), but stepping back UP out of the water recovers it.
    for (const cmd of ['out', 'road', 'road', 'on', 'fork', 'water', 'rest', 'rest', 'rest', 'rest', 'rest'])
      s.act(cmd);
    for (const cmd of ['in', 'cache', 'take core', 'out', 'back', 'back']) s.act(cmd);
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // safe predawn crossing — intact
    // wait at the fork through the day until the ford would be hungry again (dusk)
    for (let i = 0; i < 8 && s.state.facts['phase.now'] !== 'dusk' && s.state.status === 'active'; i++) s.act('rest');
    expect(s.state.facts['phase.now']).toBe('dusk');
    const back = s.act('water'); // step DOWN into the now-hungry ford: rung 1
    expect(back.status).toBe('active');
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBe('unstable'); // warned, not lost
    const up = s.act('back'); // up out of the water, to dry ground at the fork — recovery
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // knit back whole
    expect(s.state.facts['law.greywater.core_warned']).toBe(0);
    expect(up.text.toLowerCase()).toMatch(/up out of|firms|whole/);
  });

  it('ROUTE (a) LEARN — survey the laws, time the safe crossing, carry the core out intact and WIN', () => {
    const s = freshSession('route-learn');
    const path = [
      'out',
      'ask holt about the gap',
      'road',
      'road',
      'examine the milepost',
      'on',
      'examine the walker',
      'deduce the mile road',
      'antennas',
      'examine the names',
      'listen',
      'deduce the antenna field',
      'fork',
      'water',
      'examine the rust',
      'listen',
      'deduce the greywater', // you now KNOW the water sleeps by the grey predawn hour
      'rest',
      'rest',
      'rest',
      'rest',
      'in', // cross the bottoms in the SAFE predawn window
      'cache',
      'take core',
      'out',
      'back',
      'back',
      'wire',
      'hide',
      'back',
    ];
    let last = { status: 'active' as string, text: '' };
    for (const cmd of path) last = s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // never slumped — timed the ford
    expect(last.status).toBe('won');
  });

  it('ROUTE (b) BUY — pay Mox for the safe hour and the Strider debt, cross safe, walk out on the debt', () => {
    const s = freshSession('route-buy');
    const path = [
      'out',
      'road',
      'salvage',
      'pay mox', // buy the safe hour (the timed line) + a Strider debt that opens the watched gate
      'out',
      'road',
      'on',
      'fork',
      'water',
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'in', // cross in the safe predawn window the bought hour names
      'cache',
      'take core',
      'out',
      'back',
      'back',
      'wire',
      'lean on the debt', // feedback/0018 night14: the debt is an ACT now — lean on it to be walked out
      'back', // the Strider walks the core out past the wire at any hour
    ];
    let last = { status: 'active' as string, text: '' };
    for (const cmd of path) last = s.act(cmd);
    expect((s.state.facts['reputation.pc.striders'] as number) ?? 0).toBeGreaterThanOrEqual(1);
    expect(s.state.facts['flag.intercept_clear']).toBe(true); // the lean-on-debt act cleared the gate
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // intact
    expect(last.status).toBe('won');
  });

  it('ROUTE (c) STRIP/TIME — cross by full daylight (core AND iron intact), pry the watched gate with iron', () => {
    const s = freshSession('route-time');
    const path = [
      'out',
      'ask holt about the gap',
      'road',
      'road',
      // wait out the whole night at the Mile Road (OUTSIDE the Greywater — the iron is preserved)
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'on',
      'fork',
      'water',
      'in',
      'cache',
      'take core',
      'out',
      'back',
      'back', // a full-DAYLIGHT crossing — core never threatened, iron never slumped
      'wire',
      'use the knife', // good iron levers the watched wire-gap wide (the Greywater never ate its temper)
      'back',
    ];
    let last = { status: 'active' as string, text: '' };
    for (const cmd of path) last = s.act(cmd);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // core intact
    expect(s.state.facts['possession.pc.iron_knife.condition']).not.toBe('ore'); // iron intact (day crossing)
    expect(s.state.facts['flag.intercept_clear']).toBe(true); // the iron pry opened the gate
    expect(last.status).toBe('won');
  });
});
