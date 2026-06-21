/**
 * The day->dusk threshold must be legible (feedback/0013 #3). The whole demo turns on one timed
 * decision — cross the iron-hungry Greywater by day, strip metal, or buy the safe hour — and the
 * opus speedrunner found the player makes it BLIND: the status clock shows the time but never what
 * the time MEANS. Now escalating, concrete dusk-approach beats name the consequence before the
 * phase flips; and Mox flags the bought safe-hour as perishable at the point of sale.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('the day->dusk threshold is telegraphed (feedback/0013 #3)', () => {
  it('escalating dusk-approach beats fire before the phase flips, and name the consequence', () => {
    const s = sess('dusk-1'); // starts 16:00 — day
    s.act('look'); // turn 1: phase resolves to day (and re-arms the telegraph)
    expect(s.state.facts['phase.now']).toBe('day');
    let text = '';
    // dwell safely at the waystation, stepping the clock toward dusk
    for (let i = 0; i < 16 && s.state.facts['phase.now'] === 'day'; i++) {
      text += ' ' + s.act('look').text.toLowerCase();
    }
    expect(s.state.facts['clock.dusk_warned']).toBe(2); // BOTH escalating rungs fired before dusk
    expect(text).toMatch(/light|horizon|day left|amber/); // the time cue itself
    expect(text).toMatch(/greywater|iron|deep|hungry/); // ...and the CONSEQUENCE of the flip, named
  });

  it('the telegraph fires only in daylight, not after the dark has already come', () => {
    const s = sess('dusk-night');
    // jump the clock straight to night; the dusk-approach telegraph must NOT fire after the flip
    s.state = {
      ...s.state,
      native: { ...s.state.native, 'time.cycle': { minutes: 1320 } },
      facts: { ...s.state.facts, 'phase.now': 'night', 'clock.minutes': 1320 },
    };
    const r = s.act('look');
    expect(r.text.toLowerCase()).not.toMatch(/an hour or so of honest day|sun is on the horizon/);
  });

  it('Mox flags the safe hour as perishable AS she sells it (point-of-sale, #3)', () => {
    const s = sess('dusk-mox');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('pay mox'); // buy the timed safe-hour line
    expect(s.state.facts['known.purchased.greywater']).toBe(true); // the sale transacted
    // the receipt itself warns the hour decays — it is not owned forever
    expect(r.text.toLowerCase()).toMatch(/re-settle|true today|creep|read again|no longer/);
  });
});
