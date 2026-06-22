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
    version: '0.3.0', // feedback/0014 #1: the core is anomalous worked matter — carrying it across the dark Greywater ford threatens it (a deduced, failable law made UNAVOIDABLE on the win path)
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
   * Would a multi-hour WAIT here be hazardous — i.e. would fast-forwarding the clock through the
   * dark silently skip a law that bites a waiting player (feedback/0016 #1)? This is PHASE-INDEPENDENT
   * (it asks "if I wait through the hungry hours, does anything here have teeth for me?") so the time
   * module can read it BEFORE it decides the jump, regardless of the current phase. The clock fast-
   * forwards only when this is false; otherwise it advances one ordinary step and the law fires
   * turn-by-turn exactly as today — no law is ever silently skipped.
   *
   * A live, in-scope law is a wait-hazard when:
   *   - its trigger fires on wait/rest in a dark phase (the Hollow Dark: stillness in the deep), OR
   *   - it degrades worked matter the player is carrying in the dark (the Greywater: iron, or the
   *     anomalous core), so waiting in the water with metal/core feeds the loss.
   */
  function waitFastForwardUnsafe(node: string | undefined, facts: FactView): boolean {
    if (!node) return false;
    const DARK = ['dusk', 'night', 'predawn'];
    const gatePhases = (law: LawDefinition): string[] => {
      const out = new Set<string>();
      const collect = (p: unknown) => {
        if (!p || typeof p !== 'object') return;
        const o = p as Record<string, unknown>;
        if (Array.isArray(o.phase)) for (const x of o.phase) out.add(String(x));
        else if (typeof o.phase === 'string') out.add(o.phase);
        if (Array.isArray(o.all)) for (const q of o.all) collect(q);
        if (Array.isArray(o.any)) for (const q of o.any) collect(q);
      };
      collect(law.ambientGate);
      collect(law.trigger);
      // a window-drifted law has crept into the phase(s) it widensTo (e.g. predawn)
      if (facts.getBool(`law.${law.id}.window_drifted`)) for (const p of law.drift?.widensTo ?? []) out.add(p);
      return [...out];
    };
    for (const law of laws.values()) {
      if (facts.getBool(`law.${law.id}.live`) === false) continue;
      if (!inScope(law, node)) continue;
      const phases = gatePhases(law);
      const darkGated = phases.some((p) => DARK.includes(p));
      if (!darkGated) continue; // a law that bites only by day cannot ambush a dark wait
      // a stillness law (wait/rest trigger): waiting through the dark IS the trigger
      const intents = law.trigger && 'intent' in law.trigger ? law.trigger.intent : undefined;
      const intentList = Array.isArray(intents) ? intents : intents ? [intents] : [];
      if (intentList.includes('wait') || intentList.includes('rest')) return true;
      // a matter-degrading law: unsafe only if you carry what the dark will un-make (the class, or
      // the anomalous core — worked matter the Greywater wants home).
      if (law.effect.kind === 'degrade_item_class') {
        if (carryingClass(facts, law.effect.itemClass)) return true;
        if (facts.getBool('possession.pc.salvage_core')) return true;
      }
    }
    return false;
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

  /**
   * Is the Greywater law in its HUNGRY phase right now? Reuses the exact gate the iron-degrade
   * uses — its `ambientGate` (dusk/night), evaluated through the same `widenedPhaseView` so a
   * DRIFTED window (the predawn the decay crept into, feedback/0014 #4) also reads as hungry.
   * This is the phase-window the bespoke "core in the water" handler shares with the iron.
   */
  function greywaterHungry(law: LawDefinition, facts: FactView): boolean {
    if (facts.getBool(`law.${law.id}.live`) === false) return false;
    const ev = widenedPhaseView(law, facts) ?? facts;
    return law.ambientGate ? evalPredicate(law.ambientGate, ev) : true;
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
        // the law slumps worked metal toward ore — a reversible material degrade. feedback/0022 #1: the
        // iron-degrade was the ONE place this law broke the game's "first contact WARNS, never destroys"
        // principle — iron vanished to ore in one silent beat while the core has a fair warn-ladder. Now
        // iron gets the SAME fail-safe-first grace: first hungry beat = WARN (`softening`), the next =
        // slump to ore. Softening recovers on leaving the water (onBeat), so the two worked-matter
        // degrades read as one coherent law. The line still fires only on a transition (no per-move repeat).
        for (const k of facts.keysUnder('possession.pc')) {
          if (k.endsWith('.class') && facts.getString(k) === effect.itemClass) {
            const itemKey = k.slice(0, -'.class'.length);
            const cond = facts.getString(`${itemKey}.condition`);
            if (cond === effect.toCondition) continue; // already ore — no repeat
            if (cond !== 'softening') {
              events.push({
                tag: 'law_degrade_warn',
                mutations: [{ op: 'set', key: `${itemKey}.condition`, value: 'softening' }],
                summary:
                  'The iron in your kit begins to go soft and red at the edges — the Greywater has caught it, the way it catches all worked metal after dark. Get it clear of the water, or shed it, before it slumps the rest of the way to ore.',
                data: { law: law.id, item: itemKey },
                severity: 'reversible',
              });
            } else {
              events.push({
                tag: 'law_degrade',
                mutations: [{ op: 'set', key: `${itemKey}.condition`, value: effect.toCondition }],
                summary:
                  'The iron in your kit slumps the last of the way — soft and rotten-red, gone to dead ore in your hands.',
                data: { law: law.id, item: itemKey },
                severity: 'reversible',
              });
            }
          }
        }
        break;
      }
      case 'summon': {
        // The Changed COME toward a spoken name — they do not teleport onto it (feedback/0013 #5).
        // A spoken name escalates a `coming` ladder, never collapsing warning and death into one
        // beat: the FIRST name warns and the Changed begins to come (delegated-lethality clamp →
        // a non-lethal cold brush); the SECOND name (or a lingering beat, handled in the hunt
        // machine) is an explicit last warning that RETURNS CONTROL — one beat to break for the
        // edge of the field; only the THIRD name (or lingering past that warning) is lethal.
        // Leaving the field escapes at any rung. The same fair, telegraphed ladder as the Mile
        // Road and the Hollow Dark — honouring the law the field itself teaches.
        const coming = (facts.getNumber(`law.${law.id}.coming`) ?? 0) + 1;
        const muts: FactMutation[] = [
          { op: 'set', key: `law.${law.id}.coming`, value: coming },
          { op: 'set', key: `law.${law.id}.active`, value: true }, // the Changed is now hunting
          { op: 'set', key: `law.${law.id}.active_turn`, value: turn },
        ];
        if (coming <= 1) {
          // first name: the fail-safe warning + the clamped, non-lethal brush
          muts.push({ op: 'set', key: `law.${law.id}.summoned_turn`, value: turn });
          scheduled.push(changedStrike(law.id, turn, effect.entity, true));
          events.push({
            tag: 'law_summon',
            mutations: muts,
            summary: law.failSafe.firstContact.tell,
            data: { law: law.id, coming },
          });
        } else if (coming === 2) {
          // second name: an explicit last warning that returns control — one beat to flee
          events.push({
            tag: 'law_summon',
            mutations: muts,
            summary: antennaComingTell(2, false),
            data: { law: law.id, coming },
          });
        } else {
          // third name (or beyond): the field gives you to what answered it
          scheduled.push(changedStrike(law.id, turn, effect.entity, false));
          events.push({
            tag: 'law_summon',
            mutations: muts,
            summary: antennaComingTell(coming, false),
            data: { law: law.id, coming },
          });
        }
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
          // leaving the field is the fair escape at ANY rung — the Changed loses the thread.
          huntEvents.push({
            tag: 'antenna_escape',
            mutations: [
              { op: 'set', key: 'law.antenna_field.active', value: false },
              { op: 'set', key: 'law.antenna_field.coming', value: 0 },
            ],
            summary:
              'You put the antenna field behind you. Out in the dark, the thing that heard you loses the thread of you — and turns away, slow and reluctant, to listen for someone else.',
            data: { law: 'antenna_field' },
          });
          huntRender = { labels: ['antenna.escape'], valence: 'boon' };
        } else if (!spokeThisTurn && activeTurn !== undefined && activeTurn < ctx.turn) {
          // standing still lets the Changed keep COMING — it advances one rung a beat, it does not
          // pounce out of nowhere (feedback/0013 #5). The second rung is an explicit last warning
          // that returns control; only lingering PAST it closes the distance for good.
          const coming = (facts.getNumber('law.antenna_field.coming') ?? 1) + 1;
          if (coming === 2) {
            huntEvents.push({
              tag: 'antenna_coming',
              mutations: [
                { op: 'set', key: 'law.antenna_field.coming', value: coming },
                { op: 'set', key: 'law.antenna_field.active_turn', value: ctx.turn },
              ],
              summary: antennaComingTell(2, true),
              data: { law: 'antenna_field' },
            });
            huntRender = { labels: ['antenna.coming'], valence: 'cost' };
          } else {
            huntScheduled.push(changedStrike('antenna_field', ctx.turn, 'the_changed', false));
            huntEvents.push({
              tag: 'antenna_close',
              mutations: [
                { op: 'set', key: 'law.antenna_field.active', value: false },
                { op: 'set', key: 'law.antenna_field.coming', value: coming },
              ],
              summary:
                'You stayed in the field a beat too long. The Changed has closed the distance, and the hum is the sound of it arriving.',
              data: { law: 'antenna_field' },
            });
            huntRender = { labels: ['antenna.close'], valence: 'cost' };
          }
        }
      }

      // The bespoke "core in the Greywater" machine (feedback/0014 #1): the salvage core is
      // anomalous WORKED MATTER, and after dark the Greywater wants all worked matter home in
      // the mud — so carrying it across the (unavoidable) Greywater nodes in the hungry phase
      // threatens the prize itself. A FAIR escalating ladder (mirrors the antenna `coming` and
      // the Mile-Road lookback ladders): warn, last-warn, then slump it to ore (the lose-state).
      // Leaving the Greywater scope OR the phase going safe CLEARS the ladder and knits the core
      // whole again — no unwarned loss, ever. This is the one deduced, failable law made
      // UNAVOIDABLE on the win path (the linear cache->bottoms->ford route re-crosses it).
      const coreEvents: WorldEvent[] = [];
      let coreRender: BeatResult['render'] | undefined;
      // idempotent per turn: the engine polls standing beat-triggers to convergence, so the ladder
      // must advance AT MOST ONE rung per acting beat (mirrors the law `fired_turn` guard). Once we
      // have acted on the core this turn, no further core mutation fires.
      if (facts.getNumber('law.greywater.core_acted_turn') !== ctx.turn) {
        const grey = laws.get('greywater');
        const carryingCore = facts.getBool('possession.pc.salvage_core') === true;
        const inGrey = grey ? inScope(grey, node) : false;
        const hungry = grey ? greywaterHungry(grey, facts) : false;
        const actingBeat = facts.getNumber('flag.last_turn') === ctx.turn;
        const warned = facts.getNumber('law.greywater.core_warned') ?? 0;
        const condition = facts.getString('possession.pc.salvage_core.condition');
        const alreadyOre = condition === 'ore';
        const actedMut = { op: 'set' as const, key: 'law.greywater.core_acted_turn', value: ctx.turn };

        if (carryingCore && grey && inGrey && hungry && actingBeat && !alreadyOre) {
          // one rung per acting beat: escalate the ladder.
          const rung = warned + 1;
          if (rung <= 1) {
            coreEvents.push({
              tag: 'core_hunger',
              mutations: [
                actedMut,
                { op: 'set', key: 'law.greywater.core_warned', value: rung },
                { op: 'set', key: 'possession.pc.salvage_core.condition', value: 'unstable' },
              ],
              summary: coreHungerTell(1),
              data: { law: 'greywater', rung },
              severity: 'reversible',
            });
            coreRender = { labels: ['law.greywater', 'core.hunger'], valence: 'cost' };
          } else if (rung <= 3) {
            // feedback/0020 #2 — the window is widened from 2 warned beats to 3 (loss on the 4th), so a
            // player who BEELINES out of the water reaches dry ground before the slump completes (the
            // night15a "2-move no-meter trap"). rung 2 escalates; rung 3 is the explicit last margin.
            coreEvents.push({
              tag: 'core_hunger',
              mutations: [actedMut, { op: 'set', key: 'law.greywater.core_warned', value: rung }],
              summary: coreHungerTell(rung),
              data: { law: 'greywater', rung },
              severity: 'reversible',
            });
            coreRender = { labels: ['law.greywater', 'core.hunger'], valence: 'cost' };
          } else {
            // rung 4: the Greywater remembers what worked matter was for. The core slumps to ore
            // (the lost_core_to_greywater goal fires on this condition).
            coreEvents.push({
              tag: 'core_lost',
              mutations: [
                actedMut,
                { op: 'set', key: 'law.greywater.core_warned', value: rung },
                { op: 'set', key: 'possession.pc.salvage_core.condition', value: 'ore' },
              ],
              summary: coreHungerTell(4),
              data: { law: 'greywater', rung },
              severity: 'irreversible',
            });
            coreRender = { labels: ['law.greywater', 'core.lost'], valence: 'cost' };
          }
        } else if (carryingCore && !alreadyOre && (warned > 0 || condition === 'unstable') && (!inGrey || !hungry)) {
          // FULL RECOVERY: the moment you are out of the water OR the dark has passed (the phase is
          // safe), the core knits back whole — clear the ladder and delete the `unstable` mark.
          // (Only when the core has NOT already slumped to ore — that loss is permanent.)
          coreEvents.push({
            tag: 'core_recovered',
            mutations: [
              actedMut,
              { op: 'set', key: 'law.greywater.core_warned', value: 0 },
              { op: 'delete', key: 'possession.pc.salvage_core.condition' },
            ],
            summary: coreRecoverTell(!inGrey),
            data: { law: 'greywater' },
            severity: 'reversible',
          });
          coreRender = { labels: ['core.recovered'], valence: 'boon' };
        }
      }

      // feedback/0022 #1 — softening iron RECOVERS like the core: out of the water (or the dark passed)
      // before it slumps, and the metal firms back whole. Guarded once-per-turn (mirrors the core ladder)
      // so the convergence poll terminates; only fires on an actual recovery (an unchanged value would not).
      const metalRecoverEvents: WorldEvent[] = [];
      if (facts.getNumber('law.greywater.metal_acted_turn') !== ctx.turn) {
        const grey = laws.get('greywater');
        const inGreyM = grey ? inScope(grey, node) : false;
        const hungryM = grey ? greywaterHungry(grey, facts) : false;
        if (!inGreyM || !hungryM) {
          for (const k of facts.keysUnder('possession.pc')) {
            if (k.endsWith('.class') && facts.getString(k) === 'metal') {
              const itemKey = k.slice(0, -'.class'.length);
              if (facts.getString(`${itemKey}.condition`) === 'softening') {
                metalRecoverEvents.push({
                  tag: 'metal_recovered',
                  mutations: [
                    { op: 'set', key: 'law.greywater.metal_acted_turn', value: ctx.turn },
                    { op: 'delete', key: `${itemKey}.condition` },
                  ],
                  summary:
                    'The iron you carried up out of the water firms back as the Greywater loses its hold — the red softness fading, the edge of it hard and honest again. You caught it in time.',
                  data: { law: 'greywater', item: itemKey },
                  severity: 'reversible',
                });
              }
            }
          }
        }
      }

      // publish the "is a long wait here safe?" fact for the clock's fast-forward gate (feedback/0016
      // #1). Emit ONLY on a change so the convergence poll still terminates (an unchanged value would
      // keep the beat-loop flagged as changed forever). Read next turn by time.cycle, BEFORE it decides
      // a `wait until <phase>` jump — so a hazard window can never be silently skipped.
      const ffEvents: WorldEvent[] = [];
      const ffUnsafe = waitFastForwardUnsafe(node, facts);
      if (facts.getBool('law.wait_ff_unsafe') !== ffUnsafe) {
        ffEvents.push({
          tag: 'wait_ff_gate',
          mutations: [{ op: 'set', key: 'law.wait_ff_unsafe', value: ffUnsafe }],
          visibility: 'private',
        });
      }

      // Hollow Dark legibility (feedback/0016 #4): the law hunts STILLNESS in the OPEN deep (the fork,
      // the deep mile, the antenna field). The drowned hamlet's walls break that open dark, so the
      // Greywater bottoms are a sheltered pocket OUT of its scope — but a player who held still in the
      // pump-house and felt nothing read the law as a bluff (p006). When the Hollow Dark is LIVE and
      // you wait/rest at night in one of those sheltered greywater pockets, say so ONCE — so the safe
      // pocket reads as a learned rule (shelter is safe; the open deep is the danger), not a toothless
      // threat. It costs nothing and teaches the contrast; the convergence poll terminates on the
      // `shelter_seen` high-water mark, like the core ladder's per-turn guard.
      const shelterEvents: WorldEvent[] = [];
      const lastIntent = facts.getString('flag.last_intent');
      const SHELTERED_DEEP = node === 'greywater_ford' || node === 'greywater_bottoms' || node === 'greywater_cache';
      if (
        SHELTERED_DEEP &&
        facts.getString('phase.now') === 'night' &&
        facts.getBool('law.hollow_dark.live') === true &&
        facts.getNumber('flag.last_turn') === ctx.turn &&
        (lastIntent === 'wait' || lastIntent === 'rest') &&
        !facts.getBool('known.hollow_dark.shelter_seen')
      ) {
        shelterEvents.push({
          tag: 'hollow_shelter',
          mutations: [{ op: 'set', key: 'known.hollow_dark.shelter_seen', value: true }],
          summary:
            'You hold still — and nothing leans in. Out in the open deep the Hush hunts the stillness; but here, in the lee of the drowned walls, the dark has no open reach. The hollow places keep to the bare ground above, and cannot get at you behind stone and standing water. A sheltered pocket — you could wait out the worst of the dark down here, were the water itself not the other danger.',
          data: { law: 'hollow_dark' },
        });
      }

      // law_trigger: fold all firing laws in canonical order (K6)
      const firing = foldOrder([...laws.values()].filter((l) => inScope(l, node) && triggers(l, facts, ctx.turn)));
      if (
        firing.length === 0 &&
        huntEvents.length === 0 &&
        coreEvents.length === 0 &&
        metalRecoverEvents.length === 0 &&
        ffEvents.length === 0 &&
        shelterEvents.length === 0
      )
        return {};

      const events: WorldEvent[] = [...huntEvents, ...coreEvents, ...metalRecoverEvents, ...ffEvents, ...shelterEvents];
      const scheduled: ScheduledEvent[] = [...huntScheduled];
      let render: BeatResult['render'] | undefined =
        coreRender ??
        huntRender ??
        (metalRecoverEvents.length ? { labels: ['greywater.metal_recovered'], valence: 'boon' } : undefined) ??
        (shelterEvents.length ? { labels: ['hollow_dark.shelter'], valence: 'boon' } : undefined);
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

/** Build the delegated changed_strike (combat.ito enforces the first-contact lethality clamp). */
function changedStrike(lawId: string, turn: number, entity: string, firstContact: boolean): ScheduledEvent {
  return {
    fireAtTurn: turn,
    phase: 'summon_act',
    module: 'combat.ito',
    kind: 'changed_strike',
    id: `changed:${lawId}:${turn}`,
    order: 0,
    payload: { law: lawId, firstContact, entity },
  };
}

/**
 * The Antenna Field's escalating ladder (feedback/0013 #5): warn (the Changed begins to come),
 * then an explicit last warning that RETURNS CONTROL — one beat to flee — then, only on a third
 * name or lingering past that warning, the close. Mirrors mileRoadTell / hollowDarkTell.
 */
function antennaComingTell(coming: number, lingered: boolean): string {
  if (coming === 2)
    return lingered
      ? 'You hold still, and the hum gropes the dark for you — and finds the thread again. Out past the light something wrong-jointed is moving toward you, closer than it was. This is the one beat you get: break for the edge of the field, NOW.'
      : 'Your voice goes out a second time and the field hurls it back, and far off something that was already coming toward you comes faster — you can hear it now, hurrying, wrong. Get out of the field, this beat, before it has your range.';
  return 'A third name leaves your mouth, and the field gives you to what answered it. There is no distance left now for it to cross.';
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

/**
 * The "core in the Greywater" ladder (feedback/0014 #1): the carry-out adds its OWN escalating
 * warnings before any loss — rung 1 names the danger and the ONE truthful recovery while you carry
 * it (get OUT of the water, up to the fork), rung 2 is a sharper last warning, rung 3 is the slump
 * to ore. Mirrors the Mile Road / Antenna / Hollow Dark ladders: telegraphed, deducible, never an
 * unwarned loss. (Note: "wait it out" is the PRE-retrieval strategy — you wait the dark out at the
 * ford WITHOUT the core, then cross in the safe hour. Once the core is in hand, waiting in the water
 * only feeds the loss, so the carry-out warning points solely at getting clear of the water.)
 */
function coreHungerTell(rung: number): string {
  if (rung <= 1)
    return 'The core goes soft in your hands — its wrong-heavy weight sloughing, the surface of it crawling like wet clay. The Greywater has caught the worked-matter scent of it and started to call it apart, the way it calls the iron. Get it out of the water — up to the fork, to dry ground — before it is lost. There is no waiting the dark out while you carry it; the hungry water only takes it faster. (You should have crossed in the safe hour. Make for dry ground now and you can still carry it out whole.)';
  if (rung === 2)
    return 'The core sags further in your pack, a knot of not-quite-stone trying to remember it was ever worked at all. The water has its scent and will not let go while you are in it. Keep moving — up out of the Greywater, to the fork and dry ground — and do not stop in the hum.';
  if (rung === 3)
    return 'The core is barely holding its shape now, the wrong weight running out of it like water through a fist. This is the last of your margin: one more beat in the hungry dark and it slumps to dead red ore in your pack. OUT of the Greywater this instant — one move more to the fork and dry ground — and do not carry it another step into the hum.';
  return 'You carried worked anomaly one step too far into the iron-hungry dark, and the Greywater took the last of it: the core slumps in your hands to a fist of red, rotten ore, its wrong weight gone, ordinary and ruined. The water remembered what it was for.';
}

/** Full recovery: out of the water, or the dark passed — the core knits back whole. */
function coreRecoverTell(leftWater: boolean): string {
  return leftWater
    ? 'You carry the core up out of the Greywater, and the moment the water is behind you its wrong weight settles and firms — the sloughing stops, the worked-matter knot of it whole again in your hands. Dry ground; the dark cannot call it from here.'
    : 'The hungry hour passes, and with the light the core firms back whole in your hands — its wrong weight steadying, the sloughing stilled. The Greywater has gone back to sleep, and let go of what you carry.';
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
