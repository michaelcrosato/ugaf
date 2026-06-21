/**
 * night13 keystone (feedback/0017 #1 — "the rules never bit"): the Antenna Field's name-taboo
 * punished speaking, but the game never created a SITUATION where speaking was tempting — the
 * systems-minmaxer "walked through in silence and nothing happened." Now a lured VOICE in the
 * dead static calls the player, baiting a verbal response, so resisting is active tension.
 *
 * FAIRNESS IS SACRED and unchanged: silence is ALWAYS safe (the lure never harms the silent), and
 * answering still routes through the EXISTING clamped summon ladder (first utterance warns, never
 * instakills). No new lethality path; the coherence invariants must stay green.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';
import { coherencePass } from '../../src/gates/coherence.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('the Antenna Field LURES you to speak (night13 — make the silence tense)', () => {
  it('a voice in the field baits a verbal response AND telegraphs that answering is the trap', () => {
    const s = sess('lure-tempt');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('antenna_field');
    const t = s.act('look').text.toLowerCase();
    expect(t).toMatch(/voice|calling|calls you|answer/); // a concrete SITUATION, not just "the hum wants a word"
    expect(t).toMatch(/name-stones|do not answer|don't answer|dead|stay silent|keep your|give it nothing/); // telegraph
  });

  it('FAIRNESS: lingering in silence and leaving is always safe — the lure cannot harm the silent', () => {
    const s = sess('lure-silent');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    for (const c of ['look', 'wait', 'listen', 'examine the names']) s.act(c); // linger, mouth shut
    expect(s.state.facts['survival.pc']).toBe('alive');
    expect(s.state.facts['law.antenna_field.active']).toBeFalsy(); // silence NEVER summons the Changed
    expect((s.state.facts['law.antenna_field.coming'] as number) ?? 0).toBe(0);
    s.act('mile'); // leave the field
    expect(s.state.facts['loc.pc']).toBe('mile_road_high');
    expect(s.state.facts['survival.pc']).toBe('alive');
  });

  it('answering the lure (speaking) routes through the EXISTING fair ladder — warns, never instakills', () => {
    const s = sess('lure-answer');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    const said = s.act('say hello'); // a verbal response to the voice = speaking aloud at the field
    expect(s.state.facts['survival.pc']).toBe('alive'); // clamped first contact — never an instant kill
    expect(s.state.facts['law.antenna_field.coming']).toBe(1);
    expect(said.status).toBe('active');
  });

  it('coherence still passes — the fairness invariants (clamp, fail-safe, reachable tells) are intact', () => {
    expect(coherencePass(HUSH_PACK).ok).toBe(true);
  });
});
