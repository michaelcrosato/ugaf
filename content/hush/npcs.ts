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
      { id: 'holt_greet', text: "Going in, are you. They all are. Do me one kindness and don't come back as paperwork." },
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
      { id: 'lyle_greet', text: "Newcomer. You've the look of someone after the core. Everyone is, lately. Sit. Ask. Knowing's cheaper here than at the Survey, and worth about what you pay." },
      { id: 'lyle_mile', topic: 'mile road', text: "The road? Aye — don't look back on her. Look back and she puts the whole walk behind you again, twice over. Folk have died walking home down a road that kept making more of itself.", grantsRumor: 'r_mile_true' },
      { id: 'lyle_grey', topic: 'greywater', text: "The bottoms eat gold, they say — keep your coin deep and you'll be fine.", grantsRumor: 'r_grey_false' },
      { id: 'lyle_antenna', topic: 'antenna', text: "The antennas? Old trick the Striders swear by — say your OWN name there, loud, and the field knows you're kin and lets you be. Whether it's true... well. The ones who tried it can't tell me.", grantsRumor: 'r_antenna_false' },
      { id: 'lyle_core', topic: 'core', text: "The core's real, out in the drowned pump-house. Getting to it's the easy part. Getting to it without the Greywater taking your iron, that's the trick — go by day, or go without metal, or pay a Strider who knows the safe hour.", grantsRumor: 'r_cache_paths' },
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
      { id: 'eun_greet', text: "The Survey trades in knowing. You bring me an observation or a coin, I give you a law you can stake your life on. That is the whole of the arrangement." },
      { id: 'eun_grey_ask', topic: 'greywater', text: "The Greywater? Our table on it is complete and confirmed. It is not free. Make it worth my ink." },
      { id: 'eun_lawmap', topic: 'law-map', text: "Here. The Greywater table, copied fair: the rust-bloom, the hum, the hour it wakes. Read it and you'll know the law cold — though a table is not the same as having seen it for yourself. Verify it in the field before you stake your iron on it.", grantsLeadTell: 'grey_rust_bloom', setsFacts: { 'known.tell.grey_rust_bloom': true, 'known.tell.grey_low_hum': true, 'known.purchased.greywater': true } },
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
      { id: 'mox_greet', text: "After the pump-house core, eh. I've been. Came out with all my fingers, which puts me ahead of most. The way in's for sale, if your coin's good." },
      { id: 'mox_cache', topic: 'core', text: "The bottoms only bite after dark, and only worked iron. Go in by daylight and they're just cold water. Or go in stripped of metal and let them hum at nothing. That's the whole secret, and I'll sell you the safe hour besides." },
      { id: 'mox_window', topic: 'safe-window', text: "Here's the safe hour and the dry line through the bottoms. Don't carry iron and you won't even need the hour. Don't say I never did you a kindness — and don't forget who sold it to you.", grantsLeadTell: 'grey_low_hum', setsFacts: { 'known.tell.grey_low_hum': true, 'known.tell.grey_rust_bloom': true, 'known.purchased.greywater': true, 'objective.cache_route': 'known' } },
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
