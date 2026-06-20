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

const brokePack = { ...HUSH_PACK, seedVariance: { ...HUSH_PACK.seedVariance!, startKits: [{ id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} }] } };
// a player primed at the watched gate, carrying the core (the interception is live)
const atGate = (seed: string, extra: Record<string, unknown> = {}) => {
  const s = new Session(createGame(brokePack, seed));
  s.state = { ...s.state, facts: { ...s.state.facts, 'loc.pc': 'cordon_checkpoint', 'possession.pc.salvage_core': true, 'flag.intercepted': true, ...extra } };
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

  it('learning the gap from Holt, then hiding, opens the slip route', () => {
    // (the full there-and-back WIN via this route is covered end-to-end in playthrough.test.ts,
    // which plays a real path so travel state is consistent; here we prove the gate opens)
    const s = atGate('climax-gap', { 'possession.pc.iron_knife.condition': 'ore' });
    expect(canLeave(s)).toBe(false); // before: no route earned
    s.act('ask holt about the gap');
    expect(s.state.facts['flag.knows_gap']).toBe(true); // the earned knowledge
    s.act('hide');
    expect(canLeave(s)).toBe(true); // now you know where the light falls short — the gate opens
  });

  it('the iron route still works: keep working iron, pry the wire-gap', () => {
    const s = atGate('climax-iron'); // broke kit -> a working iron knife
    s.act('use the knife');
    expect(s.state.facts['flag.intercept_clear']).toBe(true);
    expect(canLeave(s)).toBe(true);
  });

  it('the debt route still works: a Strider who owes you walks you out', () => {
    const s = atGate('climax-debt', { 'reputation.pc.striders': 1 });
    expect(canLeave(s)).toBe(true);
  });

  it('dissolved iron + no debt + no gap-knowledge = stuck until you earn a route (resistance, not a wall)', () => {
    const s = atGate('climax-stuck', { 'possession.pc.iron_knife.condition': 'ore' });
    expect(canLeave(s)).toBe(false); // no free exit
    // ...but the way out is signposted and right here: ask Holt about the gap, then slip
    s.act('ask holt about the gap');
    s.act('hide');
    expect(canLeave(s)).toBe(true); // recoverable at the gate
  });
});
