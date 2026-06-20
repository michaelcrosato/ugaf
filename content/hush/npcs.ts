/**
 * The people of the Cordon's Edge. Factions are geographic; NPCs are an
 * ACQUISITION layer — a second way to obtain the knowledge-key. The Survey sells
 * law-maps (the cleanest path to a surveyed law); the Striders sell the cache
 * route; the Holdouts give folk wisdom that is sometimes true, sometimes
 * distorted, sometimes lethally wrong (a wrong law gets you killed — so a rumor
 * is a lead, never a guarantee).
 */
import type { FactionDef, NpcDef, RumorDef } from '../../src/sdk/worldpack.js';

export const FACTIONS: FactionDef[] = [
  { id: 'cordon', name: 'The Cordon', role: 'control', description: 'The quarantine authority. Checkpoints, restricted routes, and a deep weariness with people who want to go in.' },
  { id: 'survey', name: 'The Survey', role: 'knowledge', description: 'Cartographers of the laws. They sell knowing, and they price it like the lifesaver it is.' },
  { id: 'striders', name: 'The Striders', role: 'economy', description: 'Salvagers who go in and bring anomalous things out. The black market of the Edge.' },
  { id: 'holdouts', name: 'The Holdouts', role: 'civilian', description: 'The people the Settling caught and kept. They know the Hush the way you know an old scar.' },
];

export const NPCS: NpcDef[] = [
  {
    id: 'warden_holt',
    name: 'Warden Holt',
    names: ['holt', 'warden', 'trooper', 'guard'],
    faction: 'cordon',
    disposition: 0,
    atNodes: ['cordon_checkpoint'],
    look: { base: 'A Cordon warden with the thousand-yard look of someone who has signed too many MISSING forms. He does not want to know your name.' },
    dialogue: [
      { id: 'holt_core_greet', when: { fact: 'possession.pc.salvage_core', eq: true }, text: "That's the core in your pack — I can tell by the way you carry it, like it weighs more than it has any right to. I won't stop you; stopping folk was never what the Cordon's for, out here. But I'll remember your face, and so will the ones who wanted it." },
      { id: 'holt_greet', text: "Going in, are you. They all are. Do me one kindness and don't come back as paperwork." },
      { id: 'holt_core', topic: 'core', text: "The core? Every soul through that gate is after it. Most come back as a form I have to sign. The ones who don't come back at all, I can't even file." },
      // learning the gate's blind spot is what lets you SLIP the watched gate carrying the core
      // (feedback/0013 #1) — a free `hide` is no longer enough; you have to know where the light
      // falls short. Holt, in a weary mood, will tell you, for nothing.
      { id: 'holt_gap', topic: 'gap', text: "The gap in the wire? Officially there's no such thing. Unofficially, I find I study my own boots a great deal this hour of the night. A careful soul could slip toward the fork that way — or back out of it, carrying something I'd rather not have to see. The floodlight throws long, but it throws crooked; there's a wedge of dark by the north post where a low, quiet figure simply isn't, as far as I'm concerned. Mind you stay low, and stay quiet, and don't make me look.", setsFacts: { 'flag.knows_gap': true } },
      { id: 'holt_grey', topic: 'greywater', text: "The Greywater? Don't carry iron in after dark. I've zipped up three this month who learned that the slow way — knives gone to rust-mud in their hands when they needed them.", grantsRumor: 'r_grey_true' },
      { id: 'holt_mile', topic: 'mile road', text: "The Mile Road keeps its real length behind you. Don't look back on it. Walk it like you mean it and don't turn round.", grantsRumor: 'r_mile_true' },
      { id: 'holt_antenna', topic: 'antenna', text: "The antenna field — that one I won't talk about out loud. Just... say nothing there. Nothing.", grantsRumor: 'r_antenna_true' },
    ],
  },
  {
    id: 'holdout_lyle',
    name: 'Old Lyle',
    names: ['lyle', 'old lyle', 'old man'],
    faction: 'holdouts',
    disposition: 1,
    atNodes: ['lyles_rest'],
    look: { base: 'The Rest is named for him, or he for it; nobody remembers which. He has stayed so long the Hush has stopped bothering him and started, almost, to keep him company.' },
    dialogue: [
      { id: 'lyle_core_greet', when: { fact: 'possession.pc.salvage_core', eq: true }, text: "You got it, then. I can see it on you — that pull at the shoulder, that look. Few come back wearing it. Sit a moment, if you like. Though folk carrying that rarely sit long, and rarely sit easy." },
      { id: 'lyle_greet', text: "Newcomer. You've the look of someone after the core. Everyone is, lately. Sit. Ask. Knowing's cheaper here than at the Survey, and worth about what you pay." },
      // Lyle's TRUE lore is firsthand and stated flat (the Mile Road, the core) — the CONTRAST that
      // makes his hedging legible. A careful player learns: when Lyle's sure, he says so plainly.
      { id: 'lyle_mile', topic: 'mile road', text: "The road? Aye — don't look back on her. Look back and she puts the whole walk behind you again, twice over. I've seen the bootprints loop a dead woman a thousand times round one milepost. That one I'd stake my life on.", grantsRumor: 'r_mile_true' },
      // FALSE rumour — kept false (the trap stands), but now HEDGED: Lyle marks it as told-not-tested,
      // so his wrongness reads as a fallible old Holdout, not a game bug (feedback/0012 #8).
      { id: 'lyle_grey', topic: 'greywater', text: "The bottoms? They eat gold — that's the old wisdom, anyhow. Keep your coin deep and you'll come through fine. Though mind, I'll be straight with you: I'm a Holdout, I've not carried worked iron down into that dark in thirty years. I'm telling you what I was told, not what I've tested with my own hands. Cross-check me if your life's on it.", grantsRumor: 'r_grey_false' },
      // FALSE rumour — kept false; the existing "can't tell me" hedge strengthened so the deadly
      // implication is catchable by a careful ear while still tempting the reckless.
      { id: 'lyle_antenna', topic: 'antenna', text: "The antennas? Old trick the Striders swear by — say your OWN name there, loud, and the field knows you're kin and lets you be. Whether it's true, now... I couldn't honestly tell you. The ones who walked out to try it never did walk back to tell me how it went. Make of that what you will.", grantsRumor: 'r_antenna_false' },
      { id: 'lyle_core', topic: 'core', text: "The core's real, out in the drowned pump-house. Getting to it's the easy part. Getting to it without the Greywater taking your iron, that's the trick — go by day, or go without metal, or pay a Strider who knows the safe hour.", grantsRumor: 'r_cache_paths' },
      // the diegetic reliability tell: Lyle himself names that he is a contestable source. A careful
      // player who asks learns to verify him; the contradiction in his lore is then fair, not a bug.
      { id: 'lyle_trust', topic: 'trust', text: "Trust me? Ha — I'll tell you what I tell every newcomer. I've been here so long the things I've seen and the things I've only been told have run together in my head. Some of what I hand you is gold and some is fool's gold, and these days I can't always tell you which is which. So don't stake your life on an old man's say-so. Take what I give you to the Survey, or go and see it with your own eyes. That's not modesty — it's the only honest thing I've got left to sell." },
    ],
  },
  {
    id: 'survey_factor',
    name: 'Eun of the Survey',
    names: ['eun', 'factor', 'survey', 'cartographer'],
    faction: 'survey',
    disposition: 0,
    atNodes: ['survey_post'],
    look: { base: 'A spare, exact woman who treats every law of the Hush as a card to be filed correctly. She will sell you certainty. She will not sell it cheap.' },
    dialogue: [
      { id: 'eun_core_greet', when: { fact: 'possession.pc.salvage_core', eq: true }, text: "You have it. I can see the shape of it through the canvas — the Survey would give a great deal to catalogue that, and you would be a fool to let us. I will not insult you by asking. Mind how you carry it past the wire." },
      { id: 'eun_greet', text: "The Survey trades in knowing. You bring me an observation or a coin, I give you a law you can stake your life on. That is the whole of the arrangement." },
      { id: 'eun_price', topic: 'price', text: "My price is a coin, or a true thing you have seen with your own eyes. Pay me — give me the coin, or tell me an observation — and I copy you the table fair. I do not haggle, and I do not sell what I have not confirmed." },
      { id: 'eun_grey_ask', topic: 'greywater', text: "The Greywater? Our table on it is complete and confirmed — as confirmed as anything stays here. It is not free. Make it worth my ink." },
      // Eun is the cartographer who re-files the drifting laws — give her a voice for it. This is
      // the diegetic explanation of Law Drift (the decaying-codex mechanic): her trade IS the drift.
      { id: 'eun_drift', topic: 'drift', text: "Why are the cards crossed out and re-inked, you ask? Because the laws drift, friend. The Hush re-Settles — a window creeps wider, a tell shifts its shape — and a table I copied you last week can go quietly stale while it sits in your pack. That is the whole of the Survey's trade: we read them again, and again, and re-file them, forever. A bought map is true the day you buy it and no longer. Learn to read a law yourself and you'll feel it the moment it moves under you." },
      // honest coverage of the law she will NOT sell (#6): point the player at the reliable source
      { id: 'eun_antenna_ask', topic: 'antenna', text: "The antenna field? I keep a card on it — red-inked, contested. The Survey does not sell a law it has not stood beside and lived; that one has cost us two filers already. For the antennas, Warden Holt at the checkpoint will tell you true and free, and I would not improve on him: give that place nothing of your voice." },
      { id: 'eun_lawmap', topic: 'law-map', text: "Here. The Greywater table, copied fair: the rust-bloom, the hum, the hour it wakes. Read it and you'll know the law cold — though a table is not the same as having seen it for yourself. Verify it in the field before you stake your iron on it.", grantsLeadTell: 'grey_rust_bloom', setsFacts: { 'known.tell.grey_rust_bloom': true, 'known.tell.grey_low_hum': true, 'known.purchased.greywater': true, 'known.law.greywater': 'approximate' } },
      { id: 'eun_relic', topic: 'relic', text: "Antenna-glass? If you can carry a shard out of that field without giving it your voice, bring it to me. The Survey trades real knowledge for what the field fused — a law-table for a shard, fair and glad. Most who go for one come back as a name scratched in the concrete; mind you're not one of them." },
    ],
  },
  {
    id: 'strider_mox',
    name: 'Mox',
    names: ['mox', 'strider', 'salvager'],
    faction: 'striders',
    disposition: 0,
    atNodes: ['salvager_camp'],
    look: { base: 'A Strider with burn-scars on both forearms and a fan of greasy coordinates in one pocket. She has been to the cache. She came back. She will tell you how, for a price.' },
    dialogue: [
      { id: 'mox_core_greet', when: { fact: 'possession.pc.salvage_core', eq: true }, text: "Well, look at you. Went in and came back out with the core AND all your fingers — that's one better than me. Word travels fast in a camp this size, mind. Don't be surprised who's waiting at the wire to congratulate you." },
      { id: 'mox_greet', text: "After the pump-house core, eh. I've been. Came out with all my fingers, which puts me ahead of most. The way in's for sale, if your coin's good." },
      { id: 'mox_price', topic: 'price', text: "The price? A coin buys you the safe hour and the dry line — pay me, or give me the coin, however you like to say it. Or save your money, carry no iron, and let the bottoms hum at nothing. Your call." },
      { id: 'mox_cache', topic: 'core', text: "The bottoms only bite after dark, and only worked iron. Go in by daylight and they're just cold water. Or go in stripped of metal and let them hum at nothing. That's the whole secret, and I'll sell you the safe hour besides." },
      // the character defined by knowing the safe hour will TALK about the safe hour (feedback/0012
      // #6) — the rough shape is free; the exact, timed line is what she sells.
      { id: 'mox_safe', topic: 'safe', text: "The safe hour? Course it's real — I've walked it more times than you've eaten hot dinners. The bottoms sleep a good stretch around midday and wake hungry at dusk; that much I'll tell anyone for nothing. The EXACT line through, dry and timed to the minute so you're never caught with iron in the dark — that's the part you pay me for. Or carry no metal at all, and you'll not need me." },
      { id: 'mox_window', topic: 'safe-window', text: "Here's the safe hour and the dry line through the bottoms. Don't carry iron and you won't even need the hour. Don't say I never did you a kindness — and don't forget who sold it to you.", grantsLeadTell: 'grey_low_hum', setsFacts: { 'known.tell.grey_low_hum': true, 'known.tell.grey_rust_bloom': true, 'known.purchased.greywater': true, 'objective.cache_route': 'known', 'known.law.greywater': 'approximate' } },
    ],
  },
];

export const RUMORS: RumorDef[] = [
  { id: 'r_mile_true', text: 'Do not look back on the Mile Road — it doubles the distance behind you.', topic: 'mile_road', truth: 'true', reliability: 0.9, source: 'warden_holt' },
  { id: 'r_grey_true', text: 'The Greywater slumps worked iron to ore after dark — carry no metal in by night.', topic: 'greywater', truth: 'true', reliability: 0.9, source: 'warden_holt' },
  { id: 'r_grey_false', text: 'The Greywater eats gold; keep your coin deep and you will be safe.', topic: 'greywater', truth: 'false', reliability: 0.3, source: 'holdout_lyle' },
  { id: 'r_antenna_true', text: 'Say nothing at the Antenna Field; a spoken name calls the Changed.', topic: 'antenna_field', truth: 'true', reliability: 0.85, source: 'warden_holt' },
  { id: 'r_antenna_false', text: 'Say your own name at the antennas and the field will know you as kin and spare you.', topic: 'antenna_field', truth: 'false', reliability: 0.2, source: 'holdout_lyle' },
  { id: 'r_cache_paths', text: 'The cache is reachable by daylight, or stripped of metal, or by paying a Strider for the safe hour.', topic: 'greywater', truth: 'true', reliability: 0.8, source: 'holdout_lyle' },
];
