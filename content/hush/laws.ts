/**
 * The three anchor laws of the Cordon's Edge. Each modifies EXACTLY ONE
 * effect-category (topology / material / summon); their triggers + ambient gates
 * are category-free. Every lethal-by-delegation law (the Antenna Field) carries
 * the delegated-lethality clamp; every law is learnable-to-surveyed via
 * non-lethal observation before it can seriously hurt you (fail-safe first
 * contact). The declared `interactions` are the authored cross-law edges:
 * Mile Road (distance) × Antenna Field (sound) couple into a worse exposure.
 */
import type { LawDefinition } from '../../src/sdk/law.js';

export const LAWS: LawDefinition[] = [
  {
    id: 'mile_road',
    title: 'The Mile Road',
    scope: { nodes: ['mile_road_low', 'mile_road_high'] },
    effectCategory: 'topology',
    trigger: { intent: 'look_back' },
    effect: { kind: 'distance_mult', factor: 2, applies: 'behind' },
    tells: [
      { id: 'mile_milepost_reset', channel: 'sight', weight: 3, advancesTo: 'referenced', at: { nodes: ['mile_road_low', 'mile_road_high'] } },
      { id: 'mile_shadow_long', channel: 'sight', weight: 2, advancesTo: 'approximate', at: { nodes: ['mile_road_low', 'mile_road_high'] } },
      { id: 'mile_dead_walker', channel: 'sight', weight: 3, advancesTo: 'approximate', at: { nodes: ['mile_road_high'] }, deadAdventurer: true },
    ],
    discovery: { surveyVia: ['examine the mileposts', 'examine the dead walker'], minTellsToSurvey: 2 },
    failSafe: {
      firstContact: {
        tell: 'You glance back — and the road behind you yawns suddenly twice as long, the waystation dwindled to a far grey smudge. Something in you slips a notch out of true. (You are Unsettled.)',
      },
    },
    interactions: ['antenna_field'],
    drift: { everyTurns: 40, driftAfter: 8, mutates: 'window', predemotionTell: 'mile_milepost_reset' },
    lore: 'The Settling pulled the road long. It keeps its true length at your back, where you cannot watch it.',
  },
  {
    id: 'greywater',
    title: 'The Greywater',
    scope: { nodes: ['greywater_ford', 'greywater_bottoms', 'greywater_cache'] },
    // "after dark" begins at dusk — so a naive straight march to the cache lands
    // in the law's teeth (first contact warns; it never kills), and beating it
    // means going fast (the stealth shortcut, by day), stripping metal, or buying
    // the safe hour. This is the seam where knowledge has to start paying.
    ambientGate: { phase: ['dusk', 'night'] },
    effectCategory: 'material',
    trigger: { phase: ['dusk', 'night'] },
    effect: { kind: 'degrade_item_class', itemClass: 'metal', toCondition: 'ore' },
    tells: [
      { id: 'grey_rust_bloom', channel: 'sight', weight: 3, advancesTo: 'referenced', at: { nodes: ['greywater_ford', 'greywater_bottoms'] } },
      { id: 'grey_low_hum', channel: 'sound', weight: 2, advancesTo: 'approximate', at: { nodes: ['greywater_ford', 'greywater_bottoms'] } },
      { id: 'grey_slumped_blade', channel: 'sight', weight: 3, advancesTo: 'approximate', at: { nodes: ['greywater_ford'] }, deadAdventurer: true },
    ],
    discovery: { surveyVia: ['examine the rust-bloom', 'listen for the hum'], minTellsToSurvey: 2 },
    failSafe: {
      firstContact: {
        tell: 'The rivets of your kit bloom red-orange and soft. You touch a blade to your thumb and it folds like wet clay. (Your worked iron is failing.)',
      },
    },
    interactions: ['mile_road'],
    drift: { everyTurns: 50, driftAfter: 9, mutates: 'window', predemotionTell: 'grey_low_hum' },
    lore: 'After dark the Greywater remembers what worked iron used to be, and calls it back to ore.',
  },
  {
    id: 'antenna_field',
    title: 'The Antenna Field',
    scope: { nodes: ['antenna_field'] },
    effectCategory: 'summon',
    secondaryCategories: ['perception'],
    trigger: { spokeName: true },
    effect: { kind: 'summon', entity: 'the_changed', via: 'utterance', radius: 1 },
    tells: [
      { id: 'antenna_field_hum', channel: 'sound', weight: 3, advancesTo: 'referenced', at: { nodes: ['antenna_field'] } },
      { id: 'antenna_far_echo', channel: 'sound', weight: 2, advancesTo: 'approximate', at: { nodes: ['antenna_field'] } },
      { id: 'antenna_name_stones', channel: 'sight', weight: 3, advancesTo: 'approximate', at: { nodes: ['antenna_field'] }, deadAdventurer: true },
    ],
    discovery: { surveyVia: ['examine the name-stones', 'listen to the field'], minTellsToSurvey: 2 },
    failSafe: {
      firstContact: {
        tell: 'The antennas take your word and carry it. You hear your own voice answer from a mile out in the dark — late, and wrong. Something turns toward the sound, and begins to come. (Be quiet now, or be gone.)',
      },
      delegatedClamp: true,
    },
    interactions: ['mile_road'],
    combatConsequence: true,
    drift: { everyTurns: 60, driftAfter: 10, mutates: 'tells', predemotionTell: 'antenna_field_hum' },
    lore: 'The field still listens on dead channels. Give it a name and it will broadcast you to everything that hungers.',
  },
  {
    id: 'hollow_dark',
    title: 'The Hollow Dark',
    scope: { nodes: ['the_fork', 'antenna_field', 'mile_road_high'] },
    ambientGate: { phase: ['night'] },
    effectCategory: 'agency',
    trigger: { intent: ['wait', 'rest'] },
    effect: { kind: 'impose_condition', condition: 'unsettled', severity: 'reversible' },
    tells: [
      { id: 'hollow_silence', channel: 'sound', weight: 3, advancesTo: 'referenced', at: { nodes: ['the_fork', 'antenna_field', 'mile_road_high'] } },
      { id: 'hollow_heartbeat', channel: 'touch', weight: 2, advancesTo: 'approximate', at: { nodes: ['the_fork', 'antenna_field'] } },
      { id: 'hollow_sitter', channel: 'sight', weight: 3, advancesTo: 'approximate', at: { nodes: ['the_fork'] }, deadAdventurer: true },
    ],
    discovery: { surveyVia: ['listen to the silence', 'examine the sitter'], minTellsToSurvey: 2 },
    failSafe: {
      firstContact: {
        tell: 'You stop to rest — and the dark leans in. The silence presses on your ears; your own pulse goes loud and slow; and you understand, in your spine, that stillness here is a mistake. (You are Unsettled, and the dark is one step closer.)',
      },
    },
    interactions: ['antenna_field'],
    drift: { everyTurns: 45, driftAfter: 8, mutates: 'window', predemotionTell: 'hollow_silence' },
    lore: 'Out in the deep, the Hush hunts by stillness. It is patient. It is always patient.',
  },
];
