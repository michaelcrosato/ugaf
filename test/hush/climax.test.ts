/**
 * The climax must have teeth (feedback/0013 #1 — the night8 keystone, 8+ personas across
 * BOTH cohorts and the all-opus tier, unanimous). The winning line ended in a costless
 * `hide`: the run's earned routes (kept iron, a Strider debt, knowledge of the gate) never
 * got collected. A free skeleton key made the iron-loss and the whole knowledge economy
 * decorative.
 *
 * Now the watched gate is a genuine, EARNED branch:
 *   - PRY    — working (non-ore) iron to lever the wire-gap (lost to the Greywater => closed)
 *   - DEBT   — a Strider who owes you (paid Mox)
 *   - SLIP   — you know the gate's blind spot (ask Holt about the gap) AND hide AND the patrol
 *              is not alert. A bare `hide` is no longer enough.
 * Always recoverable AT the gate (Holt is right there), so it is resistance, never a wall.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const brokePack = {
  ...HUSH_PACK,
  seedVariance: {
    ...HUSH_PACK.seedVariance!,
    startKits: [{ id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} }],
  },
};
// a player primed at the watched gate AT NIGHT, carrying the core (the interception is live).
// night because the SLIP route needs cover of dark; pry/debt work at any hour.
const atGate = (seed: string, extra: Record<string, unknown> = {}) => {
  const s = new Session(createGame(brokePack, seed));
  s.state = {
    ...s.state,
    native: { ...s.state.native, 'time.cycle': { minutes: 1320 } }, // 22:00 — night
    facts: {
      ...s.state.facts,
      'loc.pc': 'cordon_checkpoint',
      'phase.now': 'night',
      'clock.minutes': 1320,
      'possession.pc.salvage_core': true,
      'flag.intercepted': true,
      ...extra,
    },
  };
  return s;
};
const canLeave = (s: Session) => s.obs().scene.exits.some((e) => e.to === 'waystation');

describe('the climax has teeth — the watched gate must be EARNED', () => {
  it('a free HIDE no longer walks the core out — slipping needs the gate’s blind spot', () => {
    const s = atGate('climax-hide', { 'possession.pc.iron_knife.condition': 'ore' }); // iron dissolved, no debt, no gap-knowledge
    const r = s.act('hide');
    expect(s.state.facts['flag.hidden']).toBe(true); // you DID hide
    expect(canLeave(s)).toBe(false); // ...but the core does not simply walk out on a free hide
    expect(r.status).not.toBe('won');
  });

  it('learning the gap from Holt, then hiding under cover of dark, opens the slip route', () => {
    // (the full there-and-back WIN via this route is covered end-to-end in playthrough.test.ts,
    // which plays a real path so travel state is consistent; here we prove the gate opens)
    const s = atGate('climax-gap', { 'possession.pc.iron_knife.condition': 'ore' });
    expect(canLeave(s)).toBe(false); // before: no route earned
    s.act('ask holt about the gap');
    expect(s.state.facts['objective.knows_gap']).toBe(true); // the earned knowledge (player-visible)
    s.act('hide');
    expect(canLeave(s)).toBe(true); // night + knowledge + hidden + calm patrol — the gate opens
  });

  it('the SLIP route is closed in BROAD DAYLIGHT — the gap is no use without the cover of dark', () => {
    // arriving disarmed (no iron, no debt) by DAY genuinely narrows your odds (feedback/0013 #1, #3)
    const s = atGate('climax-day', { 'possession.pc.iron_knife.condition': 'ore' });
    s.state = {
      ...s.state,
      native: { ...s.state.native, 'time.cycle': { minutes: 600 } },
      facts: { ...s.state.facts, 'phase.now': 'day', 'clock.minutes': 600 },
    };
    s.act('ask holt about the gap');
    s.act('hide');
    expect(s.state.facts['phase.now']).toBe('day');
    expect(canLeave(s)).toBe(false); // knowledge + hidden, but no dark to slip into — you must wait, or earn another route
  });

  it('the iron route still works: keep working iron, pry the wire-gap', () => {
    const s = atGate('climax-iron'); // broke kit -> a working iron knife
    s.act('use the knife');
    expect(s.state.facts['flag.intercept_clear']).toBe(true);
    expect(canLeave(s)).toBe(true);
  });

  it('the debt route still works — but only when you LEAN ON IT (feedback/0018 night14: an act, not passive)', () => {
    const s = atGate('climax-debt', { 'reputation.pc.striders': 1 });
    expect(canLeave(s)).toBe(false); // the debt no longer opens the gate by merely existing
    s.act('lean on the debt');
    expect(canLeave(s)).toBe(true); // the act walks you out
  });

  it('the room LOOK telegraphs the route state — the prose actually renders (masked-flag fix)', () => {
    // stuck player: the look names the way out (regression guard for the renderer stripping flag.*)
    const stuck = atGate('climax-look-stuck', { 'possession.pc.iron_knife.condition': 'ore' });
    expect(stuck.act('look').text.toLowerCase()).toContain('ask him about the gap');
    // gap-known at night: the look acknowledges the route opened (dark on your side)
    const ready = atGate('climax-look-ready', {
      'possession.pc.iron_knife.condition': 'ore',
      'objective.knows_gap': true,
    });
    expect(ready.act('look').text.toLowerCase()).toMatch(/go low and quiet|dark is on your side/);
    // gap-known but BY DAY: the look says you must wait for dark
    const day = atGate('climax-look-day', { 'objective.knows_gap': true });
    day.state = {
      ...day.state,
      facts: { ...day.state.facts, 'phase.now': 'day', 'clock.minutes': 600 },
      native: { ...day.state.native, 'time.cycle': { minutes: 600 } },
    };
    expect(day.act('look').text.toLowerCase()).toMatch(/broad day|wait for the light/);
    // patrol ALERT (hidden, knows gap, night): the SLIP "go" prose must NOT show — the route is shut
    const alerted = atGate('climax-look-alert', {
      'objective.knows_gap': true,
      'flag.hidden': true,
      'awareness.cordon_patrol': 'alert',
    });
    expect(canLeave(alerted)).toBe(false); // exit correctly blocked while alert
    expect(alerted.act('look').text.toLowerCase()).not.toContain('go low and quiet'); // and the prose agrees
  });

  it('dissolved iron + no debt + no gap-knowledge = stuck until you earn a route (resistance, not a wall)', () => {
    const s = atGate('climax-stuck', { 'possession.pc.iron_knife.condition': 'ore' });
    expect(canLeave(s)).toBe(false); // no free exit
    // ...but the way out is signposted and right here: ask Holt about the gap, then slip
    s.act('ask holt about the gap');
    s.act('hide');
    expect(canLeave(s)).toBe(true); // recoverable at the gate
  });

  it('once a route is EARNED, the room says the way is OPEN and stops re-offering the spent escape (#4)', () => {
    // SLIP: learn the gap, hide — the look now reads "the way is open / slip back", not "HIDE again"
    const slip = atGate('climax-open-slip', { 'possession.pc.iron_knife.condition': 'ore' });
    slip.act('ask holt about the gap');
    slip.act('hide');
    expect(canLeave(slip)).toBe(true);
    const look = slip.act('look').text.toLowerCase();
    expect(look).toMatch(/the way is open|the way is yours|slip back/); // clear finish cue
    expect(look).not.toContain('ask him about the gap'); // the spent instruction is gone

    // PRY: lever the gate with working iron — the look reads the way is open
    const pry = atGate('climax-open-pry'); // broke kit -> a working iron knife
    pry.act('use the knife');
    expect(pry.state.facts['flag.intercept_clear']).toBe(true);
    expect(pry.act('look').text.toLowerCase()).toMatch(/the way is open|levered/);

    // DEBT: before the act, the look OFFERS the route ("lean on it"); after leaning, it reads OPEN
    const debt = atGate('climax-open-debt', { 'reputation.pc.striders': 1 });
    expect(debt.act('look').text.toLowerCase()).toMatch(/lean on it|owes you/); // available, not yet taken
    debt.act('lean on the debt');
    expect(debt.act('look').text.toLowerCase()).toMatch(/the way is open/); // earned by the act
  });
});

// feedback/0018 night14 keystone — THE GATE GOES LIVE, the routes DIVERGE. The night13 verdict was
// "the endgame is hollow": HIDE was a sticky no-op, the debt opened the gate passively, and none of
// the earned choices diverged. Now: the watch is live (taking the core rouses the troopers), carrying
// WORKING iron CLINKS (so silent escape demands the Greywater lesson — shed the metal), and the debt
// is an ACT you must lean on. Each route still wins; now they cost something distinct.
describe('the climax has TEETH — the live watch makes the routes diverge', () => {
  it('M1: taking the core makes the gate-watch LIVE and clears any stale concealment', () => {
    const s = new Session(createGame(brokePack, 'live-watch'));
    s.state = {
      ...s.state,
      // prime BOTH the loc fact and travel's native node — `take` reads the module's native node
      native: {
        ...s.state.native,
        'travel.graph': { ...(s.state.native['travel.graph'] as object), node: 'greywater_cache' },
      },
      facts: {
        ...s.state.facts,
        'loc.pc': 'greywater_cache',
        'flag.hidden': true, // a stale hide carried over from slipping IN through the gap earlier
      },
    };
    s.act('take core');
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(s.state.facts['awareness.cordon_patrol']).toBe('searching'); // the troopers now actively hunt it
    expect(s.state.facts['flag.hidden']).not.toBe(true); // stale concealment is wiped — you must re-earn it at the gate
  });

  it('M2: carrying WORKING iron, a HIDE clinks and does NOT open the slip — the watch rouses', () => {
    // knows the gap, night, calm patrol — but a WORKING iron knife is on you (broke kit, never slumped)
    const s = atGate('climax-clink', { 'objective.knows_gap': true });
    const r = s.act('hide');
    expect(s.state.facts['flag.hidden']).not.toBe(true); // the clink gave you away — no concealment earned
    expect(canLeave(s)).toBe(false); // working iron cannot slip silently past a live watch
    expect(r.text.toLowerCase()).toMatch(/iron|metal|rings|clink|knock/); // telegraphed: it tells you WHY
  });

  it('M2: shed the iron (the Greywater lesson), then HIDE, and the slip opens — recoverable at the gate', () => {
    const s = atGate('climax-shed', { 'objective.knows_gap': true });
    s.act('hide'); // clinks (working iron)
    expect(canLeave(s)).toBe(false);
    s.act('drop the knife'); // shed the metal — exactly the law the Greywater teaches
    s.act('hide'); // now you move silent
    expect(s.state.facts['flag.hidden']).toBe(true);
    expect(canLeave(s)).toBe(true); // night + gap-knowledge + silent + calm patrol — the gate opens
  });

  it('M3: the debt no longer opens the gate passively — you must LEAN ON IT (an act)', () => {
    // metal-free (iron slumped), debt owed, knows nothing of the gap: the ONLY route is the debt
    const s = atGate('climax-debt-act', {
      'reputation.pc.striders': 1,
      'possession.pc.iron_knife.condition': 'ore',
    });
    expect(canLeave(s)).toBe(false); // rep alone does not walk you out anymore
    const r = s.act('lean on the debt');
    expect(s.state.facts['flag.intercept_clear']).toBe(true); // the act clears the gate
    expect(canLeave(s)).toBe(true);
    expect(r.text.toLowerCase()).toMatch(/strider|debt|walk|wire|baggage/);
  });

  it('M3: leaning on a debt you do not have is a fair near-miss, not a free pass', () => {
    const s = atGate('climax-nodebt', { 'possession.pc.iron_knife.condition': 'ore' });
    const r = s.act('lean on the debt');
    expect(s.state.facts['flag.intercept_clear']).toBeUndefined(); // nothing cleared
    expect(canLeave(s)).toBe(false);
    expect(r.text.toLowerCase()).toMatch(/no.*debt|owe you|no strider|nobody/); // points you elsewhere, never a wall
  });

  // feedback/0019 #2 — the debt was a BROKEN PROMISE: players reach for "ask the strider to walk me
  // out", never the exact verb "lean on the debt". The act must accept what players actually type.
  it('M3 discoverability: "walk me out" also spends the debt (not just "lean on the debt")', () => {
    const s = atGate('climax-walkout', {
      'reputation.pc.striders': 1,
      'possession.pc.iron_knife.condition': 'ore',
    });
    s.act('walk me out');
    expect(s.state.facts['flag.intercept_clear']).toBe(true); // the natural phrasing spends the debt
    expect(canLeave(s)).toBe(true);
  });
});
