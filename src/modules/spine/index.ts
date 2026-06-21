/**
 * spine.fu-pbta — the permanent narrative floor. Freeform Universal's one-die
 * ladder + a PbtA move-pattern, used for the in-between beats no specialist
 * claims (wait, rest, look, recall, generic use/open/close, and the
 * UNCLASSIFIED fallback). The d6 decides narrative COLOUR ONLY — never whether a
 * physical solution succeeds (that is always a law/specialist, never the spine).
 *
 * Source: Freeform Universal "Classic (2020 update)", CC-BY-4.0 (Pickett). The
 * six-rung ladder: Yes-and(6) · Yes(4) · Yes-but(2) · No-but(5) · No(3) · No-and(1).
 */
import { makeManifest } from '../../sdk/define.js';
import type { Band, Module, ModuleResult, WorldEvent } from '../../sdk/types.js';

const LADDER: Record<number, Band> = { 6: 'yes-and', 5: 'no-but', 4: 'yes', 3: 'no', 2: 'yes-but', 1: 'no-and' };

function floorLine(intent: string, utterance?: string): string | undefined {
  switch (intent) {
    case 'speak_aloud':
    case 'call_out':
      return utterance
        ? `You say it aloud — “${utterance}” — and the word goes out into the quiet, and the quiet takes it.`
        : 'You raise your voice into the hush.';
    case 'wait':
      return 'You wait. Time moves on; the Hush does not hurry.';
    case 'rest':
      return 'You rest as well as the Zone allows. Hours pass.';
    case 'recall':
      return undefined; // the codex view handles this
    case 'use':
      return 'You try it, but nothing here answers to being used that way.';
    case 'open':
    case 'close':
      return 'There is nothing here to do that with.';
    case 'unclassified':
      return undefined; // surfaced as a parser nudge instead
    default:
      return undefined;
  }
}

export function createSpine(): Module {
  const manifest = makeManifest({
    id: 'spine.fu-pbta',
    content: { ladder: LADDER },
    source: 'Freeform Universal, Classic (2020 update), §resolution',
    license: {
      identifier: 'CC-BY-4.0',
      attribution: 'Freeform Universal by Pickett',
      tier: 'green',
      provenance: 'licensed-source',
      indicationOfChanges: 'reimplemented as a deterministic tape-driven d6 ladder; narrative-colour only',
    },
    domain: 'narrative',
    priority: 0, // the floor — lowest priority, can never be armed away
    intents: ['wait', 'rest', 'look', 'recall', 'use', 'open', 'close', 'speak_aloud', 'call_out', 'unclassified'],
    writesFacts: ['flag', 'world', 'survival'],
    readsFacts: ['flag', 'world', 'phase', 'survival', 'possession', 'loc', 'law', 'reputation'],
  });

  const CLAIMED = ['wait', 'rest', 'look', 'recall', 'use', 'open', 'close', 'speak_aloud', 'call_out', 'unclassified'];
  return {
    manifest,
    init: () => ({ lastBand: null, beats: 0 }),
    claims: (intent) => CLAIMED.includes(intent.class),
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => {
      const native = args.native as { beats: number };
      const intent = args.action.intent;
      const c = intent.class;
      const facts = args.facts;

      // The watched gate: an intercepted carry-out is cleared by an ACT. Two acts live here — LEAN ON
      // THE DEBT (a Strider who owes you walks you out) and PRY (good iron levers the wire-gap). The
      // third route, the silent SLIP, is earned in stealth (HIDE, metal-free, under dark).
      if (
        c === 'use' &&
        facts.getString('loc.pc') === 'cordon_checkpoint' &&
        facts.getBool('flag.intercepted') &&
        !facts.getBool('flag.intercept_clear')
      ) {
        // DEBT — feedback/0018 night14: the Strider debt no longer opens the gate by merely existing.
        // You must LEAN ON IT (an act). A debt you do not hold is a fair near-miss, never a wall.
        const rawTarget = (intent.target?.raw ?? '').toLowerCase();
        const invokesDebt = intent.topic === 'debt' || /\b(debt|favou?r|strider|mox|owe)\b/.test(rawTarget);
        if (invokesDebt) {
          const owed = (facts.getNumber('reputation.pc.striders') ?? 0) >= 1;
          if (owed) {
            return {
              nativeNext: native,
              events: [
                {
                  tag: 'debt_called',
                  mutations: [{ op: 'set', key: 'flag.intercept_clear', value: true }],
                  summary:
                    'You lean on the debt. The Strider who owes you peels off the wire, says a low word to Warden Holt that you do not catch, and walks you through the boom gate like baggage — Mox keeps her debts, and collects them. You are past the wire, the core still warm at your spine.',
                  severity: 'reversible',
                },
              ],
              control: { kind: 'continue' },
              render: { labels: ['intercept.debt'], valence: 'boon' },
            };
          }
          return {
            nativeNext: native,
            events: [
              {
                tag: 'debt_none',
                mutations: [],
                summary:
                  'You look for a Strider to lean on — but no one here owes you a thing, and a debt you never earned will not be honoured. Another way, then: slip the gate unseen (ask Holt about the gap, shed your iron, and HIDE under cover of dark), or lever the wire-gap wide with good iron.',
              },
            ],
            control: { kind: 'continue' },
            render: { labels: ['intercept.debt_none'], valence: 'cost' },
          };
        }
        const metalKeys = facts
          .keysUnder('possession.pc')
          .filter((k) => k.endsWith('.class') && facts.getString(k) === 'metal');
        const working = metalKeys.find((k) => facts.getString(`${k.slice(0, -'.class'.length)}.condition`) !== 'ore');
        if (working) {
          return {
            nativeNext: native,
            events: [
              {
                tag: 'pry_gate',
                mutations: [{ op: 'set', key: 'flag.intercept_clear', value: true }],
                summary:
                  'You set good iron to the wire-gap and lever it wide, and post the core through into the dark beyond the fence. The troopers will find a gap in the morning and blame it on rust. You are clear, and gone.',
                severity: 'reversible',
              },
            ],
            control: { kind: 'continue' },
            render: { labels: ['intercept.pry'], valence: 'boon' },
          };
        }
        return {
          nativeNext: native,
          events: [
            {
              tag: 'pry_fail',
              mutations: [],
              summary: metalKeys.length
                ? "You set your iron to the wire and lean — and it folds like warm wax in your hands. The Greywater ate its temper down in the dark, and left you nothing to pry with. You will have to get out another way: slip the gate unseen (you will need its blind spot — ask Holt about the gap — then HIDE), or call in a Strider's debt."
                : "You have nothing on you strong enough to lever the wire. Another way, then — slip the gate unseen (ask Holt about the gap, then HIDE), or call in a Strider's debt.",
            },
          ],
          control: { kind: 'continue' },
          render: { labels: ['intercept.pry_fail'], valence: 'cost' },
        };
      }

      const roll = args.tape.die('spine', 6, 'fu-d6');
      const band = LADDER[roll]!;
      // "wait/rest until <phase>" — surface the requested phase for the clock to fast-forward to
      // in ONE turn (feedback/0016 #1). The time module reads this flag in the phase_change beat and,
      // at a SAFE node, jumps the clock to that boundary instead of advancing one dead +30/+120 step;
      // at a hazardous node it advances one normal step (no law silently skipped). The flag is
      // turn-scoped (paired with the turn) so a stale value never re-fires a jump on the next wait.
      const fastForward =
        (c === 'wait' || c === 'rest') &&
        typeof intent.topic === 'string' &&
        facts.getBool('law.wait_ff_unsafe') !== true;
      // when the clock will fast-forward, the time module narrates the long passage to the named hour —
      // so suppress the spine's terse one-beat "You wait" line (it would read as a contradiction).
      const summary = fastForward ? undefined : floorLine(c, intent.utterance);
      const events: WorldEvent[] = [
        { tag: 'spine_beat', mutations: [{ op: 'set', key: 'flag.last_band', value: band }], visibility: 'private' },
      ];
      if ((c === 'wait' || c === 'rest') && typeof intent.topic === 'string') {
        events.push({
          tag: 'wait_until',
          mutations: [
            { op: 'set', key: 'flag.wait_until_phase', value: intent.topic },
            { op: 'set', key: 'flag.wait_until_turn', value: args.ctx.turn },
          ],
          visibility: 'private',
        });
      }
      // resting recovers your nerve (unless the deep dark is taking it faster — that fires on a later beat)
      const restRecovery =
        c === 'rest' ? [{ op: 'adjust' as const, key: 'survival.pc.unsettled', by: -1, min: 0, max: 5 }] : [];
      if (summary) events.push({ tag: `spine_${c}`, mutations: restRecovery, summary, visibility: 'public' });
      return {
        nativeNext: { lastBand: band, beats: native.beats + 1 },
        events,
        control: { kind: 'continue' },
        render: { band, valence: 'neutral', labels: [`spine.${c}`], hints: { intent: c } },
      };
    },
  };
}
