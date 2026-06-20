/**
 * social.fate — Fate-style create-advantage + SCOPED reputation (per-NPC /
 * faction / region, never one global number). It is an ACQUISITION layer: a way
 * to obtain the same knowledge-key by other means (ask a Holdout about a rumor,
 * bribe a Salvager for a law-map). Rumors are unreliable — a wrong law gets you
 * killed — so social info is a lead, not a guarantee.
 *
 * Source: Fate Core SRD aspects/create-advantage, CC-BY-3.0 (Evil Hat).
 */
import { evalPredicate } from '../../sdk/law.js';
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
    writesFacts: ['reputation', 'aspect', 'known', 'flag', 'objective'],
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
      const npc = npcs.get((args.action.args as { npc: string }).npc)!;
      const facts = args.facts;
      const topic = args.action.intent.topic ?? args.action.intent.target?.raw;

      // ask_about / talk / say -> dialogue (rumors & leads)
      if (c === 'talk' || c === 'ask_about' || c === 'say') {
        const line = pickLine(npc, c === 'ask_about' ? topic : undefined, facts);
        if (!line) return beat(args.native, `${npc.name} has nothing to say to that.`, ['social.silence']);
        const events: WorldEvent[] = [{ tag: 'dialogue', mutations: mutFromLine(line), summary: `${npc.name}: “${line.text}”`, data: { npc: npc.id, line: line.id } }];
        return { nativeNext: args.native, events, control: { kind: 'continue' }, render: { labels: [`social.talk`, `npc.${npc.id}`], hints: { npc: npc.id, grants: line.grantsRumor ?? line.grantsLeadTell ?? null } } };
      }

      // parley / bribe / intimidate -> a create-advantage contest (deterministic off the tape)
      const roll = args.tape.die('social', 6, 'fate');
      const rep = facts.getNumber(`reputation.pc.${npc.faction ?? npc.id}`) ?? (npc.disposition ?? 0);
      const success = roll + Math.sign(rep) * 1 >= 4 || (c === 'bribe' && hasPayment(facts));
      const dir = success ? 1 : -1;
      const events: WorldEvent[] = [
        { tag: `social_${c}`, mutations: [{ op: 'adjust', key: `reputation.pc.${npc.faction ?? npc.id}`, by: dir, min: -3, max: 3 }], summary: contestLine(npc, c, success), data: { npc: npc.id, success } },
      ];
      // a successful bribe for a law-map can hand over a survey lead
      if (success && c === 'bribe') {
        const lawLine = (npc.dialogue ?? []).find((l) => l.grantsLeadTell);
        if (lawLine) events.push({ tag: 'lawmap', mutations: mutFromLine(lawLine), summary: `${npc.name} slides you a creased law-map. “Don't say where you got it.”`, data: { npc: npc.id } });
      }
      return { nativeNext: args.native, events, control: { kind: 'continue' }, render: { labels: [`social.${c}`, `npc.${npc.id}`], valence: success ? 'boon' : 'cost' } };

      function hasPayment(f: import('../../sdk/facts.js').FactView): boolean {
        return f.keysUnder('possession.pc').some((k) => k.endsWith('.class') && (f.getString(k) === 'salvage' || f.getString(k) === 'coin'));
      }
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
}
