/**
 * social.fate — Fate-style create-advantage + SCOPED reputation (per-NPC /
 * faction / region, never one global number). It is an ACQUISITION layer: a way
 * to obtain the same knowledge-key by other means (ask a Holdout about a rumor,
 * bribe a Salvager for a law-map). Rumors are unreliable — a wrong law gets you
 * killed — so social info is a lead, not a guarantee.
 *
 * Source: Fate Core SRD aspects/create-advantage, CC-BY-3.0 (Evil Hat).
 */
import { evalPredicate, stageRank, type KnowledgeStage } from '../../sdk/law.js';
import { makeManifest } from '../../sdk/define.js';
import type { JsonObject } from '../../sdk/json.js';
import type { Module, ModuleResult, WorldEvent } from '../../sdk/types.js';
import type { WorldPack, NpcDef, DialogueLine } from '../../sdk/worldpack.js';

export function createSocial(pack: WorldPack): Module {
  const npcs = new Map<string, NpcDef>(pack.npcs.map((n) => [n.id, n]));
  const npcAt = new Map<string, string[]>();
  for (const n of pack.npcs) for (const nd of n.atNodes ?? []) (npcAt.get(nd) ?? npcAt.set(nd, []).get(nd)!).push(n.id);

  const manifest = makeManifest({
    id: 'social.fate',
    content: { npcs: pack.npcs.map((n) => n.id) },
    source: 'Fate Core SRD §create-advantage / aspects (CC-BY-3.0)',
    license: { identifier: 'CC-BY-3.0', attribution: 'Fate Core by Evil Hat Productions', tier: 'green', provenance: 'licensed-source', indicationOfChanges: 'reimplemented as deterministic create-advantage + scoped reputation' },
    domain: 'social',
    priority: 25,
    intents: ['talk', 'parley', 'bribe', 'intimidate', 'say', 'give', 'ask_about'],
    writesFacts: ['reputation', 'aspect', 'known', 'flag', 'objective', 'possession'],
    readsFacts: ['reputation', 'aspect', 'known', 'flag', 'possession', 'loc'],
  });

  function presentNpc(node: string | undefined, targetId?: string, raw?: string): { npc?: NpcDef; namedButAbsent?: string } {
    if (!node) return {};
    const here = (npcAt.get(node) ?? []).map((id) => npcs.get(id)!).filter(Boolean);
    if (targetId && npcs.has(targetId)) {
      const t = npcs.get(targetId)!;
      return here.includes(t) ? { npc: t } : { namedButAbsent: t.name };
    }
    if (raw) {
      const q = raw.toLowerCase();
      const m = here.find((n) => n.names.some((nm) => q.includes(nm.toLowerCase())));
      if (m) return { npc: m };
      // a name was given but matches no one present -> say so, don't silently retarget
      const knownElsewhere = [...npcs.values()].find((n) => n.names.some((nm) => q.includes(nm.toLowerCase())));
      if (knownElsewhere) return { namedButAbsent: knownElsewhere.name };
    }
    return { npc: here[0] };
  }

  function pickLine(npc: NpcDef, topic: string | undefined, facts: import('../../sdk/facts.js').FactView): DialogueLine | undefined {
    const lines = (npc.dialogue ?? []).filter((l) => !l.when || evalPredicate(l.when, facts));
    if (topic) {
      const q = topic.toLowerCase();
      const t = lines.find((l) => l.topic && (l.topic === topic || q.includes(l.topic.toLowerCase())));
      if (t) return t;
    }
    return lines.find((l) => !l.topic) ?? lines[0];
  }

  return {
    manifest,
    init: (): JsonObject => ({}),
    claims: (intent, _facts, armed) => armed.has('social') && ['talk', 'parley', 'bribe', 'intimidate', 'say', 'give', 'ask_about'].includes(intent.class),
    validateLegality: (intent, _native, facts) => {
      const node = facts.getString('loc.pc');
      const { npc, namedButAbsent } = presentNpc(node, intent.target?.id, intent.target?.raw);
      if (namedButAbsent) return { legal: false, reason: `${namedButAbsent} is not here` };
      if (!npc) return { legal: false, reason: 'there is no one here to talk to' };
      return { legal: true, args: { npc: npc.id } };
    },
    execute: (args): ModuleResult => {
      const c = args.action.intent.class;
      const intent = args.action.intent;
      const npc = npcs.get((args.action.args as { npc: string }).npc)!;
      const facts = args.facts;
      const topic = intent.topic ?? intent.target?.raw;

      // talk / ask_about / say -> dialogue. An ask_about whose topic matches NO line gets
      // an HONEST deflection, never a silent greeting replay (which reads as a parser miss).
      if (c === 'talk' || c === 'ask_about' || c === 'say') {
        if (c === 'ask_about' && topic) {
          const hit = pickTopicLine(npc, topic, facts);
          if (!hit) return beat(args.native, deflect(npc, facts), ['social.no_topic']);
          return dialogue(npc, hit, args.native);
        }
        const line = pickLine(npc, undefined, facts); // greeting (state-aware via `when`)
        if (!line) return beat(args.native, `${npc.name} has nothing to say to that.`, ['social.silence']);
        return dialogue(npc, line, args.native);
      }

      // a MERCHANT is an NPC who sells a law-map (a grantsLeadTell line). give/pay/bribe one
      // -> execute the trade: pay, receive the map (codex-visible), once. The natural verbs
      // all work, the payment is actually spent, and each merchant's prose is its own.
      const lawLine = (npc.dialogue ?? []).find((l) => l.grantsLeadTell && (!l.when || evalPredicate(l.when, facts)));
      if (lawLine && (c === 'give' || c === 'bribe')) {
        return trade(npc, lawLine, c, intent, facts, args.native);
      }

      // give something to a non-merchant, or a non-payment -> nothing doing
      if (c === 'give') return beat(args.native, `${npc.name} has no use for that.`, ['social.give_none']);

      // parley / intimidate / (bribing a non-merchant) -> a create-advantage contest
      const roll = args.tape.die('social', 6, 'fate');
      const rep = facts.getNumber(`reputation.pc.${npc.faction ?? npc.id}`) ?? (npc.disposition ?? 0);
      const success = roll + Math.sign(rep) * 1 >= 4;
      const dir = success ? 1 : -1;
      const events: WorldEvent[] = [
        { tag: `social_${c}`, mutations: [{ op: 'adjust', key: `reputation.pc.${npc.faction ?? npc.id}`, by: dir, min: -3, max: 3 }], summary: contestLine(npc, c, success), data: { npc: npc.id, success } },
      ];
      return { nativeNext: args.native, events, control: { kind: 'continue' }, render: { labels: [`social.${c}`, `npc.${npc.id}`], valence: success ? 'boon' : 'cost' } };
    },
  };

  function mutFromLine(line: DialogueLine): WorldEvent['mutations'] {
    const m: { op: 'set'; key: string; value: import('../../sdk/json.js').JsonValue }[] = [];
    if (line.grantsRumor) m.push({ op: 'set', key: `known.rumor.${line.grantsRumor}`, value: true });
    if (line.grantsLeadTell) m.push({ op: 'set', key: `known.tell.${line.grantsLeadTell}`, value: true });
    for (const [k, v] of Object.entries(line.setsFacts ?? {})) m.push({ op: 'set', key: k, value: v });
    return m;
  }

  function beat(native: JsonObject, summary: string, labels: string[]): ModuleResult {
    return { nativeNext: native, events: [{ tag: 'social_beat', mutations: [], summary }], control: { kind: 'continue' }, render: { labels } };
  }

  function contestLine(npc: NpcDef, c: string, success: boolean): string {
    const verb = c === 'bribe' ? 'take your offer' : c === 'intimidate' ? 'back down' : 'hear you out';
    return success ? `${npc.name} seems to ${verb}.` : `${npc.name} does not ${verb}. The air goes colder between you.`;
  }

  function dialogue(npc: NpcDef, line: DialogueLine, native: JsonObject): ModuleResult {
    return {
      nativeNext: native,
      events: [{ tag: 'dialogue', mutations: mutFromLine(line), summary: `${npc.name}: “${line.text}”`, data: { npc: npc.id, line: line.id } }],
      control: { kind: 'continue' },
      render: { labels: ['social.talk', `npc.${npc.id}`], hints: { npc: npc.id, grants: line.grantsRumor ?? line.grantsLeadTell ?? null } },
    };
  }

  function pickTopicLine(npc: NpcDef, topic: string, facts: import('../../sdk/facts.js').FactView): DialogueLine | undefined {
    const q = topic.toLowerCase();
    return (npc.dialogue ?? [])
      .filter((l) => !l.when || evalPredicate(l.when, facts))
      // a grantsLeadTell line is the PAID law-map payload — never hand it over via a free ask
      .find((l) => l.topic !== undefined && !l.grantsLeadTell && (l.topic === topic || q.includes(l.topic.toLowerCase())));
  }

  // an unmatched ask: a merchant with an unbought law-map points you at PAYING (so a paywall
  // never reads as a parser miss); anyone else honestly admits they have nothing to say.
  function deflect(npc: NpcDef, facts: import('../../sdk/facts.js').FactView): string {
    const sells = (npc.dialogue ?? []).find((l) => l.grantsLeadTell && (!l.when || evalPredicate(l.when, facts)));
    const lawId = sells ? Object.keys(sells.setsFacts ?? {}).find((k) => k.startsWith('known.purchased.'))?.slice('known.purchased.'.length) : undefined;
    const unbought = lawId !== undefined && !facts.getBool(`known.purchased.${lawId}`) && stageRank((facts.getString(`known.law.${lawId}`) ?? 'unknown') as KnowledgeStage) < stageRank('surveyed');
    if (unbought) return `${npc.name}: “That is not free talk — that is what I sell. Pay me for it (give a coin, or “pay ${npc.names[0]}”) and it is yours.”`;
    return `${npc.name} shakes their head. “Nothing I can tell you about that.”`;
  }

  function coinHeld(facts: import('../../sdk/facts.js').FactView): string | undefined {
    const k = facts.keysUnder('possession.pc').find((key) => key.endsWith('.class') && facts.getString(key) === 'coin');
    return k ? k.slice('possession.pc.'.length, -'.class'.length) : undefined;
  }

  // give/pay/bribe a merchant -> buy the law-map: spend the payment, grant the map (codex-visible
  // via the line's setsFacts), once. Honest refusal if there's nothing to pay with.
  function trade(npc: NpcDef, lawLine: DialogueLine, c: string, intent: import('../../sdk/intents.js').ParsedIntent, facts: import('../../sdk/facts.js').FactView, native: JsonObject): ModuleResult {
    const lawId = Object.keys(lawLine.setsFacts ?? {}).find((k) => k.startsWith('known.purchased.'))?.slice('known.purchased.'.length);
    // already BOUGHT it from this merchant — don't double-sell, don't double-charge
    if (lawId && facts.getBool(`known.purchased.${lawId}`)) {
      return beat(native, `${npc.name}: “You've had that map from me already — I don't sell the same law twice. Go put it to use.”`, ['social.already']);
    }
    // you already SURVEYED it yourself — refuse the coin honestly (not "you bought this")
    if (lawId && stageRank((facts.getString(`known.law.${lawId}`) ?? 'unknown') as KnowledgeStage) >= stageRank('surveyed')) {
      return beat(native, `${npc.name}: “You already know that one cold — I can see it on you. Keep your coin; I'll not sell you what you've read with your own eyes.”`, ['social.already_known']);
    }
    let payId: string | undefined;
    if (c === 'give') {
      const gid = intent.target?.id;
      if (gid && facts.getBool(`possession.pc.${gid}`)) {
        const cls = facts.getString(`possession.pc.${gid}.class`);
        if (gid === 'antenna_relic' || cls === 'coin' || cls === 'salvage') payId = gid;
      }
    } else {
      payId = coinHeld(facts);
    }
    if (!payId) return beat(native, `${npc.name} wants paying first — a coin, or something genuinely worth the trade. Check what you carry (INVENTORY).`, ['social.needs_pay']);
    const muts: WorldEvent['mutations'] = [
      ...mutFromLine(lawLine),
      { op: 'delete', key: `possession.pc.${payId}` },
      { op: 'delete', key: `possession.pc.${payId}.class` },
      { op: 'adjust', key: `reputation.pc.${npc.faction ?? npc.id}`, by: 1, min: -3, max: 3 },
    ];
    return {
      nativeNext: native,
      events: [{ tag: 'trade', mutations: muts, summary: `${npc.name}: “${lawLine.text}”\n(You hand over ${payId === 'antenna_relic' ? 'the antenna-shard' : 'your coins'}.)`, data: { npc: npc.id, trade: lawId ?? 'lawmap', paid: payId } }],
      control: { kind: 'continue' },
      render: { labels: ['social.trade', `npc.${npc.id}`], valence: 'boon' },
    };
  }
}
