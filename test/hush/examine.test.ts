/**
 * Examine fixes from the feedback/0008 backlog (~8/30 + the iron-gap, ~10/30):
 * carried/visible ITEMS now describe themselves (the core, the crowbar) instead
 * of the generic "nothing here" fallback; a named prop resolves to the one in the
 * room you stand in (no cross-room text leak); and every start kit deals iron so
 * the Greywater puzzle always has teeth.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('examine fixes', () => {
  it('examining the core returns its own description, not the generic fallback', () => {
    const s = sess('ex-core');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache']) s.act(c);
    expect(s.obs().scene.entities.some((e) => e.id === 'item.salvage_core')).toBe(true); // the core is here
    const r = s.act('examine the core');
    expect(r.text).toContain('not quite metal'); // its authored look
    expect(r.text.toLowerCase()).not.toContain('nothing here tells you'); // no contradicting fallback
  });

  it('examining the crowbar describes it and foreshadows the Greywater (iron is load-bearing)', () => {
    const s = sess('ex-crowbar'); // some kits deal a crowbar; force one into hand to assert the description
    s.state = {
      ...s.state,
      facts: {
        ...s.state.facts,
        'possession.pc.crowbar': true,
        'possession.pc.crowbar.class': 'metal',
      },
    };
    const r = s.act('examine the crowbar');
    expect(r.text.toLowerCase()).toContain('iron');
    expect(r.text.toLowerCase()).toContain('greywater'); // the look prose foreshadows the hazard
  });

  it('a named prop resolves to the room you are in, not a same-named prop elsewhere', () => {
    const s = sess('ex-maps');
    for (const c of ['out', 'road', 'survey']) s.act(c); // the Survey's lean-to
    const r = s.act('examine the maps');
    expect(r.text).toContain('three colours of ink'); // the Survey's law-tables
    expect(r.text).not.toContain("DON'T LOOK BACK"); // NOT the waystation notices from another room
    expect(r.text).not.toContain('MISSING');
  });

  // night12a p001 (parser-purist, opus): in the DRY waystation, `examine the knife` returned the
  // Greywater ford's dead-man scenery ("the blade has slumped into a smear of red ore... Beside it,
  // a hand. The rest of the salvager is under the water"). The carried iron_knife item was shadowed
  // by a same-named examinable from ANOTHER room, because the examinable kind fell through to the
  // GLOBAL (cross-room) lexicon before the item was ever tried. An examinable is location-bound.
  it('examining your carried knife describes YOUR knife, not a dead blade from the Greywater ford', () => {
    const brokePack = {
      ...HUSH_PACK,
      seedVariance: {
        ...HUSH_PACK.seedVariance!,
        startKits: [{ id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} }],
      },
    };
    const s = new Session(createGame(brokePack, 'ex-knife-leak'));
    expect(s.state.facts['loc.pc']).toBe('waystation');
    expect(s.state.facts['possession.pc.iron_knife']).toBe(true);
    const r = s.act('examine knife');
    expect(r.text.toLowerCase()).toContain('skinning knife'); // YOUR knife's authored look
    expect(r.text.toLowerCase()).not.toContain('the rest of the salvager is under the water'); // NOT the ford dead-blade
  });

  it('every start kit deals an iron item, so the Greywater puzzle always has teeth', () => {
    for (const seed of ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8']) {
      const f = createGame(HUSH_PACK, seed).initialState().facts;
      const hasIron = f['possession.pc.iron_knife'] === true || f['possession.pc.crowbar'] === true;
      expect(hasIron, `seed ${seed} dealt no iron`).toBe(true);
    }
  });
});

// feedback/0025 #6 (qa-breaker, HIGH): the rust-bloom examinable claimed to be "spreading… in the time it
// takes to breathe" even at midday, while the room says the daylight metal "is just metal" — a self-
// contradiction that makes a careful player second-guess the very iron-at-night law they deduced. The
// examinable must read true to the phase (dormant by day, blooming after dark) WITHOUT losing the tell.
describe('the Greywater rust-bloom reads true to the phase (no daylight contradiction)', () => {
  // prime the player AT the ford with a chosen clock, at turn 0 (mutating state mid-session would break
  // the event-log hash chain). The time module re-derives phase.now from the clock, so set the clock too.
  const atFord = (seed: string, minutes: number, phase: string) => {
    const s = new Session(createGame(HUSH_PACK, seed));
    s.state = {
      ...s.state,
      native: {
        ...s.state.native,
        'time.cycle': { minutes },
        'travel.graph': { ...(s.state.native['travel.graph'] as object), node: 'greywater_ford' },
      },
      facts: { ...s.state.facts, 'loc.pc': 'greywater_ford', 'phase.now': phase, 'clock.minutes': minutes },
    };
    return s;
  };

  it('by DAYLIGHT the rust is dormant — it does not claim to be spreading as you watch (matches "just metal")', () => {
    const t = atFord('rust-day', 720, 'day').act('examine the rust').text.toLowerCase(); // 12:00 midday
    expect(t).toContain('it will not sleep past dusk'); // the dormant, evidence-teaching daylight base rendered
    expect(t).toMatch(/dormant|just rust|only metal/); // reads as inert by day, agreeing with the room
    expect(t).toMatch(/dark|dusk|wake/); // but STILL teaches what the dark does — the law stays legible
  });

  it('after DARK the rust actively blooms — the live tell is fully present', () => {
    const t = atFord('rust-night', 1320, 'night').act('examine the rust').text.toLowerCase(); // 22:00 night
    expect(t).toContain('spreading across worked iron'); // the live bloom
    expect(t).toContain('the water has woken'); // and names the active danger
  });
});
