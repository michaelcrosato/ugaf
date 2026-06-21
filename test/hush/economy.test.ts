/**
 * The NPC information-economy — the P0 cluster the blind swarm hammered (30/30):
 * the trade must actually transact with the natural verbs, spend the payment, and
 * show up in the codex; unhandled topics must say so; and greetings must notice
 * world-state (you carrying the core). Regression guard for those fixes.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';

const sess = (seed: string) => new Session(createGame(HUSH_PACK, seed));

describe('the NPC information-economy', () => {
  it('give coins to Eun transacts: the coin is spent and the Greywater law enters the codex', () => {
    const s = sess('econ-eun');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    expect(s.state.facts['possession.pc.coin_roll']).toBe(true); // every start kit deals a coin
    const r = s.act('give coins to eun');
    expect(r.rejected).toBeFalsy();
    expect(r.text.toLowerCase()).toContain('hand over'); // a receipt — coins don't vanish silently
    expect(s.state.facts['meta.coins']).toBe(2); // ONE coin spent of three, not the whole purse
    expect(s.state.facts['possession.pc.coin_roll']).toBe(true); // you still have coins left
    expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true); // got the table
    expect(s.state.facts['known.law.greywater']).toBe('approximate'); // codex stage advances
    expect(s.codex()).toContain('Greywater'); // the bought map is visible in the codex
    expect(s.codex()).toContain('bought map'); // and honestly flagged as unverified
    // buying it again is refused, not duplicated
    const again = s.act('give coins to eun');
    expect(again.text.toLowerCase()).toContain('already');
  });

  it('pay Mox transacts via the bribe path: coin spent, cache route + Strider standing gained', () => {
    const s = sess('econ-mox');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    expect(s.state.facts['possession.pc.coin_roll']).toBe(true);
    s.act('pay mox');
    expect(s.state.facts['meta.coins']).toBe(2); // one coin spent
    expect(s.state.facts['objective.cache_route']).toBe('known');
    expect((s.state.facts['reputation.pc.striders'] as number) ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('giving a coin to a non-merchant still dead-ends honestly (no false trade)', () => {
    const s = sess('econ-holt');
    s.act('out'); // Warden Holt is at the checkpoint and sells nothing
    const r = s.act('give coins to holt');
    expect(r.text.toLowerCase()).toContain('no use for that');
    expect(s.state.facts['possession.pc.coin_roll']).toBe(true); // coin NOT consumed
  });

  it('asking an NPC about an unhandled topic says so, instead of silently replaying the greeting', () => {
    const s = sess('econ-topic');
    s.act('out');
    const r = s.act('ask holt about the weather');
    expect(r.text).toContain('Nothing I can tell you about that');
    expect(r.text).not.toContain('Going in, are you'); // not the greeting
  });

  it('NPC greetings are state-aware: carrying the core changes what Holt says', () => {
    const s = sess('golden-hush'); // the daylight route is non-lethal on this seed
    s.act('out');
    expect(s.act('talk to holt').text).toContain('Going in, are you'); // default greeting
    // fetch the core and return to the gate (carrying it), all through real play
    for (const c of [
      'road',
      'road',
      'on',
      'fork',
      'water',
      'in',
      'cache',
      'take core',
      'out',
      'back',
      'back',
      'mile',
      'back',
      'back',
      'gate',
    ])
      s.act(c);
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(s.state.facts['loc.pc']).toBe('cordon_checkpoint');
    const after = s.act('talk to holt').text;
    expect(after).not.toContain('Going in, are you'); // greeting changed
    expect(after.toLowerCase()).toContain('core'); // he notices what you carry
  });

  it('give coin (singular) works, not only the plural', () => {
    const s = sess('econ-singular');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('give coin to eun');
    expect(r.rejected).toBeFalsy();
    expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true); // the trade fired
    expect(s.state.facts['meta.coins']).toBe(2); // one coin of three spent
  });

  it('coins are a counted resource: a purchase costs one, the rest remain, and the count is visible', () => {
    const s = sess('econ-count');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    expect(s.state.facts['meta.coins']).toBe(3);
    expect(s.inventory()).toContain('×3'); // the purse count shows in inventory
    s.act('give coins to eun'); // buy the Greywater table
    expect(s.state.facts['meta.coins']).toBe(2); // only ONE coin gone
    expect(s.inventory()).toContain('×2');
  });

  it('asking a merchant about its paid law-map is a paywall hint, never a free grant', () => {
    const s = sess('econ-paywall');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('ask eun about the law-map');
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // NOT handed over for free
    expect(r.text.toLowerCase()).toContain('pay'); // it points you at buying instead
  });

  it('a law bought from one merchant is not falsely claimed as bought from the OTHER (trade-state bleed)', () => {
    const s = sess('trade-bleed');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    s.act('give coin to eun'); // buy the Greywater table from EUN
    expect(s.state.facts['known.purchased.greywater']).toBe(true);
    for (const c of ['out', 'salvage']) s.act(c); // Lyle's Rest -> the Striders' camp (Mox)
    const r = s.act('pay mox');
    expect(r.text).not.toContain('from me already'); // Mox must NOT claim she sold it to you
    expect(r.text.toLowerCase()).toContain('already carry'); // honest: you already have that law
    expect(s.state.facts['meta.coins']).toBe(2); // and you are NOT charged again
  });
});
