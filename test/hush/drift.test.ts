/**
 * Law Drift must CHARGE (feedback/0012 #5): "a re-Settle re-deduces to byte-identical
 * text" and "the 'certainty is decaying' message leads to nothing adverse." The
 * `DriftPolicy.mutates` field existed but was dead — drift only demoted the codex
 * stage while the law's behaviour never changed.
 *
 * Now `mutates: 'window'` is honoured: when a phase-gated law drifts, its hungry
 * window CREEPS into predawn (the grey hour the player learned was the safe margin).
 * A stale codex now costs you — fairly: telegraphed by the decay warning + the demote
 * message naming the consequence + the codex showing `approximate`, and recoverable by
 * re-reading the law (which now reports the WIDER window, so re-survey is not byte-identical).
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

// force the 'broke' kit (iron_knife + lantern + coin) for deterministic tests
const brokePack = {
  ...HUSH_PACK,
  seedVariance: {
    ...HUSH_PACK.seedVariance!,
    startKits: [{ id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} }],
  },
};
const freshSession = (seed = 'drift-seed') => new Session(createGame(brokePack, seed));

describe('Law Drift charges — the hungry hours lengthen', () => {
  it('the Greywater, once drifted, bites in PREDAWN — the safe margin you learned no longer holds', () => {
    // prime: standing in the bottoms at 05:00 (predawn), carrying iron, the law SURVEYED-then-drifted.
    const primed = (drifted: boolean) => {
      const s = freshSession('decay-prime');
      s.state = {
        ...s.state,
        native: { ...s.state.native, 'time.cycle': { minutes: 300 } }, // 05:00 — predawn
        facts: {
          ...s.state.facts,
          'loc.pc': 'greywater_bottoms',
          'phase.now': 'predawn',
          'clock.minutes': 300,
          'known.law.greywater': 'approximate', // drift has demoted it from surveyed
          'known.greywater.ever_surveyed': true,
          'law.greywater.contacts': 1, // you have met it before (no first-contact kid gloves)
          ...(drifted ? { 'law.greywater.window_drifted': true } : {}),
        },
      };
      return s;
    };

    // CONTROL — not drifted: predawn is the safe hour you learned. The iron survives.
    const safe = primed(false);
    safe.act('listen');
    expect(safe.state.facts['phase.now']).toBe('predawn');
    expect(safe.state.facts['possession.pc.iron_knife.condition']).toBeUndefined();

    // DRIFTED: the hungry window has crept into predawn. The iron you trusted to be safe starts to fail.
    const bit = primed(true);
    const r = bit.act('listen'); // first hungry beat in the drifted predawn: WARN (the safe margin is gone)
    expect(bit.state.facts['phase.now']).toBe('predawn'); // still predawn — not a phase trick
    expect(bit.state.facts['possession.pc.iron_knife.condition']).toBe('softening'); // failing where it was safe
    expect(r.text.toLowerCase()).toContain('iron');
    bit.act('listen'); // a second beat finishes the slump (feedback/0022 #1: iron warns before it dies)
    expect(bit.state.facts['possession.pc.iron_knife.condition']).toBe('ore');
    expect(bit.state.facts['survival.pc']).toBe('alive'); // a fair material cost, never a cheap kill
  });

  it('the Hollow Dark, once drifted, closes in PREDAWN too — stillness in the grey hour is no longer safe', () => {
    const primed = (drifted: boolean) => {
      const s = freshSession('decay-dark');
      s.state = {
        ...s.state,
        native: { ...s.state.native, 'time.cycle': { minutes: 300 } },
        facts: {
          ...s.state.facts,
          'law.hollow_dark.live': true, // force the rotating law live for this test
          'loc.pc': 'the_fork', // in the Hollow Dark's scope
          'phase.now': 'predawn',
          'clock.minutes': 300,
          'known.law.hollow_dark': 'approximate',
          'known.hollow_dark.ever_surveyed': true,
          'law.hollow_dark.closer': 1,
          ...(drifted ? { 'law.hollow_dark.window_drifted': true } : {}),
        },
      };
      return s;
    };

    // CONTROL — not drifted: predawn is safe; waiting does not let the dark close.
    const safe = primed(false);
    safe.act('wait');
    expect(safe.state.facts['phase.now']).toBe('predawn');
    expect(safe.state.facts['law.hollow_dark.closer']).toBe(1); // unchanged

    // DRIFTED: the dark keeps hungry hours longer than you learned — stillness still costs you.
    const bit = primed(true);
    bit.act('wait');
    expect(bit.state.facts['phase.now']).toBe('predawn');
    expect(bit.state.facts['law.hollow_dark.closer']).toBe(2); // it closed a step, in the grey hour
  });

  it('the widening still needs the act + the carry: at predawn, dropping the iron leaves nothing to take', () => {
    const s = freshSession('decay-nometal');
    s.state = {
      ...s.state,
      native: { ...s.state.native, 'time.cycle': { minutes: 300 } },
      facts: {
        ...s.state.facts,
        'loc.pc': 'greywater_bottoms',
        'phase.now': 'predawn',
        'clock.minutes': 300,
        'known.law.greywater': 'approximate',
        'known.greywater.ever_surveyed': true,
        'law.greywater.contacts': 1,
        'law.greywater.window_drifted': true,
      },
    };
    // shed the metal first — a drifted law with nothing to bite is no danger
    s.act('drop the knife');
    expect(s.state.facts['possession.pc.iron_knife']).toBeUndefined();
    s.act('listen');
    const oreKeys = Object.keys(s.state.facts).filter((k) => k.endsWith('.condition') && s.state.facts[k] === 'ore');
    expect(oreKeys.length).toBe(0);
  });

  it('natural drift sets the widened-window flag AND the demote message names the consequence', () => {
    const s = freshSession('decay-natural');
    // survey the Greywater first-hand
    for (const c of [
      'out',
      'road',
      'road',
      'on',
      'fork',
      'water',
      'examine the rust',
      'listen',
      'deduce the greywater',
    ])
      s.act(c);
    expect(s.state.facts['known.law.greywater']).toBe('surveyed');
    const surveyTurn = s.state.facts['known.greywater.surveyed_turn'] as number;
    expect(typeof surveyTurn).toBe('number');
    // retreat to a node that is safe to dwell in (mile_road_low: outside the Hollow Dark, no wait-law)
    for (const c of ['back', 'mile', 'back']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('mile_road_low');
    // dwell (driftAfter 9): a pre-demotion warning fires, then the codex demotes + the window widens
    let demoteMsg = '';
    for (let i = 0; i < 50 && s.state.status === 'active'; i++) {
      const r = s.act('wait');
      if (!demoteMsg && s.state.facts['known.law.greywater'] === 'approximate') demoteMsg = r.text;
    }
    expect(s.state.facts['known.law.greywater']).toBe('approximate'); // re-Settled
    expect(s.state.facts['law.greywater.window_drifted']).toBe(true); // the world actually shifted
    expect(demoteMsg.toLowerCase()).toMatch(/wider|dawn|hungry hour/); // the demote NAMES the new danger
  });

  it('re-reading a drifted law is NOT byte-identical — the conclusion reports the wider window', () => {
    // two freshly-primed sessions (no mid-session mutation): both can deduce the Greywater,
    // one with the window drifted, one without. The conclusions must differ.
    const primedToDeduce = (drifted: boolean) => {
      const s = freshSession(`reread-${drifted}`);
      s.state = {
        ...s.state,
        facts: {
          ...s.state.facts,
          'known.tell.grey_rust_bloom': true, // enough tells in hand to deduce
          'known.tell.grey_low_hum': true,
          'known.law.greywater': 'approximate',
          ...(drifted ? { 'law.greywater.window_drifted': true } : {}),
        },
      };
      return s;
    };

    const firstRead = primedToDeduce(false).act('deduce the greywater');
    expect(firstRead.text.toLowerCase()).not.toMatch(/before dawn|grey hour|crept|spread/);

    const sb = primedToDeduce(true);
    const reRead = sb.act('deduce the greywater');
    expect(sb.state.facts['known.law.greywater']).toBe('surveyed'); // re-reading refreshes mastery
    expect(reRead.text).not.toBe(firstRead.text); // NOT byte-identical
    expect(reRead.text.toLowerCase()).toMatch(/before dawn|grey hour|crept|spread/);
  });
});

describe('Law Drift is FAIR — it does not strand you, and it does not over-alarm (feedback/0013 #2)', () => {
  // prime a surveyed Mile Road dwelling at a safe spot; optionally carrying the core
  const dwelling = (seed: string, core: boolean) => {
    const s = freshSession(seed);
    s.state = {
      ...s.state,
      facts: {
        ...s.state.facts,
        'loc.pc': 'mile_road_low', // safe to dwell (no wait-law here)
        'known.law.mile_road': 'surveyed',
        'known.mile_road.surveyed_turn': 0,
        'known.mile_road.ever_surveyed': true,
        ...(core ? { 'possession.pc.salvage_core': true } : {}),
      },
    };
    return s;
  };

  it('drift PAUSES while you carry the core — knowledge will not rot out from under you mid-escape', () => {
    const withCore = dwelling('drift-core', true);
    for (let i = 0; i < 30 && withCore.state.status === 'active'; i++) withCore.act('wait');
    expect(withCore.state.facts['known.law.mile_road']).toBe('surveyed'); // NOT demoted — drift paused
    expect(withCore.state.facts['law.mile_road.drift_warned']).toBeFalsy(); // never even warned

    // CONTROL: without the core, the SAME dwell DOES drift (proves the guard is what paused it)
    const noCore = dwelling('drift-nocore', false);
    let warned = false;
    for (let i = 0; i < 30 && noCore.state.status === 'active'; i++) {
      noCore.act('wait');
      if (noCore.state.facts['law.mile_road.drift_warned']) warned = true;
    }
    expect(warned).toBe(true);
  });

  it('a non-widening law (Mile Road) drift REASSURES — the rule\'s shape holds, not "you are guessing"', () => {
    const s = dwelling('drift-reassure', false);
    let demoteMsg = '';
    for (let i = 0; i < 40 && s.state.status === 'active'; i++) {
      const r = s.act('wait');
      if (!demoteMsg && s.state.facts['known.law.mile_road'] === 'approximate') demoteMsg = r.text;
    }
    expect(s.state.facts['known.law.mile_road']).toBe('approximate');
    expect(demoteMsg.toLowerCase()).toMatch(/shape|still hold/); // reassuring
    expect(demoteMsg.toLowerCase()).not.toContain('guessing'); // not the old alarm
  });

  it('the Greywater iron-degrade WARNS then slumps, each line ONCE — no per-move repeat (feedback/0013 #6, 0022 #1)', () => {
    const s = freshSession('grey-once');
    s.state = {
      ...s.state,
      native: { ...s.state.native, 'time.cycle': { minutes: 1320 } }, // night
      facts: { ...s.state.facts, 'loc.pc': 'greywater_bottoms', 'phase.now': 'night', 'clock.minutes': 1320 },
    };
    const first = s.act('listen'); // first hungry beat: WARN (softening), the line shows once
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBe('softening');
    expect(first.text.toLowerCase()).toContain('soft'); // the warning line shows
    const second = s.act('listen'); // second beat: it slumps the rest of the way to ore
    expect(s.state.facts['possession.pc.iron_knife.condition']).toBe('ore');
    expect(second.text.toLowerCase()).toMatch(/slump|ore/); // the slump line shows once
    const third = s.act('wait'); // already ore — the degrade line is NOT repeated per move
    expect(third.text.toLowerCase()).not.toContain('slump');
  });
});
