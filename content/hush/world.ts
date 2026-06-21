/**
 * The Cordon's Edge — geography, items, and the node prose. The craft brief:
 * a STRICT sensory baseline (silence, wrong light, the hush) that each anomaly
 * violates legibly; a few very particular details per room, deeply examinable;
 * reactive variants + cycling ambients so the place breathes; the lethal laws
 * always pre-warned by an observable tell (and, where possible, a dead walker).
 */
import type { RegionDef, NodeDef, EdgeDef, ItemDef } from '../../src/sdk/worldpack.js';

export const REGIONS: RegionDef[] = [
  {
    id: 'cordon',
    name: 'The Cordon',
    palette: {
      sight:
        'Floodlights, razor-wire, and the long quiet of a quarantine that has stopped expecting anything to happen.',
      sound: 'Generators. The wind in the wire.',
      smell: 'Diesel and cold mud.',
    },
    description: 'The thin skin of order the outside world keeps stretched over the Hush.',
  },
  {
    id: 'holdout',
    name: "Lyle's Rest",
    palette: {
      sight: 'Lamplit shacks and salvaged tin, a settlement of people who would not leave.',
      sound: 'Low voices, a dog that does not bark, the click of a hand-pump.',
      smell: 'Woodsmoke, boiled grain, rust.',
    },
    description: 'A Holdout: the people the Settling caught and kept.',
  },
  {
    id: 'mileroad',
    name: 'The Mile Road',
    palette: {
      sight:
        'A straight grey road between dead fields, mileposts marching off toward a horizon that never seems to get closer.',
      sound: 'Your own footsteps, and a second set a half-beat behind them.',
      smell: 'Dust, and under it something like ozone.',
    },
    description: 'The old county road into the deep Zone. It does not measure honestly.',
  },
  {
    id: 'greywater',
    name: 'The Greywater',
    palette: {
      sight: 'Black water standing in flooded bottoms, and the bones of a drowned hamlet leaning out of it.',
      sound: 'Dripping. A low hum you feel before you hear.',
      smell: 'Iron, silt, and rot.',
    },
    description: 'A flooded low place where, after dark, worked metal forgets itself.',
  },
  {
    id: 'antenna',
    name: 'The Antenna Field',
    palette: {
      sight:
        'A field of dead broadcast antennas, rust-red against a colourless sky, humming on channels that closed years ago.',
      sound: 'A hum that takes the shape of whatever you last said.',
      smell: 'Hot metal and old concrete.',
    },
    description: 'A relay station the Settling left listening. It still answers.',
  },
];

export const ITEMS: ItemDef[] = [
  {
    id: 'iron_knife',
    names: ['knife', 'iron knife', 'blade'],
    itemClass: 'metal',
    portable: true,
    look: {
      base: 'A good iron skinning knife, worn to the shape of a hand. Worked metal — the kind the Greywater hungers for.',
    },
  },
  {
    id: 'crowbar',
    names: ['crowbar', 'pry bar', 'bar'],
    itemClass: 'metal',
    portable: true,
    look: {
      base: 'A two-foot iron crowbar. Heavy, useful, and entirely the wrong thing to carry into the Greywater after dark.',
    },
  },
  {
    id: 'lantern',
    names: ['lantern', 'lamp', 'light'],
    itemClass: 'light',
    portable: true,
    look: { base: 'A shuttered oil lantern. Its flame is the only honest light out here.' },
  },
  {
    id: 'coin_roll',
    names: ['coins', 'coin', 'money', 'roll', 'cash', 'scrip'],
    itemClass: 'coin',
    portable: true,
    look: { base: 'A thin roll of cordon scrip and a few hard coins. Not much. Enough to start a conversation.' },
  },
  {
    id: 'salvage_core',
    // 'anomalous' worked matter — NOT 'metal', so the Greywater's iron-degrade leaves it alone;
    // its danger is the bespoke "core in the water" hunger handled in anomaly.hush, which slumps
    // it to 'ore' (the lose-state) if you ford the Greywater with it after dark.
    names: ['core', 'anomalous core', 'salvage', 'the core'],
    itemClass: 'anomalous',
    portable: true,
    look: {
      // FORESHADOW the carry-out danger BEFORE the bite (feedback/0015 #1): the world taught "the
      // Greywater eats IRON," and the core is pointedly NOT iron — so players reasonably dropped
      // their iron and carried the core out to ore, a loss that contradicted what they were taught.
      // The clue must be placed before the bite: the core is WORKED, CHANGED matter, exactly the
      // kind of thing the drowned water hungers for. Examining the prize now warns you.
      base: 'A fist-sized knot of something that is not quite metal and not quite stone, warm to the touch, and faintly, wrongly heavy — as if it weighed more than the space it takes up. This is what the Survey would kill for, and what the Striders would too. It is worked, altered matter — the Settling reached into ordinary stuff and changed it — and that is the danger in it: the drowned Greywater hungers for worked and altered things the way it hungers for iron, and harder. You would no more carry this through the bottoms after dark than you would a blade; the water would call it apart in your hands.',
      variants: [
        {
          // telegraphed threat state: once the Greywater has started calling the core apart
          // (rung 1/2 of the carry-out ladder), the prize itself reads as failing — get it to
          // dry ground (leave the water) or wait out the dark, and it knits back whole.
          when: { fact: 'possession.pc.salvage_core.condition', eq: 'unstable' },
          text: "The core's wrong weight is sloughing in your hands — the Greywater is calling it apart, the way it calls the iron. Get it clear of the water, or wait out the dark, before there is nothing worked left to carry.",
        },
      ],
    },
  },
  {
    id: 'antenna_relic',
    names: ['relic', 'shard', 'antenna shard', 'crystal'],
    itemClass: 'salvage',
    portable: true,
    look: {
      base: 'A shard of antenna-glass the Settling fused into something that still faintly sings, on a channel just below hearing. The Survey would trade real knowledge for a piece like this — if you can carry it out of the field without giving the field your voice.',
    },
  },
];

export const NODES: NodeDef[] = [
  {
    id: 'waystation',
    title: 'The Cordon Waystation',
    regionId: 'cordon',
    kind: 'waystation',
    look: {
      base: 'A breeze-block hut inside the wire, lit by one buzzing tube. A bench, a stove gone cold, a wall of curling notices: MISSING, RESTRICTED, DO NOT ENTER AFTER DARK. This is as far in as the outside world is willing to come, and as far out as most who go past it ever get.',
      variants: [
        {
          when: { fact: 'possession.pc.salvage_core', eq: true },
          text: 'The notices seem to watch you now. The thing in your pack is warm against your spine, and it does not belong on this side of the wire.',
        },
      ],
      ambient: [
        'Outside, a floodlight hums and a moth the size of a thumb beats itself stupid against it.',
        'The wind finds a gap in the block and makes a low, tuneless note.',
        'Somewhere out past the wire, the Hush is doing whatever the Hush does, and not telling you.',
      ],
      firstReveal:
        "A hand-drawn map is pinned by the door: the Mile Road, the drowned Greywater, the Antenna Field — and a red circle, deep in the bottoms, marked only with a question mark. Someone has written beneath it: THE CORE IS REAL. DON'T LOOK BACK. DON'T SPEAK ITS NAME. DON'T CARRY IRON IN AT NIGHT.",
    },
    examinables: [
      {
        id: 'notices',
        names: ['notices', 'wall', 'posters', 'map'],
        look: {
          base: "Among the MISSING faces and the RESTRICTED stamps, three lines are underlined by three different hands: DON'T LOOK BACK ON THE MILE ROAD. THE GREYWATER EATS IRON AFTER DARK. NEVER SAY A NAME AT THE ANTENNAS. Folk wisdom, paid for in folk.",
        },
      },
    ],
    exits: [{ dir: 'out', to: 'cordon_checkpoint', label: 'out to the checkpoint', via: 'e_way_check' }],
  },
  {
    id: 'cordon_checkpoint',
    title: 'The Checkpoint',
    regionId: 'cordon',
    kind: 'junction',
    look: {
      base: 'A boom gate, a sandbagged post, and a pair of Cordon troopers who would rather be anywhere else. Past the gate the maintained road runs down to the Holdout; off to the side, a gap in the wire and a footpath nobody admits to using cuts straight toward the fork in the deep road.',
      variants: [
        {
          when: { fact: 'awareness.cordon_patrol', eq: 'alert' },
          text: 'The troopers are up and scanning now, torches swinging. The gap in the wire is not an option while they are looking.',
        },
        {
          when: { fact: 'flag.hidden', eq: true },
          text: "You are low in the dark at the edge of the floodlight's throw. The troopers' attention slides over you and away.",
        },
        {
          when: { fact: 'possession.pc.salvage_core', eq: true },
          text: "Warden Holt's eyes go to your pack and stay there. He knows the shape of what you carry — they all do, eventually. The boom gate is down and the troopers have drifted to the wire, watching the open ground for exactly what rides in your pack: you will not simply walk it out under their noses. Holt himself does not stop you — stopping people is not really what the Cordon is for, out here — but he marks your face the way a man marks a debt he means to collect.",
        },
        // dynamic route legibility (feedback/0013 #1): name which way out is open, and WHY the others are shut.
        // (gated on PLAYER-VISIBLE facts — objective/possession/reputation — so the renderer actually fires them.)
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { fact: 'objective.knows_gap', eq: true },
              { phase: ['dusk', 'night', 'predawn'] },
              { fact: 'awareness.cordon_patrol', neq: 'alert' },
              { not: { fact: 'flag.hidden', eq: true } }, // once you HAVE hidden, the way-open variant takes over (#4)
            ],
          },
          text: 'You know this gate now, the way Holt told it: the wedge of dark by the north post where the floodlight throws crooked. The dark is on your side for it. Go low and quiet there (HIDE) while the troopers are not roused, and you can be through it before they think to look.',
        },
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { fact: 'objective.knows_gap', eq: true },
              { fact: 'phase.now', eq: 'day' },
            ],
          },
          text: 'You know where the floodlight falls short now — but that wedge of dark is no use to you in broad day. You will have to wait for the light to go before you can slip it (or find another way out).',
        },
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { not: { fact: 'objective.knows_gap', eq: true } },
              { not: { fact: 'reputation.pc.striders', gte: 1 } },
            ],
          },
          text: "You do not know this gate's rhythm — where its light falls short, or when. Holt might mutter it, in a talkative hour: ask him about the gap. Failing that, good iron would lever the wire-gap wide (if the Greywater has not taken its temper), or a Strider's debt would walk you out.",
        },
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              {
                any: [
                  { fact: 'possession.pc.iron_knife.condition', eq: 'ore' },
                  { fact: 'possession.pc.crowbar.condition', eq: 'ore' },
                ],
              },
            ],
          },
          text: 'The iron you carried went soft in the Greywater — slumped to rotten-red ore in your pack. There is no good metal left on you to lever the wire-gap; that road out is closed, and the Greywater closed it.',
        },
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { fact: 'reputation.pc.striders', gte: 1 },
              { not: { fact: 'flag.intercept_clear', eq: true } },
            ],
          },
          text: 'A Strider owes you a way through, and Mox keeps her debts. Lean on it, and you will be walked out past the wire like baggage.',
        },
        // feedback/0013 #4 — once a route out is EARNED, stop re-offering the spent escape and the
        // road no longer "silently un-blocks": say plainly the way is open and that BACK to the
        // waystation is the finish. A `replace:true` variant supplants the stale route instructions
        // for this beat (so a player who just HID isn't told to HIDE again).
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { fact: 'flag.intercept_clear', eq: true },
            ],
          },
          replace: true,
          text: 'The wire-gap is levered wide and the core is already through it, into the dark beyond the fence. Nothing holds you at this gate now. The way is open — go BACK to the waystation, and you carry the core clear of the Hush.',
        },
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { fact: 'reputation.pc.striders', gte: 1 },
              { not: { fact: 'flag.intercept_clear', eq: true } },
            ],
          },
          replace: true,
          text: 'The Strider who owes you steps up to the boom gate and waves you through like baggage — Mox keeps her debts. The way is open. Go BACK to the waystation and you are out past the wire with the core.',
        },
        {
          when: {
            all: [
              { fact: 'possession.pc.salvage_core', eq: true },
              { fact: 'objective.knows_gap', eq: true },
              { fact: 'flag.hidden', eq: true },
              { fact: 'awareness.cordon_patrol', neq: 'alert' },
              { phase: ['dusk', 'night', 'predawn'] },
            ],
          },
          replace: true,
          text: "You are low in the wedge of dark by the north post, where the floodlight throws crooked, and the troopers' eyes are anywhere but here. This is the gap Holt told you of, and it is open. The way is yours — slip BACK to the waystation now, quiet and unhurried, and you carry the core clear of the wire.",
        },
      ],
      ambient: [
        'A radio crackles in the post and someone answers it in a bored monotone.',
        'One of the troopers lights a cigarette and does not offer you one.',
      ],
    },
    npcs: ['warden_holt'],
    exits: [
      {
        dir: 'back',
        to: 'waystation',
        label: 'back to the waystation',
        via: 'e_way_check',
        // carrying the core, the watched gate is an EARNED branch (feedback/0013 #1): a free HIDE is
        // not enough — slipping out needs the gate's blind spot (ask Holt about the gap), the cover of
        // DARK, and a calm patrol; or working iron to lever the gap; or a Strider's debt.
        when: {
          any: [
            { not: { fact: 'flag.intercepted', eq: true } },
            { fact: 'flag.intercept_clear', eq: true },
            { fact: 'reputation.pc.striders', gte: 1 },
            {
              all: [
                { fact: 'objective.knows_gap', eq: true },
                { fact: 'flag.hidden', eq: true },
                { fact: 'awareness.cordon_patrol', neq: 'alert' },
                { phase: ['dusk', 'night', 'predawn'] },
              ],
            },
          ],
        },
        blockedText:
          'The boom gate is down and the troopers are at the wire, watching for exactly what rides in your pack. You will not simply walk the core out under their noses. To slip past you must know where the floodlight falls short — ask Warden Holt about the gap — then go low and quiet (HIDE) under cover of dark, while they are not roused (by daylight the open ground is open ground). Or lever the wire-gap wide with good iron (USE your bar or knife — if the Greywater has not eaten its temper). Or lean on a debt, if the Striders owe you one.',
      },
      { dir: 'road', to: 'lyles_rest', label: "the maintained road, down to Lyle's Rest", via: 'e_check_lyle' },
      {
        dir: 'gap',
        to: 'the_fork',
        label: 'the gap in the wire, toward the fork',
        via: 'e_check_fork',
        when: {
          all: [
            { fact: 'awareness.cordon_patrol', neq: 'alert' },
            { fact: 'flag.hidden', eq: true },
          ],
        },
        blockedText: 'The troopers would see you cross the open ground. You would need to not be seen first.',
      },
    ],
  },
  {
    id: 'lyles_rest',
    title: "Lyle's Rest",
    regionId: 'holdout',
    kind: 'settlement',
    look: {
      base: 'A dozen shacks of salvaged tin around a hand-pump and a fire that is never quite let go out. The people here stayed when the Settling came, and stayed, and stayed, until staying became the only thing they knew how to do. They watch you the way you watch weather.',
      variants: [
        {
          when: { fact: 'possession.pc.salvage_core', eq: true },
          text: "The watching is different now. Word travels in a place this small, and everyone here knows the shape of what rides in your pack. The Striders' eyes follow you across the firelight, patient as creditors. You have what the whole Edge wants, and you still have to walk out past all of them.",
        },
      ],
      ambient: [
        'A child solemnly shows another child a stone, and the second child solemnly agrees that it is a stone.',
        'Someone is mending a net that will never see water. It is the mending that matters.',
        'The fire pops. Nobody flinches; flinching is for newcomers.',
      ],
    },
    npcs: ['holdout_lyle'],
    exits: [
      { dir: 'gate', to: 'cordon_checkpoint', label: 'back up to the checkpoint', via: 'e_check_lyle' },
      { dir: 'survey', to: 'survey_post', label: "the Survey's lean-to", via: 'e_lyle_survey' },
      { dir: 'salvage', to: 'salvager_camp', label: "the Striders' camp at the treeline", via: 'e_lyle_salvage' },
      { dir: 'road', to: 'mile_road_low', label: 'the Mile Road, into the deep Zone', via: 'e_lyle_mileroad' },
    ],
  },
  {
    id: 'survey_post',
    title: "The Survey's Lean-To",
    regionId: 'holdout',
    kind: 'poi',
    look: {
      base: 'A weatherproof lean-to crammed with paper: hand-drawn maps, law-tables in three colours of ink, a wall of index cards each bearing one observed rule of the Hush. The Survey trades in exactly one thing — knowing — and they price it like the lifesaver it is.',
      ambient: [
        'A pendulum on a string traces a slow figure that should be a circle and is not.',
        'Index cards riffle in a draught and settle wrong, in an order someone will have to fix.',
      ],
    },
    examinables: [
      {
        id: 'index_cards',
        names: ['cards', 'index cards', 'index card', 'card'],
        look: {
          base: 'Hundreds of cards, each a single observed rule in a different cramped hand: WORKED IRON SOFTENS IN THE GREYWATER AFTER DARK. THE MILE ROAD GROWS LONG BEHIND THE EYE. A NAME SPOKEN AT THE ANTENNAS IS ANSWERED. One card, pinned apart and underlined twice, reads: THE GREYWATER TAKES MORE THAN IRON — IT UN-MAKES ANY WORKED OR ANOMALOUS THING AFTER DARK, THE SALVAGE CORE AMONG THEM. Most are crossed out and re-written twice over — the laws drift, and the Survey re-files them, forever. Eun will sell you the fair copy of any one, for a coin or a thing you have seen yourself.',
        },
      },
      {
        id: 'law_tables',
        names: ['law-tables', 'law tables', 'law table', 'tables', 'maps'],
        look: {
          base: 'Great sheets ruled in three colours of ink — black for the confirmed, red for the contested, a thin green for the merely rumoured. The Greywater table is complete and black-inked: the rust-bloom, the hum, the hour it wakes — and a margin note in the same sure black hand: NOT IRON ALONE; THE WATER UN-MAKES ANY WORKED OR ANOMALOUS MATTER, THE CORE INCLUDED. Others trail off into red question-marks. This is knowing, made into a thing you can hold — and the Survey sells it by the law, never the sheet.',
        },
      },
    ],
    npcs: ['survey_factor'],
    exits: [{ dir: 'out', to: 'lyles_rest', label: "back to Lyle's Rest", via: 'e_lyle_survey' }],
  },
  {
    id: 'salvager_camp',
    title: "The Striders' Camp",
    regionId: 'holdout',
    kind: 'poi',
    look: {
      base: 'Tarps and a low fire at the edge of the dead trees. The Striders go in and bring things out — anomalous things, the kind that pay — and they will sell you a way to do the same, or a way to die trying, and they are not always careful which.',
      ambient: [
        'Something in a sealed crate shifts of its own accord, and a Strider kicks the crate without looking at it.',
        'A woman re-counts a fan of greasy coordinates and tucks them away.',
      ],
    },
    npcs: ['strider_mox'],
    exits: [{ dir: 'out', to: 'lyles_rest', label: "back to Lyle's Rest", via: 'e_lyle_salvage' }],
  },
  {
    id: 'mile_road_low',
    title: 'The Mile Road — First Mile',
    regionId: 'mileroad',
    kind: 'junction',
    look: {
      base: "The road runs dead straight between fields of grey, dead wheat. A milepost stands at the verge. Behind you, the lamps of Lyle's Rest. Ahead, more road, and more mileposts, dwindling toward a horizon the colour of a held breath.",
      variants: [
        {
          when: { fact: 'facing.pc', eq: 'behind' },
          text: "You are looking back the way you came — and the lamps of the Rest seem further off than a few minutes' walk could account for.",
        },
        {
          when: { fact: 'known.law.mile_road', eq: 'surveyed' },
          text: 'You walk it the way you have learned to now: eyes front, chin level, never once turning round. The road can only lie about what is behind you — so you give it nothing behind you to lie about.',
        },
      ],
      ambient: [
        'The wheat does not move, though the wind is enough to move it.',
        'Your footsteps echo a half-beat late, as if the road were repeating them to itself.',
      ],
    },
    tells: ['mile_milepost_reset', 'mile_shadow_long'],
    examinables: [
      {
        id: 'milepost',
        names: ['milepost', 'post', 'marker', 'sign'],
        tell: 'mile_milepost_reset',
        look: {
          base: 'A concrete milepost, the numeral worn but legible.',
          variants: [
            {
              when: { fact: 'facing.pc', eq: 'behind' },
              text: 'It reads the same numeral as the last one. You are certain it should not.',
            },
          ],
        },
      },
    ],
    exits: [
      { dir: 'back', to: 'lyles_rest', label: "back toward Lyle's Rest", via: 'e_lyle_mileroad' },
      { dir: 'on', to: 'mile_road_high', label: 'on, deeper along the Mile Road', via: 'e_mileroad' },
    ],
  },
  {
    id: 'mile_road_high',
    title: 'The Mile Road — Deep Mile',
    regionId: 'mileroad',
    kind: 'junction',
    look: {
      base: 'Further in. The fields have given up even the pretence of wheat. A salvager sits against a milepost here, long dead, facing the way she came. Where the road bends, a footpath drops toward the sound of standing water; another runs off toward a field of rust-red towers that hum.',
      ambient: [
        "The dead woman's coat stirs in a wind you cannot feel.",
        'Far off, the antennas catch some sound and hum it back, shapeless.',
      ],
    },
    tells: ['mile_milepost_reset', 'mile_dead_walker'],
    examinables: [
      {
        id: 'dead_walker',
        names: ['walker', 'dead woman', 'salvager', 'body', 'corpse'],
        tell: 'mile_dead_walker',
        look: {
          base: 'A salvager, weeks dead, sitting against the post facing back the way she came. The ground around her is churned into a thousand looping bootprints — she walked, and walked, and the road behind her kept growing, and she never once reached the end of it. She is still facing back. She never stopped looking.',
        },
      },
      {
        id: 'milepost_high',
        names: ['milepost', 'post', 'marker'],
        tell: 'mile_milepost_reset',
        look: { base: 'A milepost, like the others. Like the others, it lies about the distance at your back.' },
      },
    ],
    exits: [
      { dir: 'back', to: 'mile_road_low', label: 'back along the Mile Road', via: 'e_mileroad' },
      { dir: 'fork', to: 'the_fork', label: 'the fork, where the deep paths divide', via: 'e_mile_fork' },
      { dir: 'antennas', to: 'antenna_field', label: 'toward the humming towers', via: 'e_mile_antenna' },
    ],
  },
  {
    id: 'the_fork',
    title: 'The Fork',
    regionId: 'greywater',
    kind: 'junction',
    look: {
      base: "Where three ways meet under a leaning signpost stripped of its signs. One path drops to the Greywater bottoms; one climbs back to the Mile Road; one runs flat toward the antenna field. A cut in the wire to the north is the troopers' blind path back to the checkpoint.",
      ambient: [
        "The signpost's bare bolt-holes stare like empty eyes.",
        'Water-sound rises from the bottoms, then stops, as if listening back.',
        'The quiet here has a grain to it, like something holding its breath.',
      ],
    },
    tells: ['hollow_silence'],
    examinables: [
      {
        id: 'sitter',
        names: ['sitter', 'salvager', 'man', 'body', 'figure'],
        tell: 'hollow_sitter',
        look: {
          base: 'A salvager sits cross-legged in the dark a little way off the path, perfectly still, the way a person sits to catch their breath. He has been catching it for some time. Nothing marks him — no wound, no struggle. He simply stopped, in the deep, after dark, and the dark came up to him and stopped too.',
          variants: [
            {
              when: { not: { fact: 'law.hollow_dark.live', eq: true } },
              text: 'A salvager lies dead a little way off the path — old, weathered, ordinary as the Zone gets. Whatever took him, it was nothing that is still here.',
              replace: true,
            },
            {
              when: { fact: 'phase.now', eq: 'day' },
              text: 'By day he is just a dead man, and the path runs past him without comment.',
            },
          ],
        },
      },
    ],
    exits: [
      { dir: 'mile', to: 'mile_road_high', label: 'back up to the Mile Road', via: 'e_mile_fork' },
      { dir: 'water', to: 'greywater_ford', label: 'down to the Greywater ford', via: 'e_fork_grey' },
      { dir: 'antennas', to: 'antenna_field', label: 'across to the antenna field', via: 'e_fork_antenna' },
      {
        dir: 'wire',
        to: 'cordon_checkpoint',
        label: 'the cut in the wire, back toward the checkpoint',
        via: 'e_check_fork',
      },
    ],
  },
  {
    id: 'greywater_ford',
    title: 'The Greywater Ford',
    regionId: 'greywater',
    kind: 'junction',
    look: {
      base: 'Black standing water laps a broken causeway. A drowned hamlet leans out of the flood, roofs at the wrong angles. Worked metal lies everywhere in the silt — and some of it has gone soft, slumping into red smears of ore as you watch.',
      variants: [
        {
          when: { fact: 'phase.now', eq: 'dusk' },
          text: 'The light is going, and the water is starting to wake. A low hum is finding the iron in your kit — you can feel it answer. Whatever un-makes worked metal here, it is opening its eyes. You have minutes, not hours.',
        },
        {
          when: { fact: 'phase.now', eq: 'night' },
          text: 'It is full dark now, and the water has woken. The hum comes up through the causeway stones and into every rivet and blade you carry. The rust-bloom is faster than rust has any right to be.',
        },
        {
          when: { fact: 'phase.now', eq: 'day' },
          text: 'In daylight the bottoms are only flooded and sad. Whatever lives in the dark here is sleeping; the metal in the silt is just metal.',
        },
        {
          when: {
            all: [
              { fact: 'phase.now', eq: 'predawn' },
              { fact: 'law.greywater.window_drifted', eq: true },
            ],
          },
          text: 'The grey before dawn used to be the safe hour — you learned it was. But the hum has not gone back to sleep with the coming light the way it once did; the water keeps its hungry hours longer now than the law you read. The iron on you is already beginning to answer it.',
        },
        {
          when: { fact: 'known.law.greywater', eq: 'surveyed' },
          text: 'You know this water now — what it wants, and when it wakes to want it. You weigh the iron on you against the failing light, and you do the sum the dead in the silt never learned to do.',
        },
        {
          when: { all: [{ fact: 'possession.pc.salvage_core', eq: true }, { phase: ['dusk', 'night'] }] },
          text: 'No time to linger now — the water is wide awake, and it has caught the scent of the core at your spine. The hum is not just in your rivets; it is in the core itself, the wrong-heavy weight of it answering the bottoms the way the iron does. Worked anomaly is still worked matter, and the Greywater wants it home. Get it to dry ground — up to the fork, out of the water — before the dark calls it apart. Move.',
          replace: true,
        },
      ],
      ambient: [
        'Something drips, and the drip is answered, a beat late, from inside a drowned house.',
        'A fish that is the wrong shape turns over once and is gone.',
      ],
    },
    tells: ['grey_rust_bloom', 'grey_slumped_blade'],
    examinables: [
      {
        id: 'rust_bloom',
        names: ['rust', 'rust-bloom', 'bloom', 'rivets'],
        tell: 'grey_rust_bloom',
        look: {
          base: 'Rust spreading across worked iron like frost on glass — fast enough that you can watch a rivet go from grey to red-orange in the time it takes to breathe.',
        },
      },
      {
        id: 'slumped_blade',
        names: ['blade', 'knife', 'slumped knife', 'smear'],
        tell: 'grey_slumped_blade',
        look: {
          base: 'A good knife, half-sunk in the silt — except the blade has slumped into a smear of red ore, as if it had always been melting and only just remembered to. Beside it, a hand. The rest of the salvager is under the water.',
        },
      },
    ],
    exits: [
      { dir: 'back', to: 'the_fork', label: 'back up to the fork', via: 'e_fork_grey' },
      { dir: 'in', to: 'greywater_bottoms', label: 'out into the flooded bottoms', via: 'e_grey_bottoms' },
    ],
  },
  {
    id: 'greywater_bottoms',
    title: 'The Greywater Bottoms',
    regionId: 'greywater',
    kind: 'poi',
    look: {
      base: "You wade the bottoms between drowned walls. The water is cold past cold. Somewhere ahead, in the wreck of the old pump-house, the Survey's question-mark cache is supposed to lie.",
      variants: [
        {
          when: { fact: 'phase.now', eq: 'dusk' },
          text: 'The hum is rising as the light dies. The iron in your kit is beginning to go soft and rotten-red at the edges.',
        },
        {
          when: { fact: 'phase.now', eq: 'night' },
          text: 'The hum is everywhere now, in the water and the iron and your teeth. Any worked metal you carry is dying in your hands.',
        },
        {
          when: {
            all: [
              { fact: 'phase.now', eq: 'predawn' },
              { fact: 'law.greywater.window_drifted', eq: true },
            ],
          },
          text: 'It should be safe by now — the grey of predawn was always the safe hour. But the hum has not let go with the light; it has learned to hold on longer than you learned it would, and the iron on you is going soft in the not-quite-dawn.',
        },
        {
          // carrying the core out through the bottoms after dark: the prize itself answers the hum.
          when: { all: [{ fact: 'possession.pc.salvage_core', eq: true }, { phase: ['dusk', 'night'] }] },
          text: 'The core rides wrong against your spine, and down here the bottoms have caught its weight the way they catch iron — the hum reaching into the wrong-heavy heart of it. It is worked matter, and after dark the Greywater wants all worked matter home in the mud. Keep moving, and get it up out of the water before the dark unmakes the thing you came for.',
        },
      ],
      ambient: ['A door bangs underwater, slow and deliberate.', 'The hum rises a half-tone, considering you.'],
    },
    tells: ['grey_low_hum'],
    examinables: [
      {
        id: 'hum_source',
        names: ['hum', 'sound', 'pump-house', 'pump house'],
        tell: 'grey_low_hum',
        look: {
          base: 'The hum is loudest from the drowned pump-house — a deep, patient note that you feel in any iron you carry, calling it home to the mud.',
        },
      },
    ],
    exits: [
      { dir: 'back', to: 'greywater_ford', label: 'back to the ford', via: 'e_grey_bottoms' },
      { dir: 'cache', to: 'greywater_cache', label: 'into the wrecked pump-house', via: 'e_bottoms_cache' },
    ],
  },
  {
    id: 'greywater_cache',
    title: 'The Pump-House',
    regionId: 'greywater',
    kind: 'poi',
    look: {
      base: 'Inside the flooded pump-house, on a shelf of slumped, half-ore machinery, sits the thing the question-mark marked: a fist-sized core, warm and wrongly heavy, the prize the whole Edge is built around wanting. The machinery around it was worked metal once — pumps, valves, gauges — and the dark water has called every bit of it halfway back to red ore. The core rests in the middle of that ruin, the same wrongly-altered kind of thing, and only the daylight has kept it whole. Carry it out into the dark and you would be feeding it to the same hunger that ate these pumps.',
      variants: [
        {
          when: { fact: 'possession.pc.salvage_core', eq: true },
          text: 'The shelf is empty now. The core is yours, warm against your spine — and around you the slumped, half-ore pumps are a plain warning of what this water does to worked and altered things left in the dark. Now there is only the matter of carrying it back out, past everything that wanted it, before the bottoms can do to your prize what they did to these machines.',
        },
      ],
      ambient: ['Water laps the shelf, patient, as if waiting for you to leave so it can have the room back.'],
    },
    examinables: [
      {
        id: 'machinery',
        // NB: no short names that are substrings of "core" (e.g. "ore") — the parser does fuzzy
        // substring matching, so "examine the core" must not resolve to this shelf by accident.
        names: ['machinery', 'machines', 'pumps', 'pump', 'valves', 'gauges', 'slumped machinery'],
        look: {
          base: 'You crouch by the shelf. Every worked part of these old pumps has gone soft and red at the edges, slumping toward ore — the same rot the Greywater works on a dropped knife, only these have had years of dark to finish it. Whatever was machined, fitted, ALTERED by human hands, the water has been patiently un-making. The core sitting among them is the most altered thing in the room; the only reason it is still whole is that the water sleeps by day. Take it out through the dark and it goes the way of these pumps.',
        },
      },
    ],
    items: ['salvage_core'],
    exits: [{ dir: 'out', to: 'greywater_bottoms', label: 'back out into the bottoms', via: 'e_bottoms_cache' }],
  },
  {
    id: 'antenna_field',
    title: 'The Antenna Field',
    regionId: 'antenna',
    kind: 'event-site',
    look: {
      base: 'A field of dead broadcast antennas, rust-red, leaning, humming on channels that closed with the Settling. Names are scratched into their concrete bases — dozens of names. The hum changes shape when you breathe, as if it were waiting to be given a word to carry.',
      variants: [
        {
          when: { fact: 'phase.now', eq: 'night' },
          text: 'At night the field is worse. The hum is hungry. You can feel how badly it wants you to say something — anything — aloud.',
        },
        {
          when: { fact: 'law.antenna_field.active', eq: true },
          text: 'The Changed is still out there, somewhere past the light, circling the hum that carried your voice. Get clear of the field — or be silent, and be quick.',
          replace: false,
        },
        {
          when: { fact: 'known.law.antenna_field', eq: 'surveyed' },
          text: 'You move through the field with your mouth shut and your name kept your own. You understand the trade it offers now, and you decline it, the way the name-stones taught you to.',
        },
      ],
      ambient: [
        'An antenna sways with no wind, slow, like a head turning to listen.',
        'The hum briefly takes the shape of a word you did not say, and lets it go.',
      ],
      firstReveal:
        'Beneath the freshest name scratched into the concrete lies a body not three days cold, mouth still open on a last syllable it never got to finish. Whatever he said here, the field answered him — and what answered is still nearby. The lesson is not subtle: do not give your voice to this place.',
    },
    tells: ['antenna_field_hum', 'antenna_name_stones'],
    items: ['antenna_relic'],
    examinables: [
      {
        id: 'name_stones',
        names: ['names', 'stones', 'bases', 'concrete', 'name stones'],
        tell: 'antenna_name_stones',
        look: {
          base: "Names scratched into concrete, dozens of them, in dozens of hands. Beneath the freshest — a man's name, the scratches still pale — lies a body not three days cold, mouth open on a last syllable it never finished. He said a name here. The field answered.",
        },
      },
      {
        id: 'antennas',
        names: ['antenna', 'antennas', 'towers', 'masts'],
        tell: 'antenna_field_hum',
        look: {
          base: 'Dead masts that should carry nothing, and carry something. When you speak, they hum your voice back changed — and you understand, in your spine, that the change is the point.',
        },
      },
    ],
    exits: [
      { dir: 'mile', to: 'mile_road_high', label: 'back to the Mile Road', via: 'e_mile_antenna' },
      { dir: 'fork', to: 'the_fork', label: 'across to the fork', via: 'e_fork_antenna' },
    ],
  },
];

export const EDGES: EdgeDef[] = [
  {
    id: 'e_way_check',
    from: 'waystation',
    to: 'cordon_checkpoint',
    bidirectional: true,
    label: 'the wire gate',
    distance: 8,
    mode: 'road',
  },
  {
    id: 'e_check_lyle',
    from: 'cordon_checkpoint',
    to: 'lyles_rest',
    bidirectional: true,
    label: 'the maintained road',
    distance: 18,
    mode: 'road',
  },
  {
    id: 'e_check_fork',
    from: 'cordon_checkpoint',
    to: 'the_fork',
    bidirectional: true,
    label: 'the gap in the wire',
    distance: 14,
    mode: 'field',
  },
  {
    id: 'e_lyle_survey',
    from: 'lyles_rest',
    to: 'survey_post',
    bidirectional: true,
    label: "the Survey's path",
    distance: 5,
    mode: 'path',
  },
  {
    id: 'e_lyle_salvage',
    from: 'lyles_rest',
    to: 'salvager_camp',
    bidirectional: true,
    label: "the Striders' path",
    distance: 6,
    mode: 'path',
  },
  {
    id: 'e_lyle_mileroad',
    from: 'lyles_rest',
    to: 'mile_road_low',
    bidirectional: true,
    label: 'the Mile Road',
    distance: 22,
    mode: 'road',
  },
  {
    id: 'e_mileroad',
    from: 'mile_road_low',
    to: 'mile_road_high',
    bidirectional: true,
    label: 'the Mile Road',
    distance: 25,
    mode: 'road',
  },
  {
    id: 'e_mile_fork',
    from: 'mile_road_high',
    to: 'the_fork',
    bidirectional: true,
    label: 'the path to the fork',
    distance: 15,
    mode: 'path',
  },
  {
    id: 'e_mile_antenna',
    from: 'mile_road_high',
    to: 'antenna_field',
    bidirectional: true,
    label: 'the path to the antennas',
    distance: 12,
    mode: 'field',
  },
  {
    id: 'e_fork_grey',
    from: 'the_fork',
    to: 'greywater_ford',
    bidirectional: true,
    label: 'the drop to the Greywater',
    distance: 18,
    mode: 'ford',
  },
  {
    id: 'e_fork_antenna',
    from: 'the_fork',
    to: 'antenna_field',
    bidirectional: true,
    label: 'the flat to the antennas',
    distance: 12,
    mode: 'field',
  },
  {
    id: 'e_grey_bottoms',
    from: 'greywater_ford',
    to: 'greywater_bottoms',
    bidirectional: true,
    label: 'the flooded bottoms',
    distance: 10,
    mode: 'ford',
  },
  {
    id: 'e_bottoms_cache',
    from: 'greywater_bottoms',
    to: 'greywater_cache',
    bidirectional: true,
    label: 'the pump-house',
    distance: 8,
    mode: 'ford',
  },
];
