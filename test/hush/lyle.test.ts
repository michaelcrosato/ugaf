/**
 * Lyle the unreliable source (feedback/0012 #8): his lethal misinformation (the Greywater
 * "eats gold," the antenna "say your own name") read as a BUG to weaker players. The fix
 * adds a diegetic hedge so a careful player can SENSE he is contestable — while keeping the
 * contradiction (the false rumours stay false; the deduction challenge is intact). His TRUE
 * lore stays plain and confident, so the hedging is a learnable tell, not noise.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const atLyle = (seed: string) => {
  const s = new Session(createGame(HUSH_PACK, seed));
  s.act('out');
  s.act('road');
  return s;
};

describe('Lyle hedges his unreliable lore (the contradiction stands)', () => {
  it('the false Greywater lore is STILL given (trap preserved) but marked told-not-tested', () => {
    const s = atLyle('lyle-grey');
    expect(s.state.facts['loc.pc']).toBe('lyles_rest');
    const r = s.act('ask lyle about the greywater');
    expect(s.state.facts['known.rumor.r_grey_false']).toBe(true); // the FALSE rumour is still handed over
    expect(r.text.toLowerCase()).toMatch(/told, not what i've tested|old wisdom|cross-check/); // but hedged
  });

  it('the lethal antenna lore is still given, with the deadly implication made catchable', () => {
    const s = atLyle('lyle-ant');
    const r = s.act('ask lyle about the antenna');
    expect(s.state.facts['known.rumor.r_antenna_false']).toBe(true); // still the false, lethal rumour
    expect(r.text.toLowerCase()).toMatch(/never did walk back|couldn't honestly tell|make of that/);
  });

  it('asking Lyle about trust reveals he is a contestable source — a fair tell, not a bug', () => {
    const s = atLyle('lyle-trust');
    const r = s.act('ask lyle about trust');
    expect(r.text.toLowerCase()).toMatch(/say-so|fool's gold|run together|go and see it/);
  });

  it("Lyle's true lore stays plain and confident — the contrast that makes the hedging legible", () => {
    const s = atLyle('lyle-mile');
    const r = s.act('ask lyle about the mile road');
    expect(s.state.facts['known.rumor.r_mile_true']).toBe(true);
    expect(r.text.toLowerCase()).toContain('stake my life'); // firsthand certainty, no hedge
  });

  it('the contradiction is preserved: Holt vs Lyle on the Greywater still flags in the codex', () => {
    const s = new Session(createGame(HUSH_PACK, 'lyle-contra'));
    s.act('out');
    s.act('ask holt about the greywater'); // r_grey_true (iron — reliable)
    s.act('road');
    s.act('ask lyle about the greywater'); // r_grey_false (gold — the hedged trap)
    expect(s.codex()).toContain('⚠'); // two opposed sources still flagged; the trap is intact
  });
});
