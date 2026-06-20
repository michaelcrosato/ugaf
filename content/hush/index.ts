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
  meta: { id: 'hush.cordons-edge', title: "The Hush — The Cordon's Edge", version: '0.1.0', schemaVersion: 1, licenseTier: 'green' },
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
      'objective.lead': 'The core lies in the drowned pump-house, deep in the Greywater bottoms. Get to it, get it, get out — and learn the laws before they teach you.',
    },
    opening:
      "You came in on the last cordon truck with three coins, a borrowed knife, and a rumour: that something the Survey calls only 'the core' lies out in the drowned bottoms, and that everyone who matters on this Edge wants it. The waystation door bangs shut behind you. The Hush is waiting, and it is very, very quiet.",
  },
  goals: [
    {
      id: 'recover_core',
      when: { all: [{ fact: 'possession.pc.salvage_core', eq: true }, { fact: 'loc.pc', eq: 'waystation' }] },
      outcome: 'won',
      title: 'The Core, Carried Out',
      epilogue:
        "You set the core on the waystation bench under the buzzing light, and only then let yourself breathe. It is warm, and wrongly heavy, and entirely real. Outside the wire, the Hush goes on keeping its lawful, patient strangeness — the Mile Road measuring dishonestly, the Greywater calling iron home, the antennas listening for a name. But you learned them, each in turn, and they let you pass. That is the only victory the Hush offers: not to beat it, but to understand it well enough that it lets you leave. For now.",
    },
    {
      id: 'lost_to_hush',
      when: { fact: 'survival.pc', eq: 'dead' },
      outcome: 'lost',
      title: 'Taken',
      epilogue: 'The Hush takes you the way it takes everything — completely, lawfully, and without malice. Somewhere a Cordon warden will sign one more MISSING form, and the laws you almost learned will go on being true for someone else to learn.',
    },
  ],
  seedVariance: {
    liveLaws: { min: 3, max: 3, always: ['mile_road', 'greywater', 'antenna_field'] },
    rerollRumorTruth: false,
    startKits: [
      { id: 'broke', items: ['iron_knife', 'lantern', 'coin_roll'], facts: {} },
      { id: 'pry', items: ['crowbar', 'lantern', 'coin_roll'], facts: {} },
      { id: 'light', items: ['lantern', 'coin_roll'], facts: {} },
    ],
  },
};

export default HUSH_PACK;
