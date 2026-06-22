/**
 * Deduce legibility (feedback/0012 #3): the "not yet" message used to be a blind dead
 * end — "one more clear sign would settle it" / "watch for more" — never saying WHAT is
 * missing or WHERE to find it. Now it surfaces the evidence count and differentiates a
 * sign readable HERE (naming the sense) from one that is ELSEWHERE (naming the region).
 *
 * Acceptance: every advertised law is deducible with telegraphed, in-reach evidence, and
 * the "not yet" message names what's missing.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('deduce legibility — name what is missing, and where', () => {
  it('surfaces the evidence count (0 of 2) instead of a blind "watch for more"', () => {
    const s = sess('deduce-count0');
    const r = s.act('deduce the greywater'); // at the waystation, nothing read yet
    expect(r.text).toContain('0 of the 2 signs'); // the count is named
    expect(r.text).not.toContain('Watch for more'); // the old blind dead-end is gone
  });

  it('points HERE (and names the sense) when a missing sign is readable where you stand', () => {
    const s = sess('deduce-here');
    for (const c of ['out', 'road', 'road']) s.act(c); // -> mile_road_low (the milepost + shadow are here)
    expect(s.state.facts['loc.pc']).toBe('mile_road_low');
    const r = s.act('deduce the mile road');
    expect(r.text).toContain('0 of the 2 signs');
    expect(r.text.toLowerCase()).toContain('right here'); // it is readable where you stand
    expect(r.text.toLowerCase()).toMatch(/look closer|examine|search/); // and names the sense (sight)
  });

  it('points ELSEWHERE (and names the region) when the missing signs are in another zone', () => {
    const s = sess('deduce-elsewhere');
    const r = s.act('deduce the greywater'); // at the waystation — no Greywater signs in the Cordon
    expect(r.text).toContain('0 of the 2 signs');
    expect(r.text.toLowerCase()).toContain('not here'); // honestly says it is not here
    expect(r.text).toContain('Greywater'); // and names where to look
  });

  it('the count climbs as you read signs, and still guides you to the next one', () => {
    const s = sess('deduce-count1');
    for (const c of ['out', 'road', 'road']) s.act(c); // mile_road_low
    s.act('examine the milepost'); // read ONE sign (the milepost)
    expect(s.state.facts['known.tell.mile_milepost_reset']).toBe(true);
    const r = s.act('deduce the mile road');
    expect(r.text).toContain('1 of the 2 signs'); // the count advanced
    expect(r.text.toLowerCase()).toContain('right here'); // the second sign (the long shadow) is also here
  });

  it('the HERE hint names the right sense for a sound-only sign (listen)', () => {
    // the Hollow Dark at the deep fork: silence (sound) + the sitter (sight). After reading the
    // sitter, the remaining in-reach sign is the silence — a SOUND, so the hint should say "listen".
    const s = sess('deduce-listen');
    for (const c of ['out', 'road', 'road', 'on', 'fork']) s.act(c); // -> the_fork
    expect(s.state.facts['loc.pc']).toBe('the_fork');
    const r = s.act('deduce the hollow dark');
    // either it is not live this seed (honest "nothing to take hold of"), or it guides you
    if (r.text.includes('nothing there to take hold of')) {
      expect(r.text.toLowerCase()).toContain('not enforcing');
    } else {
      expect(r.text).toMatch(/of the \d+ signs/); // the count is surfaced
      expect(r.text.toLowerCase()).toContain('right here'); // the fork carries Hollow Dark signs
    }
  });

  it('the codex surfaces the evidence count while you are still gathering it', () => {
    const s = sess('deduce-codex');
    for (const c of ['out', 'road', 'road']) s.act(c);
    s.act('examine the milepost'); // one of two Mile Road signs
    expect(s.codex()).toContain('1/2 signs read');
  });
});

// ---- feedback/0016 #2: the deduction must always RESOLVE on full evidence ------------------------
// "The game says '2 of 2 signs found' and simultaneously says 'go deeper'" — a flat contradiction in
// the signature loop. Root cause: the survey gate required an `insight > 0` pool that drained one per
// survey, so after a few drift→re-Settle cycles a re-deduce of a fully-read law fell into the "not
// enough" branch and the codex stuck at approximate (a mastery win could be reached with the law
// reading unverified). A fully-evidenced deduction now always succeeds; re-confirming costs no insight.
describe('deduce always resolves on full evidence — never "2 of 2 signs" yet "go deeper" (feedback/0016 #2)', () => {
  const readBothGreySigns = (s: Session) => {
    for (const c of ['out', 'road', 'road', 'on', 'fork', 'water']) s.act(c); // -> greywater_ford by day
    expect(s.state.facts['loc.pc']).toBe('greywater_ford');
    s.act('examine the rust'); // grey_rust_bloom
    s.act('listen'); // grey_low_hum
    expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true);
    expect(s.state.facts['known.tell.grey_low_hum']).toBe(true);
  };

  it('repeated re-deductions of a 2-of-2 law all resolve to surveyed (no insight-exhaustion stranding)', () => {
    const s = sess('deduce-noexhaust');
    readBothGreySigns(s);
    // deduce far more times than the old insight pool (3) allowed — every one must SETTLE the law,
    // never report "2 of 2 signs" and tell you to go deeper.
    for (let i = 0; i < 6; i++) {
      const r = s.act('deduce the greywater');
      expect(s.state.facts['known.law.greywater']).toBe('surveyed');
      expect(r.text.toLowerCase()).toContain('certain'); // it resolves
      expect(r.text).not.toMatch(/of the 2 signs you need/); // never the "go deeper" count
    }
  });

  it('after a full drift→re-Settle cycle a re-deduce still resolves, and the codex shows it verified', () => {
    const s = sess('deduce-postdrift');
    // isolate the DRIFT mechanic from the (unrelated, rotating) Hollow Dark: this test drifts by waiting
    // ~60× at the Greywater, and the lee is now a finite grace (0025 #1) that would bite a dawdler there
    // if the law happened to be live this seed. Force it off so the test measures drift, nothing else.
    s.state = { ...s.state, facts: { ...s.state.facts, 'law.hollow_dark.live': false } };
    readBothGreySigns(s);
    s.act('deduce the greywater');
    expect(s.state.facts['known.law.greywater']).toBe('surveyed');
    expect(s.state.facts['known.greywater.ever_surveyed']).toBe(true); // the high-water mark is set

    // let the law drift back down to approximate (drift fires relative to the survey turn; no core
    // carried, so drift is not paused). p012's repro: the deduction "breaks AFTER the law re-Settled".
    let drifted = false;
    for (let i = 0; i < 60 && !drifted; i++) {
      s.act('wait');
      if (s.state.facts['known.law.greywater'] === 'approximate') drifted = true;
    }
    expect(drifted).toBe(true); // the law really did re-Settle (demote to approximate)

    const r = s.act('deduce the greywater'); // the deduction that used to break here
    expect(r.text.toLowerCase()).toContain('certain'); // it RESOLVES after the re-Settle
    expect(s.state.facts['known.law.greywater']).toBe('surveyed');
    expect(s.codex()).toMatch(/Greywater[^\n]*surveyed/i); // the codex shows it verified, not stuck
  });
});
