/**
 * THE HUSH — "The Cordon's Edge" world pack. A small, dense pocket just inside
 * the Cordon: a waystation, a Holdout, three factions' contacts, three lawful
 * anomalies (the Mile Road / the Greywater / the Antenna Field), and one prize
 * (the core) reachable at least three independent ways. Arrive broke and
 * under-informed; learn the world's hidden, lawful physics; carry the core out.
 */
import type { WorldPack } from '../../src/sdk/worldpack.js';
import { REGIONS, NODES, EDGES, ITEMS } from './world.js';
import { LAWS } from './laws.js';
import { TELL_LIBRARY } from './tells.js';
import { FACTIONS, NPCS, RUMORS } from './npcs.js';

export const HUSH_PACK: WorldPack = {
  meta: {
    id: 'hush.cordons-edge',
    title: "The Hush — The Cordon's Edge",
    version: '0.2.0', // feedback/0014 #1: the core can be lost to the dark Greywater ford on the carry-out
    schemaVersion: 1,
    licenseTier: 'green',
  },
  regions: REGIONS,
  nodes: NODES,
  edges: EDGES,
  items: ITEMS,
  npcs: NPCS,
  factions: FACTIONS,
  rumors: RUMORS,
  laws: LAWS,
  tellLibrary: TELL_LIBRARY,
  start: {
    node: 'waystation',
    inventory: ['iron_knife', 'lantern', 'coin_roll'],
    facts: {
      'world.patrol.cordon_checkpoint': 'cordon_patrol',
      'awareness.cordon_patrol': 'unaware',
      'objective.lead':
        'The core lies in the drowned pump-house, deep in the Greywater bottoms. Get to it, get it, get out — and learn the laws before they teach you.',
      'meta.coins': 3,
    },
    opening:
      "You came in on the last cordon truck with three coins, what iron you could borrow, and a rumour: that something the Survey calls only 'the core' lies out in the drowned bottoms, and that everyone who matters on this Edge wants it. The waystation door bangs shut behind you, and the quiet on the far side of it is the listening kind. The Hush is waiting.",
  },
  goals: [
    {
      // feedback/0014 #1 — the core is anomalous WORKED matter, and the Greywater hungers for
      // worked matter after dark. Carry it out across the (unavoidable) dark Greywater ford and
      // it slumps to dead ore in your hands. This is checked BEFORE the win goals, so a naive
      // after-dark carry-out LOSES — the deduced Greywater law is now ON the win path, not
      // bypassable. Telegraphed by two escalating warnings (the carry-out ladder); leaving the
      // water or waiting out the dark recovers the core fully. No unwarned loss, ever.
      id: 'lost_core_to_greywater',
      when: { fact: 'possession.pc.salvage_core.condition', eq: 'ore' },
      outcome: 'lost',
      title: 'The Water Remembered',
      epilogue:
        'The core slumps in your hands to a fist of red, rotten ore — the wrong weight gone out of it, the warmth gone cold, ordinary and ruined. You carried worked anomaly into iron-hungry water after dark, and the Greywater did to it what it does to every worked thing the dark can reach: it called it home, and remembered what it was for. You were warned, twice, and the prize itself told you it was failing in your hands. Somewhere out past the wire the Survey is still waiting for a core that will never come, and you are standing in the dark holding the proof that the Hush keeps its laws whether or not you have learned them.',
    },
    {
      id: 'recover_core_mastery',
      when: {
        all: [
          { fact: 'possession.pc.salvage_core', eq: true },
          { fact: 'loc.pc', eq: 'waystation' },
          // you READ them true at some point — even if drift has since re-Settled them,
          // the mastery was real (the ending recognises the high-water mark, not the live stage).
          { fact: 'known.mile_road.ever_surveyed', eq: true },
          { fact: 'known.greywater.ever_surveyed', eq: true },
          { fact: 'known.antenna_field.ever_surveyed', eq: true }, // the listening field is load-bearing for mastery now (no more "read each law" on two)
        ],
      },
      outcome: 'won',
      title: 'The Core, Carried Out — and the Hush, Read True',
      epilogue:
        'You set the core on the waystation bench under the buzzing light, and only then let yourself breathe. It is warm, and wrongly heavy, and entirely real. You did not buy your way past the Hush, and you did not luck your way past it. You read it — the dishonest road, the iron-hungry water, the listening field — each law in turn, until it had nothing left to surprise you with, and then you walked through it like a man who knew the house. That is the only victory the Hush offers, and you took the whole of it: not to beat the Zone, but to understand it well enough that it stands aside. It will re-Settle. The laws will shift. But you know how to learn them now, and that is a thing the Zone cannot take back.',
    },
    {
      id: 'recover_core_bought',
      when: {
        all: [
          { fact: 'possession.pc.salvage_core', eq: true },
          { fact: 'loc.pc', eq: 'waystation' },
          { fact: 'reputation.pc.striders', gte: 1 },
        ],
      },
      outcome: 'won',
      title: 'The Core, Carried Out — on a Bought Map',
      epilogue:
        'You set the core on the waystation bench under the buzzing light, and only then let yourself breathe. It is warm, and wrongly heavy, and entirely real — and it is not, strictly, yours. You paid the Striders for the way in, and Mox does not forget a debt or a face. Somewhere out past the wire she is already telling someone that the new arrival has the pump-house core, and that arrivals who buy their luck instead of learning it tend to need to buy it again. You got out. You did not, quite, get free. The Hush kept one law in reserve, the oldest one: what you do not understand, you remain at the mercy of.',
    },
    {
      id: 'recover_core',
      when: {
        all: [
          { fact: 'possession.pc.salvage_core', eq: true },
          { fact: 'loc.pc', eq: 'waystation' },
        ],
      },
      outcome: 'won',
      title: 'The Core, Carried Out',
      epilogue:
        'You set the core on the waystation bench under the buzzing light, and only then let yourself breathe. It is warm, and wrongly heavy, and entirely real. Outside the wire, the Hush goes on as it always has — the Mile Road measuring dishonestly, the Greywater calling iron home, the antennas listening for a name. You came through it more by nerve than by knowing, and you can feel, in the ache of your hands where they will not quite stop shaking, how thin that margin was.',
    },
    {
      // The Mile Road bites: look back four times (after three escalating warnings) and the
      // road behind you grows endless — you are trapped on it, the next salvager facing the
      // wrong way. A telegraphed, deducible death; the rule the blind swarm found toothless.
      id: 'lost_to_mile_road',
      when: { fact: 'law.mile_road.contacts', gte: 4 },
      outcome: 'lost',
      title: 'The Road Took You Home',
      epilogue:
        'The waystation is gone — there is only road behind you, and more road, growing, and you understand with a calm and final clarity that you will walk it now until you are the next salvager someone finds facing the wrong way. You were warned, three times and then in your own gut: do not look back. You looked back, and the Mile Road kept its true length, and gave you the whole of it at once. The Hush did not kill you. It simply stopped letting you arrive.',
    },
    {
      // The Hollow Dark bites: hold still in the deep night four times (after three escalating
      // warnings) and the dark closes the last of the distance. Telegraphed, deducible — the same
      // fair ladder as the Mile Road, for the agency law the swarm found toothless ("never charges").
      id: 'lost_to_hollow_dark',
      when: { fact: 'law.hollow_dark.closer', gte: 4 },
      outcome: 'lost',
      title: 'The Dark Closed the Distance',
      epilogue:
        'You stopped, in the deep, after dark, the way the salvager at the fork stopped — and the dark came up to you and stopped too. There was no wound, no struggle; with the Hollow Dark there rarely is. You were warned, three times and then by the loudening of your own heart: do not be still here. You were still, once too often. The Hollow Dark does not chase. It waits for you to stop, and you stopped, and now you are a part of the quiet it keeps.',
    },
    {
      id: 'lost_to_hush',
      when: { fact: 'survival.pc', eq: 'dead' },
      outcome: 'lost',
      title: 'Taken',
      epilogue:
        'The Hush takes you the way it takes everything — completely, lawfully, and without malice. Somewhere a Cordon warden will sign one more MISSING form, and the laws you almost learned will go on being true for someone else to learn.',
    },
  ],
  seedVariance: {
    // the three teaching laws always run; the deeper "Hollow Dark" is the rotating
    // slot, so ~half of seeds surface a never-before-seen law (replay variance).
    liveLaws: { min: 3, max: 4, always: ['mile_road', 'greywater', 'antenna_field'] },
    rerollRumorTruth: false,
    startKits: [
      { id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} },
      { id: 'pry', items: ['crowbar', 'lantern', 'coin_roll'], facts: {} },
      { id: 'light', items: ['iron_knife', 'coin_roll'], facts: {} },
    ],
  },
};

export default HUSH_PACK;
