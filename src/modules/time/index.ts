/**
 * time.cycle — owns the day/night phase and the deterministic clock. Game-time
 * is derived purely from the turn counter (never wall-clock): each action
 * advances the clock by an intent-dependent cost, and the phase is recomputed.
 * The phase boundary (dusk -> night) is what arms the "after dark" laws, and it
 * resolves in the `phase_change` beat BEFORE `law_trigger`, so a law always sees
 * the correct phase the moment the player's action lands.
 */
import { makeManifest } from '../../sdk/define.js';
import type { BeatResult, Module, ModuleResult } from '../../sdk/types.js';

export type Phase = 'predawn' | 'day' | 'dusk' | 'night';

const COST: Record<string, number> = {
  rest: 120,
  wait: 30,
  go: 25,
  cross_threshold: 15,
  look_back: 5,
  flee: 10,
  hide: 5,
  sneak: 20,
};

export function phaseOf(minuteOfDay: number): Phase {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  if (m >= 1260 || m < 240) return 'night'; // 21:00–04:00
  if (m < 360) return 'predawn'; // 04:00–06:00
  if (m < 1080) return 'day'; // 06:00–18:00
  return 'dusk'; // 18:00–21:00
}

function clockText(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function createTime(config: { startMinutes?: number } = {}): Module {
  const start = config.startMinutes ?? 16 * 60; // 16:00 by default
  const manifest = makeManifest({
    id: 'time.cycle',
    version: '0.2.0', // feedback/0013 #3: escalating dusk-approach telegraphs (the timed decision was made blind)
    content: { start, cost: COST },
    source: 'clean-room day/night scheduler (uncopyrightable mechanic)',
    license: {
      identifier: 'NONE',
      attribution: 'LOOM original',
      tier: 'green',
      provenance: 'clean-room',
    },
    domain: 'time',
    priority: 5,
    intents: [],
    writesFacts: ['phase', 'clock'],
    readsFacts: ['phase', 'clock', 'flag'],
  });

  return {
    manifest,
    init: () => ({ minutes: start }),
    claims: () => false,
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => ({
      nativeNext: args.native,
      events: [],
      control: { kind: 'continue' },
    }),
    beatTriggers: ['phase_change'],
    onBeat: (_phase, native, facts, _tape, ctx): BeatResult => {
      // idempotent: advance the clock once per turn
      if (facts.getNumber('clock.advanced_turn') === ctx.turn) return {};
      const cur = native as { minutes: number };
      const intent = facts.getString('flag.last_intent') ?? 'wait';
      // honour an explicit per-action time cost only if it was set THIS turn
      const override =
        facts.getNumber('flag.time_cost_turn') === ctx.turn ? facts.getNumber('flag.time_cost') : undefined;
      const cost = override ?? COST[intent] ?? 10;
      const minutes = cur.minutes + cost;
      const newPhase = phaseOf(minutes);
      const oldPhase = facts.getString('phase.now');
      const events: BeatResult['events'] = [
        {
          tag: 'clock_tick',
          mutations: [
            { op: 'set', key: 'clock.minutes', value: minutes },
            { op: 'set', key: 'clock.tod', value: clockText(minutes) },
            { op: 'set', key: 'clock.advanced_turn', value: ctx.turn },
          ],
          visibility: 'private',
        },
      ];
      const out: BeatResult = { nativeNext: { minutes }, events };
      if (newPhase !== oldPhase) {
        return {
          nativeNext: { minutes },
          events: [
            ...events,
            {
              tag: 'phase_change',
              mutations: [
                { op: 'set', key: 'phase.now', value: newPhase },
                // entering a fresh day re-arms the dusk-approach telegraph for the new daylight window
                ...(newPhase === 'day' ? ([{ op: 'set' as const, key: 'clock.dusk_warned', value: 0 }] as const) : []),
              ],
              summary: phaseLine(newPhase, minutes),
              data: { phase: newPhase },
            },
          ],
          render: {
            labels: [`phase.${newPhase}`],
            hints: { phase: newPhase },
            valence: newPhase === 'night' ? 'cost' : 'neutral',
          },
        };
      }
      // dusk-approach telegraph (feedback/0013 #3): the whole demo turns on one timed decision —
      // cross the iron-hungry Greywater by day, drop your metal, or buy the safe hour — and the
      // day->dusk threshold was invisible, so the player made it blind. As day wanes, warn in
      // escalating, concrete beats that NAME the consequence of the flip (the status clock shows
      // the time; it never told you what the time MEANT). Fires once per rung, re-armed each dawn.
      if (newPhase === 'day') {
        const m = ((minutes % 1440) + 1440) % 1440;
        const untilDusk = 1080 - m; // dusk begins at 18:00
        const warned = facts.getNumber('clock.dusk_warned') ?? 0;
        const level = untilDusk <= 25 ? 2 : untilDusk <= 60 ? 1 : 0;
        if (level > warned) {
          return {
            nativeNext: { minutes },
            events: [
              ...events,
              {
                tag: 'dusk_approach',
                mutations: [{ op: 'set', key: 'clock.dusk_warned', value: level }],
                summary: duskApproachLine(level),
                data: { untilDusk, level },
              },
            ],
            render: { labels: [`phase.dusk_approach.${level}`], hints: { untilDusk }, valence: 'cost' },
          };
        }
      }
      return out;
    },
  };
}

const PHASE_LINES: Record<Phase, string[]> = {
  dusk: [
    'The light goes thin and orange, then grey. Dusk settles over the Hush, and the Zone begins, very quietly, to pay attention.',
    'The sun gives up without ceremony. In the long shadows the wrong-angled things look almost right, which is worse.',
    'The day burns down to embers at the horizon. Whatever sleeps in the Hush by daylight is starting to stir.',
  ],
  night: [
    'The last of the light fails. It is night now, and the Zone wakes — you can feel the difference, the way you feel a held breath let go.',
    'Full dark, and no honest dark at all. The Hush comes awake around you, lawful and patient and hungry.',
    'Night closes over the cordon like water over a stone. The laws are all in force now, every one of them.',
  ],
  predawn: [
    'A grey, grudging not-yet-light gathers at the edges of things. Predawn, the hour the Zone holds its breath.',
    'The dark thins toward an ashen non-colour. It is not day, and it is not safe, but it is closer to both.',
  ],
  day: [
    'Day comes up pale and quiet over the cordon, and the Hush pretends, almost convincingly, to be only a ruined place.',
    'Light returns, thin and apologetic. The night-laws sleep; the day is the closest the Zone comes to mercy.',
  ],
};

function phaseLine(p: Phase, minutes: number): string {
  const lines = PHASE_LINES[p];
  return lines[(((minutes % (lines.length * 7)) / 7) | 0) % lines.length]!;
}

/**
 * The escalating day->dusk telegraph (feedback/0013 #3). Level 1: an hour of day left, mind the
 * dark. Level 2: the light is going NOW — act in daylight or act in the dark. Both name the
 * concrete consequence (the Greywater wakes to iron, the deep to stillness) so the central timed
 * decision is made with eyes open.
 */
function duskApproachLine(level: number): string {
  if (level >= 2)
    return 'The sun is on the horizon now and the light is going fast — minutes of true day left, no more. Whatever you mean to do by daylight, do it now: cross the Greywater, or reach the deep, before the dark wakes them. After dusk the bottoms hunger for worked iron, and the deep places for anyone who stops moving.';
  return 'The afternoon light runs long and amber; an hour or so of honest day still in hand. But the dark is coming, and it changes the rules — after dusk the Greywater wakes to the iron you carry, and the deep places grow hungry. If your road runs through them, time it before the light fails.';
}
