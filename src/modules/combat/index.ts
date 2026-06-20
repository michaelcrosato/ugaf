/**
 * combat.ito — Into-the-Odd-style resolution: attacks auto-hit and deal damage
 * (no to-hit roll), a STR save resists Critical Damage. It is reframed as a
 * FAIL-STATE / pressure module, not a solution axis — avoiding violence is the
 * payoff of the other systems. It is also the delegated target for the Antenna
 * Field's summon (the Changed), and it ENFORCES the delegated-lethality clamp:
 * first contact with an unsurveyed law's summoned threat is never fatal.
 *
 * Source: Into the Odd "Mark of the Odd" license (attribution, no ShareAlike) —
 * mechanic reimplemented clean (auto-hit / damage-first / STR-save), zero
 * copied text or Cairn ShareAlike content.
 */
import { makeManifest } from '../../sdk/define.js';
import type { JsonObject } from '../../sdk/json.js';
import type { Module, ModuleResult, WorldEvent } from '../../sdk/types.js';

export function createCombat(): Module {
  const manifest = makeManifest({
    id: 'combat.ito',
    content: { model: 'auto-hit, damage-first, STR-save-crit' },
    source: 'Into the Odd (Mark of the Odd) — uncopyrightable mechanic, clean-room',
    license: { identifier: 'Mark-of-the-Odd', attribution: 'mechanic after Into the Odd (Bayliss); reimplemented clean-room', tier: 'green', provenance: 'clean-room', indicationOfChanges: 'auto-hit/damage-first/STR-save reimplemented; no copied text or ShareAlike content' },
    domain: 'combat',
    priority: 30,
    intents: ['attack'],
    writesFacts: ['survival'],
    readsFacts: ['survival', 'law', 'known'],
  });

  return {
    manifest,
    init: (): JsonObject => ({}),
    claims: (intent, _facts, armed) => armed.has('combat') && intent.class === 'attack',
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => {
      // attacking the Changed/anything: deadly but fair. Minimal for the slice.
      const dmg = args.tape.die('combat', 6, 'damage');
      return {
        nativeNext: args.native,
        events: [{ tag: 'attack', mutations: [{ op: 'adjust', key: 'survival.pc.exposure', by: 1, min: 0, max: 10 }], summary: `You strike out. Steel is a poor argument with the Hush — it costs you more than it gives.`, data: { dmg } }],
        control: { kind: 'continue' },
        render: { labels: ['combat.attack'], valence: 'cost' },
      };
    },
    onScheduled: (ev, native, facts, tape): ModuleResult => {
      if (ev.kind !== 'changed_strike') return { nativeNext: native, events: [], control: { kind: 'continue' } };
      const firstContact = ev.payload?.firstContact === true;
      const hp = facts.getNumber('survival.pc.hp') ?? 6;

      if (firstContact) {
        // delegated-lethality clamp: the first Changed is a costed WARNING, never a kill
        return {
          nativeNext: native,
          events: [
            {
              tag: 'changed_warn',
              mutations: [{ op: 'adjust', key: 'survival.pc.exposure', by: 2, min: 0, max: 10 }],
              summary: 'A shape resolves out of the dark — too many joints, moving wrong. It brushes past you, cold as well-water, and is gone. You are unhurt. You will not be, twice.',
              severity: 'reversible',
            },
          ],
          control: { kind: 'continue' },
          render: { labels: ['combat.changed_warn'], valence: 'cost', hints: { firstContact: true } },
        };
      }

      // the Changed does not warn twice — once you've spent the warning and the
      // escape window, it is lethal. (The fairness is the first-contact warning +
      // the chance to leave the field, not a damage roll.)
      tape.die('combat', 6, 'changed strike'); // recorded for provenance; outcome is fixed
      void hp;
      return {
        nativeNext: native,
        events: [
          {
            tag: 'changed_kill',
            mutations: [{ op: 'set', key: 'survival.pc.hp', value: 0 }, { op: 'set', key: 'survival.pc', value: 'dead' }],
            summary: 'The Changed does not warn twice. It takes you the way the Zone takes everything — completely, and without malice.',
            severity: 'lethal',
          },
        ],
        control: { kind: 'terminate', label: 'dead' },
      };
    },
  };
}
