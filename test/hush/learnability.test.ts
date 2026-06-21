/**
 * feedback/0015 #1 — the core's vulnerability must be LEARNABLE before the night crossing.
 *
 * The just-shipped core-carry keystone forced the deduced Greywater law onto the win path, but
 * every pre-pickup source said the water eats IRON; the core is pointedly NOT iron, so blind
 * players reasonably dropped their iron and carried the non-iron core out to its loss — a rule
 * that only appeared AT the crisis. The fix plants the core=worked/anomalous-matter linkage in
 * MULTIPLE independent pre-pump-house sources so a blind player can DEDUCE the core is at risk
 * before committing to a dark crossing.
 *
 * This proves at least TWO independent pre-pickup sources teach it:
 *   - the DEDUCED-law codex conclusion (what a player who reads the signs and deduces sees);
 *   - the core's own examine text (the prize itself warns you);
 * plus the Survey card, Eun, Mox, and the pump-house cache prose as redundant channels.
 *
 * NOTE: this is LEARNABILITY only. The loss severity is untouched — see core-carry.test.ts, which
 * still loses the core on a mistimed dark carry-out. The win must still be EARNED.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));
const mentionsAnomalous = (t: string) => /worked|anomalous|altered|changed/i.test(t);

describe('learnability — the core is telegraphed as vulnerable BEFORE the pump-house (feedback/0015 #1)', () => {
  it('the DEDUCED Greywater conclusion warns of worked/anomalous matter, not iron alone', () => {
    const s = sess('learn-deduce');
    // read the signs and deduce the law first-hand, the way a careful player does
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
    const codex = s.codex();
    // the conclusion a deduced-law player carries must name the broader hunger...
    expect(mentionsAnomalous(codex)).toBe(true);
    // ...and explicitly that it is NOT iron alone (so the core reads as at-risk)
    expect(codex.toLowerCase()).toMatch(/not iron alone|more than iron|core/);
    // and it still names the iron danger (the original law is preserved, not replaced)
    expect(codex.toLowerCase()).toContain('iron');
  });

  it('examining the CORE itself warns that the Greywater hungers for it', () => {
    const s = sess('learn-core');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache']) s.act(c);
    const r = s.act('examine the core');
    expect(r.text.toLowerCase()).toContain('greywater'); // the prize names the hazard
    expect(mentionsAnomalous(r.text)).toBe(true); // and frames itself as worked/altered matter
    // it draws the explicit equivalence to iron so the lesson is unmissable
    expect(r.text.toLowerCase()).toContain('iron');
  });

  it('the Survey index cards teach that the water takes more than iron — the core too', () => {
    const s = sess('learn-cards');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('examine the cards');
    expect(mentionsAnomalous(r.text)).toBe(true);
    expect(r.text.toLowerCase()).toContain('core');
  });

  it('Eun (the Survey factor) tells a buyer the water takes worked/anomalous things, the core included', () => {
    const s = sess('learn-eun');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('ask eun about the greywater');
    expect(mentionsAnomalous(r.text)).toBe(true);
    expect(r.text.toLowerCase()).toContain('core');
  });

  it('Mox names that the bottoms take anything anomalous, the core most of all', () => {
    const s = sess('learn-mox');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('ask mox about the core');
    expect(mentionsAnomalous(r.text)).toBe(true);
    expect(r.text.toLowerCase()).toContain('core');
  });

  it('the pump-house cache prose, at the point of pickup, names the slumped machinery as the same lesson', () => {
    const s = sess('learn-cache');
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water', 'in', 'cache']) s.act(c);
    const look = s.act('look').text.toLowerCase();
    expect(look).toMatch(/slumped|half-ore|ore/); // the machinery has already been taken by the water
    expect(mentionsAnomalous(look)).toBe(true); // and the core is framed as the same worked/altered thing
  });
});
