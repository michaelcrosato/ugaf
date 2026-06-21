/**
 * stealth.detection — a clean-room video-game detection FSM (an uncopyrightable
 * pattern): per-patrol awareness unaware -> suspicious -> searching -> alert,
 * with a last-known-position. HIDE / SNEAK lower awareness; loud physical acts
 * (speak_aloud, call_out, attack) near a patrol raise it. Guarded exits open
 * only while the patrol is not alert — so slipping the Cordon's vision cone is a
 * genuine, deterministic alternative to learning the anomaly's timing.
 */
import { makeManifest } from '../../sdk/define.js';
import type { FactView } from '../../sdk/facts.js';
import type { JsonObject } from '../../sdk/json.js';
import type { BeatResult, Module, ModuleResult } from '../../sdk/types.js';

const STATES = ['unaware', 'suspicious', 'searching', 'alert'] as const;
type Aware = (typeof STATES)[number];
const idx = (a: Aware) => STATES.indexOf(a);
const clampState = (i: number): Aware => STATES[Math.max(0, Math.min(STATES.length - 1, i))]!;
const LOUD = new Set(['speak_aloud', 'call_out', 'attack']);

export function createStealth(): Module {
  const manifest = makeManifest({
    id: 'stealth.detection',
    content: { states: [...STATES] },
    source: 'clean-room detection FSM (uncopyrightable video-game pattern)',
    license: {
      identifier: 'NONE',
      attribution: 'LOOM original (abstract detection FSM)',
      tier: 'green',
      provenance: 'clean-room',
    },
    domain: 'stealth',
    priority: 28,
    intents: ['hide', 'sneak'],
    writesFacts: ['awareness', 'flag'],
    readsFacts: ['awareness', 'flag', 'loc', 'world', 'possession'],
  });

  function patrolAt(facts: FactView): string | undefined {
    const node = facts.getString('loc.pc');
    if (!node) return undefined;
    return facts.getString(`world.patrol.${node}`);
  }

  // feedback/0018 night14 — the Greywater's lesson is the gate's lesson: WORKED iron on you when you
  // try to slip the watched gate CLINKS and rouses the troopers. A player who carries good iron must
  // pry the gate with it instead; the silent slip is for those who shed the metal (or let the water
  // take it). This is what makes the LEARN route diverge from the STRIP/PRY route at the climax.
  function carriesWorkingMetal(facts: FactView): boolean {
    return facts
      .keysUnder('possession.pc')
      .some(
        (k) =>
          k.endsWith('.class') &&
          facts.getString(k) === 'metal' &&
          facts.getString(`${k.slice(0, -'.class'.length)}.condition`) !== 'ore',
      );
  }

  return {
    manifest,
    init: (): JsonObject => ({}),
    claims: (intent, _facts, armed) => armed.has('stealth') && ['hide', 'sneak'].includes(intent.class),
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => {
      const c = args.action.intent.class;
      const patrol = patrolAt(args.facts);
      if (!patrol) {
        return {
          nativeNext: args.native,
          events: [
            {
              tag: 'stealth_idle',
              mutations: [{ op: 'set', key: 'flag.hidden', value: true }],
              summary:
                c === 'hide'
                  ? 'You press into cover and go still. Nothing here is hunting you.'
                  : 'You move low and quiet, out of habit.',
            },
          ],
          control: { kind: 'continue' },
          render: { labels: [`stealth.${c}`] },
        };
      }
      // carrying the core out past the LIVE watch, worked iron on you betrays the slip (the clink):
      // the patrol rouses and you earn NO concealment. Telegraphed, recoverable — shed the metal and
      // try again, or pry the gate with that same iron, or lean on a debt.
      const carryingCoreOut =
        args.facts.getBool('flag.intercepted') && args.facts.getBool('possession.pc.salvage_core');
      if (carryingCoreOut && carriesWorkingMetal(args.facts)) {
        const cur = (args.facts.getString(`awareness.${patrol}`) as Aware) ?? 'unaware';
        const next = clampState(idx(cur) + 1);
        return {
          nativeNext: args.native,
          events: [
            {
              tag: 'stealth_clink',
              mutations: [{ op: 'set', key: `awareness.${patrol}`, value: next }],
              summary: `You drop low for the wedge of dark — and the worked iron on you knocks the post and rings out, flat and bright in the quiet. Heads turn. You will not slip a watched gate with good metal singing at your hip; the Greywater's lesson is the gate's lesson too. Shed the iron and go quiet, or lever the wire-gap with it, or lean on a Strider's debt.`,
              data: { patrol, awareness: next, clink: true },
            },
          ],
          control: { kind: 'continue' },
          render: { labels: ['stealth.clink'], valence: 'cost', hints: { patrol, awareness: next } },
        };
      }
      const cur = (args.facts.getString(`awareness.${patrol}`) as Aware) ?? 'unaware';
      const next = clampState(idx(cur) - (c === 'hide' ? 2 : 1));
      return {
        nativeNext: args.native,
        events: [
          {
            tag: 'stealth_act',
            mutations: [
              { op: 'set', key: `awareness.${patrol}`, value: next },
              { op: 'set', key: 'flag.hidden', value: true },
            ],
            summary:
              next === 'unaware'
                ? `You melt into the dark. The ${patrol.replace(/_/g, ' ')} loses the thread of you entirely.`
                : `You ease back out of their eyeline. The ${patrol.replace(/_/g, ' ')} is wary, but not on you.`,
            data: { patrol, awareness: next },
          },
        ],
        control: { kind: 'continue' },
        render: { labels: [`stealth.${c}`], hints: { patrol, awareness: next } },
      };
    },
    // raise awareness when the player is loud near a patrol (reactive)
    beatTriggers: ['schedule_fire'],
    onBeat: (_phase, native, facts, _tape, ctx): BeatResult => {
      const patrol = patrolAt(facts);
      if (!patrol) return {};
      if (facts.getNumber(`awareness.${patrol}.turn`) === ctx.turn) return {};
      const lastIntent = facts.getString('flag.last_intent');
      const lastTurn = facts.getNumber('flag.last_turn');
      if (lastTurn !== ctx.turn || !lastIntent || !LOUD.has(lastIntent)) return {};
      const cur = (facts.getString(`awareness.${patrol}`) as Aware) ?? 'unaware';
      const next = clampState(idx(cur) + 2);
      return {
        nativeNext: native,
        events: [
          {
            tag: 'detection_rise',
            mutations: [
              { op: 'set', key: `awareness.${patrol}`, value: next },
              { op: 'set', key: `awareness.${patrol}.turn`, value: ctx.turn },
            ],
            summary:
              next === 'alert'
                ? `Heads turn. The ${patrol.replace(/_/g, ' ')} has you — torches swing your way.`
                : `That carried. The ${patrol.replace(/_/g, ' ')} stirs, scanning.`,
            data: { patrol, awareness: next },
          },
        ],
        render: {
          labels: ['stealth.detected'],
          valence: 'cost',
          hints: { patrol, awareness: next },
        },
      };
    },
  };
}
