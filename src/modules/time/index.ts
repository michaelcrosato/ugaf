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

const COST: Record<string, number> = { rest: 120, wait: 30, go: 25, cross_threshold: 15, look_back: 5, flee: 10, hide: 5, sneak: 20 };

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
    content: { start, cost: COST },
    source: 'clean-room day/night scheduler (uncopyrightable mechanic)',
    license: { identifier: 'NONE', attribution: 'LOOM original', tier: 'green', provenance: 'clean-room' },
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
    execute: (args): ModuleResult => ({ nativeNext: args.native, events: [], control: { kind: 'continue' } }),
    beatTriggers: ['phase_change'],
    onBeat: (_phase, native, facts, _tape, ctx): BeatResult => {
      // idempotent: advance the clock once per turn
      if (facts.getNumber('clock.advanced_turn') === ctx.turn) return {};
      const cur = native as { minutes: number };
      const intent = facts.getString('flag.last_intent') ?? 'wait';
      // honour an explicit per-action time cost only if it was set THIS turn
      const override = facts.getNumber('flag.time_cost_turn') === ctx.turn ? facts.getNumber('flag.time_cost') : undefined;
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
              mutations: [{ op: 'set', key: 'phase.now', value: newPhase }],
              summary: phaseLine(newPhase),
              data: { phase: newPhase },
            },
          ],
          render: { labels: [`phase.${newPhase}`], hints: { phase: newPhase }, valence: newPhase === 'night' ? 'cost' : 'neutral' },
        };
      }
      return out;
    },
  };
}

function phaseLine(p: Phase): string {
  switch (p) {
    case 'dusk':
      return 'The light goes thin and orange. Dusk settles over the Hush.';
    case 'night':
      return 'The last of the light fails. It is night now, and the Zone wakes.';
    case 'predawn':
      return 'A grey, grudging not-yet-light gathers at the edges. Predawn.';
    case 'day':
      return 'Day comes up pale and quiet over the cordon.';
  }
}
