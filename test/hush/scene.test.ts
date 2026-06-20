/**
 * Scene rendering: a region's sensory baseline is shown ONCE per zone, not re-pasted
 * as the header of every room in it (night7 #4 — players read the repeat as a
 * copy-paste bug that undercut the prose, the game's single most-praised asset).
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('scene rendering', () => {
  it("a region's sensory baseline shows once per zone, not on every room", () => {
    const s = sess('region-hdr');
    s.act('out'); // the checkpoint (cordon region)
    const lyles = s.act('road'); // Lyle's Rest — the FIRST holdout-zone room
    const palette = 'Lamplit shacks and salvaged tin'; // the holdout region baseline
    expect(lyles.text).toContain(palette);
    const survey = s.act('survey'); // a second room in the SAME zone
    expect(survey.text).not.toContain(palette); // not re-pasted as this room's header
  });
});
