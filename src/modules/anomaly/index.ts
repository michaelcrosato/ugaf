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
import type { FactView, FactMutation } from '../../sdk/facts.js';
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
    license: {
      identifier: 'NONE',
      attribution: 'LOOM original (The Hush)',
      tier: 'green',
      provenance: 'clean-room',
    },
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

  /**
   * The Law-Drift "hungry hours lengthen" window-widen (feedback/0012 #5): a
   * `mutates: 'window'` law that has DRIFTED bites in the phase(s) it has crept into
   * (its `widensTo`, e.g. predawn). We model this as "the law experiences the new phase
   * as night" — so only its PHASE gate relaxes (the Greywater's after-dark gate), while
   * an intent gate (the Hollow Dark still needs wait/rest) is untouched.
   */
  function widenedPhaseView(law: LawDefinition, facts: FactView): FactView | undefined {
    const d = law.drift;
    if (!d || d.mutates !== 'window' || !d.widensTo?.length) return undefined;
    if (!facts.getBool(`law.${law.id}.window_drifted`)) return undefined;
    const phaseNow = facts.getString('phase.now');
    if (phaseNow === undefined || !d.widensTo.includes(phaseNow)) return undefined;
    // override ONLY the phase.now lookup (via both getString and get, so a law that gates on
    // phase either way widens); everything else (intent, carry, all other facts) stays real.
    return {
      ...facts,
      getString: (k: string) => (k === 'phase.now' ? 'night' : facts.getString(k)),
      get: (k: string) => (k === 'phase.now' ? 'night' : facts.get(k)),
    } as FactView;
  }

  /** does the law's trigger fire this turn? combines the declared predicate + the effect's physical key. */
  function triggers(law: LawDefinition, facts: FactView, turn: number): boolean {
    if (facts.getNumber(`law.${law.id}.fired_turn`) === turn) return false; // idempotent
    if (facts.getBool(`law.${law.id}.live`) === false) return false;
    // if the law has drifted its window wider, evaluate its gates as if the crept-into
    // phase were night (the safe margin you learned no longer holds).
    const ev = widenedPhaseView(law, facts) ?? facts;
    if (law.ambientGate && !evalPredicate(law.ambientGate, ev)) return false;
    if (facts.getNumber('flag.last_turn') !== turn) return false; // only on the acting beat
    if (!evalPredicate(law.trigger, ev)) return false;
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
        // each look-back doubles the way home AND tightens the trap: warn (fail-safe),
        // then dread, then an EXPLICIT last warning. The 4th look-back is fatal (the
        // lost_to_mile_road goal) — fair, because three escalating warnings precede it.
        // This is the "teeth" the blind swarm found missing: a rule that actually bites.
        const lookbacks = (facts.getNumber(`law.${law.id}.contacts`) ?? 0) + 1;
        events.push({
          tag: 'law_distance',
          mutations: [{ op: 'set', key: 'law.behind_mult', value: effect.factor }],
          summary: mileRoadTell(law, lookbacks),
          data: { law: law.id, lookbacks },
        });
        // a reversible Unsettled condition (the fail-safe tell already names it)
        events.push({
          tag: 'unsettled',
          mutations: [{ op: 'adjust', key: 'survival.pc.unsettled', by: 1, min: 0, max: 5 }],
          summary: '',
          severity: 'reversible',
        });
        break;
      }
      case 'degrade_item_class': {
        // the law slumps worked metal toward ore — a reversible material degrade. Fire the
        // "iron goes soft" line ONCE, on the transition to ore; suppress it for metal that has
        // already slumped, so the per-move repeat does not train the player to skip the status
        // line (feedback/0013 #6).
        for (const k of facts.keysUnder('possession.pc')) {
          if (k.endsWith('.class') && facts.getString(k) === effect.itemClass) {
            const itemKey = k.slice(0, -'.class'.length);
            if (facts.getString(`${itemKey}.condition`) === effect.toCondition) continue; // already ore — no repeat
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
          summary: firstContact
            ? law.failSafe.firstContact.tell
            : 'The hum sharpens. Something has heard you, and it is coming.',
          data: { law: law.id },
        });
        break;
      }
      case 'impose_condition': {
        // the Hollow Dark (agency): each beat you hold still, the dark closes. It warns, dreads,
        // warns explicitly, then closes the last of the distance — the lost_to_hollow_dark goal at
        // closer >= 4. The same fair, telegraphed ladder as the Mile Road; the teeth the swarm
        // found missing on this law ("a fake threat that never charges").
        const cond = effect.condition ?? 'unsettled';
        const closer = (facts.getNumber(`law.${law.id}.closer`) ?? 0) + 1;
        events.push({
          tag: 'law_condition',
          mutations: [
            { op: 'adjust', key: `survival.pc.${cond}`, by: 1, min: 0, max: 5 },
            { op: 'adjust', key: 'survival.pc.exposure', by: 1, min: 0, max: 10 },
            { op: 'adjust', key: `law.${law.id}.closer`, by: 1, min: 0, max: 9 },
          ],
          summary: hollowDarkTell(law, closer),
          data: { law: law.id, condition: cond, closer },
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
    return {
      events,
      scheduled,
      render: { labels, valence: 'cost', hints: { law: law.id, firstContact } },
    };
  }

  return {
    manifest,
    init: (): JsonObject => ({}),
    claims: () => false, // purely reactive
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => ({
      nativeNext: args.native,
      events: [],
      control: { kind: 'continue' },
    }),
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
        const spokeThisTurn =
          facts.getString('flag.last_intent') === 'speak_aloud' && facts.getNumber('flag.last_turn') === ctx.turn;
        if (node !== 'antenna_field') {
          huntEvents.push({
            tag: 'antenna_escape',
            mutations: [{ op: 'set', key: 'law.antenna_field.active', value: false }],
            summary:
              'You put the antenna field behind you. Out in the dark, the thing that heard you loses the thread of you — and turns away, slow and reluctant, to listen for someone else.',
            data: { law: 'antenna_field' },
          });
          huntRender = { labels: ['antenna.escape'], valence: 'boon' };
        } else if (!spokeThisTurn && activeTurn !== undefined && activeTurn < ctx.turn) {
          huntScheduled.push({
            fireAtTurn: ctx.turn,
            phase: 'summon_act',
            module: 'combat.ito',
            kind: 'changed_strike',
            id: `changed:antenna_field:${ctx.turn}`,
            order: 0,
            payload: { law: 'antenna_field', firstContact: false, entity: 'the_changed' },
          });
          huntEvents.push({
            tag: 'antenna_close',
            mutations: [{ op: 'set', key: 'law.antenna_field.active', value: false }],
            summary:
              'You stayed in the field a beat too long. The Changed has closed the distance, and the hum is the sound of it arriving.',
            data: { law: 'antenna_field' },
          });
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
  // feedback/0013 #2 (the unfair-stranding guard): while you carry the core you are committed to
  // the way out, with no safe re-entry to re-read a law — so Law Drift PAUSES. Your hard-won
  // knowledge will not rot out from under you mid-escape; the "certainty is decaying" warning
  // never fires for a law you have no chance to re-verify. Drift resumes once the core is delivered.
  if (facts.getBool('possession.pc.salvage_core')) return {};
  for (const law of laws.values()) {
    if (!law.drift) continue;
    if (turn === 0) continue;
    if (facts.getNumber(`law.${law.id}.drift_check_turn`) === turn) continue; // once per law per turn
    const surveyed = facts.getString(`known.law.${law.id}`) === 'surveyed';
    const warned = facts.getBool(`law.${law.id}.drift_warned`);
    // does this law's window WIDEN on drift (the decay that BITES — feedback/0012 #5)? It drives the
    // TONE: a widening law's drift is a real, alarming change in the world; a non-widening law's drift
    // only dulls the fine edge of your certainty — its SHAPE still holds, so reassure rather than alarm
    // (feedback/0013 #2: the Mile-Road decay must not read as an unfair stranding).
    const widens = law.drift.mutates === 'window' && (law.drift.widensTo?.length ?? 0) > 0;

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
        summary: widens
          ? `Something about ${law.title} feels subtly wrong, as if the rule had shifted a hair while you weren't looking. (Your certainty is decaying.)`
          : `Your reading of ${law.title} has aged a little — the fine detail going soft at the edges, the way an old memory does. The shape of it you still hold; only the particulars are worth confirming again, when you can.`,
        data: { law: law.id, widened: widens },
      });
    } else if (surveyed && warned) {
      const muts: FactMutation[] = [
        { op: 'set', key: `known.law.${law.id}`, value: 'approximate' },
        { op: 'set', key: `law.${law.id}.drift_warned`, value: false },
        { op: 'set', key: `law.${law.id}.drift_check_turn`, value: turn },
        { op: 'set', key: `law.${law.id}.drifted_turn`, value: turn },
        { op: 'delete', key: `known.${law.id}.surveyed_turn` }, // re-survey restarts the dwell clock
      ];
      if (widens) muts.push({ op: 'set', key: `law.${law.id}.window_drifted`, value: true }); // the world actually shifts
      events.push({
        tag: 'drift_demote',
        mutations: muts,
        summary: widens
          ? `${law.title} has re-Settled — and it has crept wider than you learned it, its hungry hours reaching now into the grey hour before dawn. The safe margin you read no longer covers the whole of it. Read it again before you trust the old hours.`
          : `${law.title} has slipped a little out of true with the passing hours — the fine edge of your certainty has dulled. You still hold its shape; you would do well to read it again, when you can, to be sure of the particulars.`,
        data: { law: law.id, widened: widens },
      });
    }
  }
  if (!events.length) return {};
  return { nativeNext: native, events, render: { labels: ['drift'], valence: 'cost' } };
}

/** The Hollow Dark's escalating ladder: it warns, dreads, warns explicitly, then closes the distance. */
function hollowDarkTell(law: LawDefinition, closer: number): string {
  if (closer <= 1) return law.failSafe.firstContact.tell;
  if (closer === 2)
    return 'You hold still again, and the dark takes another step in — close enough now that you can feel it deciding about you. Move. Stillness is the thing it hunts.';
  if (closer === 3)
    return 'A third time you stop, and the quiet presses flat against your ears, and your own pulse goes loud and wrong in the silence. Do not stop again. One more held breath in this dark and it will have closed the last of the distance.';
  return 'You go still one time too many.';
}

/** The Mile Road's escalating warning ladder: it warns, dreads, warns explicitly, then takes you. */
function mileRoadTell(law: LawDefinition, lookbacks: number): string {
  if (lookbacks <= 1) return law.failSafe.firstContact.tell;
  if (lookbacks === 2)
    return 'You look back again — and the lamps of the waystation are smaller than a few minutes’ walking could account for. The road is growing behind you, and you feel, with a cold certainty, that it is doing it on purpose.';
  if (lookbacks === 3)
    return 'You look back a third time. The way home is a thin grey thread now, dwindling as you watch. Do not look back again: the road is nearly long enough to keep you, the way it kept the salvager who sits facing the wrong way, forever. One more, and you will be the next of them.';
  return 'You look back one time too many.';
}
