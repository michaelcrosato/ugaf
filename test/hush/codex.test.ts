/**
 * The codex contradiction flag (feedback/0008 #9): the central trust mechanic must
 * not keep crying "verify it" about a law you have already verified first-hand. Once
 * you survey the law, the conflict is settled and the disproven rumour is marked.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('the codex contradiction flag', () => {
  it('clears once you verify the law first-hand, and marks the disproven rumour', () => {
    const s = sess('codex-conflict');
    s.act('out');
    s.act('ask holt about the greywater'); // r_grey_true  (Holt — reliable)
    s.act('road');
    s.act('ask lyle about the greywater'); // r_grey_false (Lyle — the "eats gold" trap)
    expect(s.codex()).toContain('⚠'); // two opposed sources => flagged

    for (const c of ['road', 'on', 'fork', 'water', 'examine the rust', 'listen', 'deduce the greywater']) s.act(c);
    expect(s.state.facts['known.law.greywater']).toBe('surveyed'); // verified with your own eyes

    const codex = s.codex();
    expect(codex).not.toContain('⚠'); // stops crying "verify it" about a thing you verified
    expect(codex).toContain('✓'); // the conflict is settled
    expect(codex).toContain('FALSE'); // and the disproven rumour is named
  });
});
