/**
 * anomaly.hush — the Hush's "physics". It OWNS the laws (kernel-sense: a real
 * module with jurisdiction `domain: anomaly`), but the laws themselves are DATA
 * authored into the world pack. It is reactive: each beat, on the canonical
 * `law_trigger` phase, it checks every LIVE, in-scope law's bounded trigger
 * predicate and applies its deterministic effect as canonical facts the base
 * modules read (e.g. `law.behind_mult`, which travel.graph reads).
 *
 * Fairness is enforced here (research rules 5–8): the FIRST contact with an
 * unsurveyed law is always a non-lethal WARNING (the fail-safe), and any effect
 * that routes into combat/summon carries the delegated-lethality clamp so a
 * fresh player can never be instakilled by a law they had no chance to learn.
 */
import { evalPredicate, foldOrder, type LawDefinition, type LawEffect } from '../../sdk/law.js';
import { makeManifest } from '../../sdk/define.js';
import type { FactView } from '../../sdk/facts.js';
import type { JsonObject } from '../../sdk/json.js';
import type { BeatResult, Module, ModuleResult, ScheduledEvent, WorldEvent } from '../../sdk/types.js';
import type { WorldPack } from '../../sdk/worldpack.js';

export function createAnomaly(pack: WorldPack): Module {
  const laws = new Map<string, LawDefinition>(pack.laws.map((l) => [l.id, l]));
  const nodeRegion = new Map<string, string>(pack.nodes.map((n) => [n.id, n.regionId]));

  const manifest = makeManifest({
    id: 'anomaly.hush',
    content: { laws: pack.laws.map((l) => ({ id: l.id, cat: l.effectCategory })) },
    source: 'bespoke (The Hush) — original anomaly physics',
    license: { identifier: 'NONE', attribution: 'LOOM original (The Hush)', tier: 'green', provenance: 'clean-room' },
    domain: 'anomaly',
    priority: 50, // highest — the Zone distorts everything
    intents: [],
    // a law may change canonical facts about the world it lawfully governs: the
    // item it degrades (possession), the standing it costs (survival/meta). Fact
    // writes are permission-based, not exclusive — this is not a crosswalk.
    writesFacts: ['law', 'survival', 'meta', 'known', 'possession'],
    readsFacts: ['law', 'loc', 'phase', 'flag', 'possession', 'known', 'clock', 'facing'],
  });

  function inScope(law: LawDefinition, node: string | undefined): boolean {
    if (!node) return false;
    if (law.scope.nodes?.includes(node)) return true;
    if (law.scope.region && nodeRegion.get(node) === law.scope.region) return true;
    // route scope: the player just traversed this edge
    return false;
  }

  function carryingClass(facts: FactView, cls: string): boolean {
    return facts.keysUnder('possession.pc').some((k) => k.endsWith('.class') && facts.getString(k) === cls);
  }

  /** does the law's trigger fire this turn? combines the declared predicate + the effect's physical key. */
  function triggers(law: LawDefinition, facts: FactView, turn: number): boolean {
    if (facts.getNumber(`law.${law.id}.fired_turn`) === turn) return false; // idempotent
    if (facts.getBool(`law.${law.id}.live`) === false) return false;
    if (law.ambientGate && !evalPredicate(law.ambientGate, facts)) return false;
    if (facts.getNumber('flag.last_turn') !== turn) return false; // only on the acting beat
    if (!evalPredicate(law.trigger, facts)) return false;
    // material laws that act on a carried class require the player to be carrying it
    if (law.effect.kind === 'degrade_item_class' && !carryingClass(facts, law.effect.itemClass)) return false;
    if (law.effect.kind === 'summon' && law.effect.via === 'metal' && !carryingClass(facts, 'metal')) return false;
    return true;
  }

  function applyEffect(
    law: LawDefinition,
    effect: LawEffect,
    firstContact: boolean,
    facts: FactView,
    turn: number,
  ): { events: WorldEvent[]; scheduled: ScheduledEvent[]; render: BeatResult['render'] } {
    const events: WorldEvent[] = [];
    const scheduled: ScheduledEvent[] = [];
    const tell = law.tells[0]?.id;
    const labels = tell ? [`tell.${tell}`, `law.${law.id}`] : [`law.${law.id}`];

    switch (effect.kind) {
      case 'distance_mult': {
        events.push({
          tag: 'law_distance',
          mutations: [{ op: 'set', key: 'law.behind_mult', value: effect.factor }],
          summary: law.failSafe.firstContact.tell,
          data: { law: law.id },
        });
        // first contact cost: a reversible Unsettled condition (never lethal)
        events.push({
          tag: 'unsettled',
          mutations: [{ op: 'adjust', key: 'survival.pc.unsettled', by: 1, min: 0, max: 5 }],
          summary: 'Something in you slips a notch out of true. (Unsettled.)',
          severity: 'reversible',
        });
        break;
      }
      case 'degrade_item_class': {
        // the law slumps worked metal toward ore — a reversible material degrade
        for (const k of facts.keysUnder('possession.pc')) {
          if (k.endsWith('.class') && facts.getString(k) === effect.itemClass) {
            const itemKey = k.slice(0, -'.class'.length);
            events.push({
              tag: 'law_degrade',
              mutations: [{ op: 'set', key: `${itemKey}.condition`, value: effect.toCondition }],
              summary: 'The iron in your kit goes soft and rotten-red, slumping toward ore.',
              data: { law: law.id, item: itemKey },
              severity: 'reversible',
            });
          }
        }
        break;
      }
      case 'summon': {
        // the law summons the Changed — delegated lethality, clamped on first contact
        const contacts = (facts.getNumber(`law.${law.id}.contacts`) ?? 0) + 1;
        scheduled.push({
          fireAtTurn: turn,
          phase: 'summon_act',
          module: 'combat.ito',
          kind: 'changed_strike',
          id: `changed:${law.id}:${turn}`,
          order: 0,
          payload: { law: law.id, contacts, firstContact, entity: effect.entity },
        });
        events.push({
          tag: 'law_summon',
          mutations: [
            { op: 'set', key: `law.${law.id}.summoned_turn`, value: turn },
            { op: 'set', key: `law.${law.id}.active`, value: true }, // the Changed is now hunting
            { op: 'set', key: `law.${law.id}.active_turn`, value: turn },
          ],
          summary: firstContact ? law.failSafe.firstContact.tell : 'The hum sharpens. Something has heard you, and it is coming.',
          data: { law: law.id },
        });
        break;
      }
      case 'impose_condition': {
        // an agency law that costs you nerve and lets the dark close the distance
        const cond = effect.condition ?? 'unsettled';
        events.push({
          tag: 'law_condition',
          mutations: [
            { op: 'adjust', key: `survival.pc.${cond}`, by: 1, min: 0, max: 5 },
            { op: 'adjust', key: 'survival.pc.exposure', by: 1, min: 0, max: 10 },
            { op: 'adjust', key: `law.${law.id}.closer`, by: 1, min: 0, max: 5 },
          ],
          summary: firstContact ? law.failSafe.firstContact.tell : 'You hold still a beat too long, and the dark takes another step toward you. (Unsettled.)',
          data: { law: law.id, condition: cond },
          severity: effect.severity ?? 'reversible',
        });
        break;
      }
      case 'block_route':
      case 'repeat_window':
      case 'amplify_sound':
      case 'reveal_tell': {
        events.push({
          tag: 'law_effect',
          mutations: [{ op: 'set', key: `law.${law.id}.active_turn`, value: turn }],
          summary: law.failSafe.firstContact.tell,
          data: { law: law.id, kind: effect.kind },
          severity: 'reversible',
        });
        break;
      }
    }
    return { events, scheduled, render: { labels, valence: 'cost', hints: { law: law.id, firstContact } } };
  }

  return {
    manifest,
    init: (): JsonObject => ({}),
    claims: () => false, // purely reactive
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => ({ nativeNext: args.native, events: [], control: { kind: 'continue' } }),
    beatTriggers: ['law_trigger', 'drift_apply'],
    onBeat: (phase, native, facts, _tape, ctx): BeatResult => {
      const node = facts.getString('loc.pc');

      if (phase === 'drift_apply') {
        return applyDrift(laws, facts, ctx.turn, native);
      }

      // the Antenna's "still hunting" state machine: after the first warning, the
      // Changed hunts. Leaving the field escapes (non-lethal); speaking again or
      // lingering a turn lets it close. A knowledge test, not a twitch test.
      const huntEvents: WorldEvent[] = [];
      const huntScheduled: ScheduledEvent[] = [];
      let huntRender: BeatResult['render'] | undefined;
      if (facts.getBool('law.antenna_field.active')) {
        const activeTurn = facts.getNumber('law.antenna_field.active_turn');
        const spokeThisTurn = facts.getString('flag.last_intent') === 'speak_aloud' && facts.getNumber('flag.last_turn') === ctx.turn;
        if (node !== 'antenna_field') {
          huntEvents.push({ tag: 'antenna_escape', mutations: [{ op: 'set', key: 'law.antenna_field.active', value: false }], summary: 'You put the antenna field behind you. Out in the dark, the thing that heard you loses the thread of you — and turns away, slow and reluctant, to listen for someone else.', data: { law: 'antenna_field' } });
          huntRender = { labels: ['antenna.escape'], valence: 'boon' };
        } else if (!spokeThisTurn && activeTurn !== undefined && activeTurn < ctx.turn) {
          huntScheduled.push({ fireAtTurn: ctx.turn, phase: 'summon_act', module: 'combat.ito', kind: 'changed_strike', id: `changed:antenna_field:${ctx.turn}`, order: 0, payload: { law: 'antenna_field', firstContact: false, entity: 'the_changed' } });
          huntEvents.push({ tag: 'antenna_close', mutations: [{ op: 'set', key: 'law.antenna_field.active', value: false }], summary: 'You stayed in the field a beat too long. The Changed has closed the distance, and the hum is the sound of it arriving.', data: { law: 'antenna_field' } });
          huntRender = { labels: ['antenna.close'], valence: 'cost' };
        }
      }

      // law_trigger: fold all firing laws in canonical order (K6)
      const firing = foldOrder([...laws.values()].filter((l) => inScope(l, node) && triggers(l, facts, ctx.turn)));
      if (firing.length === 0 && huntEvents.length === 0) return {};

      const events: WorldEvent[] = [...huntEvents];
      const scheduled: ScheduledEvent[] = [...huntScheduled];
      let render: BeatResult['render'] | undefined = huntRender;
      for (const law of firing) {
        const contacts = (facts.getNumber(`law.${law.id}.contacts`) ?? 0) + 1;
        const surveyed = facts.getString(`known.law.${law.id}`) === 'surveyed';
        const firstContact = contacts <= 1 && !surveyed;
        events.push({
          tag: 'law_triggered',
          mutations: [
            { op: 'set', key: `law.${law.id}.contacts`, value: contacts },
            { op: 'set', key: `law.${law.id}.fired_turn`, value: ctx.turn },
            { op: 'set', key: `law.${law.id}.witnessed`, value: true },
          ],
          summary: `[${law.title}]`,
          data: { law: law.id, contacts, firstContact },
        });
        const r = applyEffect(law, law.effect, firstContact, facts, ctx.turn);
        events.push(...r.events);
        scheduled.push(...r.scheduled);
        render = r.render;
      }
      return { nativeNext: native, events, scheduled, ...(render ? { render } : {}) };
    },
  };
}

/** Law Drift — periodic re-Settling. Emits a pre-demotion tell >=1 beat before demoting (fairness). */
function applyDrift(laws: Map<string, LawDefinition>, facts: FactView, turn: number, native: JsonObject): BeatResult {
  const events: WorldEvent[] = [];
  for (const law of laws.values()) {
    if (!law.drift) continue;
    if (turn === 0) continue;
    if (facts.getNumber(`law.${law.id}.drift_check_turn`) === turn) continue; // once per law per turn
    const surveyed = facts.getString(`known.law.${law.id}`) === 'surveyed';
    const warned = facts.getBool(`law.${law.id}.drift_warned`);

    // dwell-based drift (preferred): fire relative to WHEN the law was surveyed,
    // so mastery refreshes on its own clock. Falls back to absolute everyTurns.
    const after = law.drift.driftAfter;
    if (after && after > 0) {
      const surveyedTurn = facts.getNumber(`known.${law.id}.surveyed_turn`);
      if (!surveyed || surveyedTurn === undefined) continue;
      const dwell = turn - surveyedTurn;
      if (!warned && dwell < after) continue;
      if (warned) {
        const warnTurn = facts.getNumber(`law.${law.id}.drift_warn_turn`) ?? surveyedTurn + after;
        if (turn - warnTurn < Math.max(2, Math.floor(after / 2))) continue; // not yet time to demote
      }
    } else {
      if (law.drift.everyTurns <= 0 || turn % law.drift.everyTurns !== 0) continue;
    }

    if (surveyed && !warned) {
      // pre-demotion tell: warn first, demote next drift window
      events.push({
        tag: 'drift_warn',
        mutations: [
          { op: 'set', key: `law.${law.id}.drift_warned`, value: true },
          { op: 'set', key: `law.${law.id}.drift_warn_turn`, value: turn },
          { op: 'set', key: `law.${law.id}.drift_check_turn`, value: turn },
        ],
        summary: `Something about ${law.title} feels subtly wrong, as if the rule had shifted a hair while you weren't looking. (Your certainty is decaying.)`,
        data: { law: law.id },
      });
    } else if (surveyed && warned) {
      events.push({
        tag: 'drift_demote',
        mutations: [
          { op: 'set', key: `known.law.${law.id}`, value: 'approximate' },
          { op: 'set', key: `law.${law.id}.drift_warned`, value: false },
          { op: 'set', key: `law.${law.id}.drift_check_turn`, value: turn },
          { op: 'set', key: `law.${law.id}.drifted_turn`, value: turn },
          { op: 'delete', key: `known.${law.id}.surveyed_turn` }, // re-survey restarts the dwell clock
        ],
        summary: `${law.title} has re-Settled. What you knew is no longer quite true — you will have to read it again.`,
        data: { law: law.id },
      });
    }
  }
  if (!events.length) return {};
  return { nativeNext: native, events, render: { labels: ['drift'], valence: 'cost' } };
}
