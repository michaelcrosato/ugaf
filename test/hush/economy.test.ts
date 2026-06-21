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
    // fetch the core and return to the gate (carrying it), all through real play — TIMING the
    // now-hungry Greywater ford (wait out the dark, cross the bottoms in the safe predawn window)
    // so the core rides out intact (feedback/0014 #1) instead of slumping to ore mid-carry.
    for (const c of [
      'road',
      'road',
      'on',
      'fork',
      'water',
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'in',
      'cache',
      'take core',
      'out',
      'back',
      'back',
      'wire', // the cut in the wire, straight up to the watched checkpoint (still carrying the core)
    ])
      s.act(c);
    expect(s.state.facts['possession.pc.salvage_core']).toBe(true);
    expect(s.state.facts['possession.pc.salvage_core.condition']).toBeUndefined(); // intact — timed the ford
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

  // ---- feedback/0012 #6: knowledge-economy depth -------------------------------------------
  it('a named purchase binds to the named law: Eun refuses the antennas honestly, never sells the Greywater instead', () => {
    const s = sess('econ-topicbind');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('pay eun for the antennas law'); // she only sells the Greywater
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // did NOT silently sell the wrong law
    expect(s.state.facts['meta.coins']).toBe(3); // and did NOT charge you for it
    expect(r.text.toLowerCase()).toContain('antenna'); // names the law you asked for
    expect(r.text).toContain('Greywater'); // and honestly says what she does sell
  });

  it('a named purchase of the law the merchant DOES sell still transacts', () => {
    const s = sess('econ-namedbuy');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('pay eun for the greywater law');
    expect(r.rejected).toBeFalsy();
    expect(s.state.facts['known.purchased.greywater']).toBe(true); // the named law she sells -> sold
    expect(s.state.facts['meta.coins']).toBe(2); // one coin spent
  });

  it('giving the antenna shard is a TRADE, not a request to buy the antenna law (the "for"-clause guard)', () => {
    // the brave relic path must still work even though "antenna" appears in the give phrase
    const s = sess('relic-trade');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    s.act('take the relic');
    expect(s.state.facts['possession.pc.antenna_relic']).toBe(true);
    for (const c of ['mile', 'back', 'back', 'survey']) s.act(c);
    const r = s.act('give the antenna shard to eun'); // names "antenna" but is a payment, not a law request
    expect(r.text).not.toContain('not on my confirmed shelf'); // NOT mistaken for buying the antenna law
    expect(s.state.facts['possession.pc.antenna_relic']).toBeUndefined(); // the shard was traded
    expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true); // for the Greywater table
  });

  // ---- feedback/0016 #3: the relic give must NEVER misroute to Mox's coin "already carry that map" -----
  // `give relic to Eun` at the Survey triggered the coin-map "you already carry that map" string out of
  // context (it read as Mox's coin handler firing at the Survey, "as if the parser conflated the relic
  // with a coin payment"). It only misfired once the Greywater law was already known. The short phrasing
  // the swarm used must trade the shard (law unknown) or refuse around the SHARD (law known) — never the
  // coin string — across give/offer and bare/"the" relic forms.
  const reachSurveyWithRelic = (s: Session) => {
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    s.act('take the relic');
    expect(s.state.facts['possession.pc.antenna_relic']).toBe(true);
    for (const c of ['mile', 'back', 'back', 'survey']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('survey_post');
  };

  for (const phrasing of [
    'give relic to eun',
    'give the relic to eun',
    'offer relic to eun',
    'offer the relic to eun',
  ]) {
    it(`"${phrasing}" (law unknown) trades the shard for the Greywater table`, () => {
      const s = sess('relic-short-' + phrasing.replace(/\s+/g, '_'));
      reachSurveyWithRelic(s);
      const r = s.act(phrasing);
      expect(r.text).not.toMatch(/already carry that map|already know that one cold|put what you have to use/);
      expect(s.state.facts['possession.pc.antenna_relic']).toBeUndefined(); // the shard was traded
      expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true); // for the Greywater table
    });

    it(`"${phrasing}" (law already bought) refuses around the SHARD, never Mox's coin string`, () => {
      const s = sess('relic-known-' + phrasing.replace(/\s+/g, '_'));
      reachSurveyWithRelic(s);
      s.act('give coin to eun'); // make the Greywater law already known
      expect(s.state.facts['known.purchased.greywater']).toBe(true);
      const r = s.act(phrasing);
      // NEVER the coin/map handler string — that is the bug
      expect(r.text).not.toContain('already carry that map');
      expect(r.text).not.toContain('put what you have to use');
      // an honest, in-context line about the antenna-glass instead, and the relic is not lost
      expect(r.text.toLowerCase()).toMatch(/antenna-glass|shard/);
      expect(s.state.facts['possession.pc.antenna_relic']).toBe(true); // she did not pocket it for nothing
    });
  }

  // ---- feedback/0016 #5: Mox states the CONCRETE safe-hour window at purchase ----------------
  // The keystone made the bought safe-hour load-bearing, but "the safe hour's deadline is invisible"
  // (p005): she sold "an hour" without ever naming WHICH hour. At purchase she must state the window
  // in concrete, in-fiction hours consistent with the engine (safe through daylight, wakes at dusk),
  // and frame it as luck BOUGHT, not learned (move part of the win-screen "bought luck" theme here).
  it('Mox names the concrete safe-hour window at purchase, not just "an hour"', () => {
    const s = sess('econ-mox-window');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('pay mox');
    expect(r.rejected).toBeFalsy();
    const t = r.text.toLowerCase();
    expect(t).toContain('midday'); // names the heart of the safe window (PHASE_BOUNDARY.midday = 12:00)
    expect(t).toMatch(/\bsix\b|dusk/); // and names when it closes (dusk = 18:00)
    expect(t).toMatch(/luck|bought|sold/); // framed as bought luck, not learned mastery
    expect(s.state.facts['objective.cache_route']).toBe('known'); // and still transacts
    expect((s.state.facts['reputation.pc.striders'] as number) ?? 0).toBeGreaterThanOrEqual(1);
  });

  // ---- B13 (night12b rule-breaker): the deflect paywall must be TOPIC-BOUND, not a bait-and-switch ----
  // "ask Mox about the antenna field" -> "That is not free talk — that is what I sell. Pay me for it"
  // -> pay -> she handed over the GREYWATER safe-hour. She implied she sells antenna info (she doesn't)
  // and sold the wrong product. A merchant must only paywall the law she ACTUALLY sells; a different
  // named law gets an honest refusal (the purchase path already binds this way — the deflect didn't).
  it('Mox does not bait-and-switch: asking about a law she does NOT sell refuses honestly, never "pay me" then the wrong map (B13)', () => {
    const s = sess('econ-mox-baitswitch');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('ask mox about the antenna field');
    expect(r.text.toLowerCase()).not.toMatch(/that is what i sell|pay me for it/); // NOT the paywall for a law she doesn't sell
    expect(s.state.facts['meta.coins']).toBe(3); // asking costs nothing
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // and did NOT sell the Greywater instead
    expect(r.text.toLowerCase()).toMatch(/antenna|not my|don't deal|do not deal|nothing i can tell/); // honest about not selling it
  });

  it('Mox still paywalls the law she DOES sell — asking about the Greywater points you to pay (no regression)', () => {
    const s = sess('econ-mox-ownlaw');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('ask mox about the greywater');
    expect(r.text.toLowerCase()).toMatch(/sell|pay/); // her own product is still a paywall hint, not a free grant
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // hint, never a free grant
  });

  it('Mox discusses her signature topic (the safe hour) for free — no longer a pure paywall', () => {
    const s = sess('econ-mox-talk');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('ask mox about the safe hour');
    expect(s.state.facts['known.tell.grey_low_hum']).toBeFalsy(); // DISCUSSED, not granted for free
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy();
    expect(r.text.toLowerCase()).toMatch(/safe hour|midday|dusk/); // she actually talks about it
    expect(r.text).not.toContain('Nothing I can tell you about that'); // not a deflect
  });

  // ---- feedback/0016 #3B: make the win-relevant antenna detour SALIENT (not just reachable) ----
  // The relic->Greywater-table trade already works, but a player has no prompt to brave the antenna
  // field for it — so a third of the rule-system reads as decorative. Eun (the knowledge merchant)
  // now signposts the antenna-glass shard as a coin-free path to the Greywater law when you ask about
  // the water — threading the field into the economic decision WITHOUT forcing the route or bypassing
  // the Greywater keystone (the shard buys the table; you still must time the crossing).
  it('Eun signposts the antenna-glass trade as a coin-free path to the Greywater law (0016 #3B)', () => {
    const s = sess('econ-relic-signpost');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('ask eun about the greywater');
    expect(r.text.toLowerCase()).toMatch(/antenna-glass|shard/); // points at the win-relevant antenna detour
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // a SIGNPOST, not a free grant
  });

  // night12a p003 (qa-breaker): claimed examining the Survey's own cards/law-tables flagged the
  // Greywater law as "owned", blocking the relic trade ("she refuses even though I never paid").
  // Passive reading must NOT count as owning the law — only buying or deducing does — and the relic
  // trade must survive a player who reads the walls first (it is the win-relevant antenna payoff).
  it('reading the Survey walls does not count as owning the Greywater law — the relic trade still fires (night12a p003)', () => {
    const s = sess('relic-after-reading');
    for (const c of ['out', 'road', 'road', 'on', 'antennas']) s.act(c);
    s.act('take the relic');
    expect(s.state.facts['possession.pc.antenna_relic']).toBe(true);
    for (const c of ['mile', 'back', 'back', 'survey']) s.act(c);
    expect(s.state.facts['loc.pc']).toBe('survey_post');
    s.act('examine the cards');
    s.act('examine the law-tables');
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // reading != owning
    expect(s.state.facts['known.law.greywater']).not.toBe('surveyed'); // reading != surveyed
    const r = s.act('give the relic to eun');
    expect(r.text).not.toContain('already carry that map');
    expect(s.state.facts['possession.pc.antenna_relic']).toBeUndefined(); // the shard was traded...
    expect(s.state.facts['known.tell.grey_rust_bloom']).toBe(true); // ...for the Greywater table
  });

  it('Eun gives Law Drift a voice: asking about drift explains why a bought map goes stale', () => {
    const s = sess('econ-eun-drift');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('ask eun about drift');
    expect(r.text.toLowerCase()).toMatch(/drift|re-settle|re settle|stale|shift/);
    expect(r.text).not.toContain('Nothing I can tell you about that');
  });

  it('asking Eun about a law she will not sell points to the reliable source, not a dead end', () => {
    const s = sess('econ-eun-antenna');
    for (const c of ['out', 'road', 'survey']) s.act(c);
    const r = s.act('ask eun about the antenna field');
    expect(r.text.toLowerCase()).toMatch(/holt|warden|contested|voice/);
    expect(r.text).not.toContain('Nothing I can tell you about that');
  });

  // ---- feedback/0013 #6: signature-topic coverage + a deflect that POINTS, not a flat wall -----
  it('Mox covers "the way in" — a signature topic that used to hit the flat deflect', () => {
    const s = sess('econ-mox-wayin');
    for (const c of ['out', 'road', 'salvage']) s.act(c);
    const r = s.act('ask mox about the way in');
    expect(r.text).not.toContain('Nothing I can tell you about that'); // covered now
    expect(r.text.toLowerCase()).toMatch(/way in|core|daylight|iron/);
    expect(s.state.facts['known.purchased.greywater']).toBeFalsy(); // discussed free, not sold
  });

  it('Lyle covers "iron" — hedged folk wisdom, no law key granted (the false gold-rumour stands)', () => {
    const s = sess('econ-lyle-iron');
    for (const c of ['out', 'road']) s.act(c);
    const r = s.act('ask lyle about iron');
    expect(r.text).not.toContain('Nothing I can tell you about that');
    expect(r.text.toLowerCase()).toMatch(/iron|greywater|metal/);
    expect(s.state.facts['known.rumor.r_grey_true']).toBeFalsy(); // not a free survey of the true law
  });

  it('an off-coverage deflect POINTS at what the NPC does cover — not a flat dead end (#6)', () => {
    const s = sess('econ-deflect-points');
    s.act('out'); // Warden Holt at the checkpoint
    const r = s.act('ask holt about the weather');
    expect(r.text).toContain('Nothing I can tell you about that'); // still the honest decline...
    expect(r.text.toLowerCase()).toContain('ask me about'); // ...but it now points somewhere real
  });
});
