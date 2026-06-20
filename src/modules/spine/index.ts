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
      return utterance ? `You say it aloud — “${utterance}” — and the word goes out into the quiet, and the quiet takes it.` : 'You raise your voice into the hush.';
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
    license: { identifier: 'CC-BY-4.0', attribution: 'Freeform Universal by Pickett', tier: 'green', provenance: 'licensed-source', indicationOfChanges: 'reimplemented as a deterministic tape-driven d6 ladder; narrative-colour only' },
    domain: 'narrative',
    priority: 0, // the floor — lowest priority, can never be armed away
    intents: ['wait', 'rest', 'look', 'recall', 'use', 'open', 'close', 'speak_aloud', 'call_out', 'unclassified'],
    writesFacts: ['flag', 'world'],
    readsFacts: ['flag', 'world', 'phase', 'survival'],
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
      const roll = args.tape.die('spine', 6, 'fu-d6');
      const band = LADDER[roll]!;
      const summary = floorLine(c, intent.utterance);
      const events: WorldEvent[] = [{ tag: 'spine_beat', mutations: [{ op: 'set', key: 'flag.last_band', value: band }], visibility: 'private' }];
      if (summary) events.push({ tag: `spine_${c}`, mutations: [], summary, visibility: 'public' });
      return {
        nativeNext: { lastBand: band, beats: native.beats + 1 },
        events,
        control: { kind: 'continue' },
        render: { band, valence: 'neutral', labels: [`spine.${c}`], hints: { intent: c } },
      };
    },
  };
}
