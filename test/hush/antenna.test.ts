/**
 * The Antenna Field is now load-bearing: the "Read True" mastery ending requires
 * surveying it (feedback/0011 #4 — the marquee law was skippable + the victory text
 * over-claimed "each law in turn"). This guards the prerequisite: the field is
 * surveyable NON-LETHALLY (by observing its tells, never by speaking a name), so the
 * new mastery requirement is fair and reachable.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('the Antenna Field (load-bearing for mastery)', () => {
  it('is surveyable by observation alone — no name spoken, no death', () => {
    const s = sess('antenna-survey');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c); // -> antenna_field, mouth shut
    expect(s.state.facts['loc.pc']).toBe('antenna_field');
    s.act('examine the names'); // antenna_name_stones (sight tell)
    s.act('listen'); // antenna_field_hum (sound tell)
    s.act('deduce the antenna field'); // two tells -> surveyed
    expect(s.state.facts['known.law.antenna_field']).toBe('surveyed');
    expect(s.state.facts['known.antenna_field.ever_surveyed']).toBe(true); // the high-water mark mastery checks
    expect(s.state.facts['survival.pc']).toBe('alive'); // observing never required speaking — fair, non-lethal
  });
});
