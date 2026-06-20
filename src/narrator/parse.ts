/**
 * The deterministic parser — the affordance interface. NON-AUTHORITATIVE: it
 * proposes a structured intent + an honest confidence; the kernel routes and
 * resolves, and K8 caps consequence severity when confidence is low. The
 * committed outcome is a function of the resolved intent token, which is
 * recorded and replayed (never re-parsed).
 *
 * Craft (research rules 19/20): generous synonyms, bare-noun / bare-direction
 * input, "right object wrong word" tolerance, and a forgiving "Polite-or-better"
 * stance — a wrong word is a near-miss, not a wall.
 */
import { isIntentClass, type EntityRef, type IntentClass, type ParsedIntent } from '../sdk/intents.js';
import type { RoleObservation } from '../sdk/types.js';
import type { WorldPack } from '../sdk/worldpack.js';

const RETURN_WORDS = new Set(['back', 'leave', 'return', 'exit', 'away', 'retreat', 'go back', 'turn back']);

// meta queries route to `recall` (the Session renders them without committing a turn)
const META: Record<string, string> = {
  codex: 'codex', laws: 'codex', journal: 'codex', knowledge: 'codex', recall: 'codex',
  inventory: 'inv', inv: 'inv', i: 'inv', 'check inventory': 'inv',
  map: 'map', exits: 'map', ways: 'map',
  help: 'help', '?': 'help', commands: 'help',
};

const DIRECTIONS: Record<string, string> = {
  n: 'north', s: 'south', e: 'east', w: 'west', ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
  u: 'up', d: 'down', up: 'up', down: 'down', in: 'in', out: 'out', north: 'north', south: 'south', east: 'east', west: 'west',
  northeast: 'northeast', northwest: 'northwest', southeast: 'southeast', southwest: 'southwest',
};

// verb phrase -> intent class. Longer phrases are matched first.
const VERBS: [string, IntentClass][] = [
  ['look back', 'look_back'], ['turn around', 'look_back'], ['glance back', 'look_back'], ['look behind', 'look_back'],
  ['look at', 'examine'], ['look in', 'examine'], ['look around', 'look'], ['look', 'look'],
  ['examine', 'examine'], ['inspect', 'examine'], ['study', 'examine'], ['check', 'examine'], ['x', 'examine'],
  ['search', 'search'], ['rummage', 'search'], ['forage', 'search'],
  ['listen', 'listen'], ['read', 'read'],
  ['pick up', 'take'], ['take', 'take'], ['get', 'take'], ['grab', 'take'], ['pocket', 'take'],
  ['drop', 'drop'], ['discard', 'drop'],
  ['cross', 'cross_threshold'], ['step across', 'cross_threshold'], ['step through', 'cross_threshold'],
  ['enter', 'go'], ['go to', 'go'], ['go', 'go'], ['walk', 'go'], ['head', 'go'], ['move', 'go'], ['travel', 'go'], ['climb', 'go'],
  ['ask about', 'ask_about'], ['ask', 'ask_about'], ['inquire', 'ask_about'],
  ['talk to', 'talk'], ['talk', 'talk'], ['greet', 'talk'], ['speak to', 'talk'],
  ['call out', 'speak_aloud'], ['shout', 'speak_aloud'], ['yell', 'speak_aloud'], ['say', 'speak_aloud'], ['call', 'speak_aloud'], ['speak', 'speak_aloud'],
  ['parley', 'parley'], ['negotiate', 'parley'], ['persuade', 'parley'], ['convince', 'parley'],
  ['bribe', 'bribe'], ['pay', 'bribe'], ['offer', 'bribe'],
  ['intimidate', 'intimidate'], ['threaten', 'intimidate'], ['menace', 'intimidate'],
  ['deduce', 'deduce'], ['figure out', 'deduce'], ['work out', 'deduce'], ['conclude', 'deduce'], ['solve', 'deduce'], ['think about', 'deduce'],
  ['survey', 'survey'], ['confirm', 'survey'], ['verify', 'survey'],
  ['recall', 'recall'], ['remember', 'recall'],
  ['hide', 'hide'], ['conceal', 'hide'], ['take cover', 'hide'],
  ['sneak', 'sneak'], ['creep', 'sneak'], ['slip', 'sneak'],
  ['attack', 'attack'], ['hit', 'attack'], ['fight', 'attack'], ['strike', 'attack'], ['kill', 'attack'],
  ['flee', 'flee'], ['run', 'flee'], ['escape', 'flee'], ['retreat', 'flee'],
  ['give', 'give'], ['hand', 'give'],
  ['wait', 'wait'], ['z', 'wait'], ['pause', 'wait'],
  ['rest', 'rest'], ['sleep', 'rest'], ['camp', 'rest'],
  ['open', 'open'], ['close', 'close'], ['use', 'use'],
];

export interface Parser {
  parse(input: string, obs: RoleObservation): ParsedIntent;
}

export function createParser(pack: WorldPack): Parser {
  // node aliases: a destination node's title-words / region / id, so "go to the holdout" works
  const nodeAlias = new Map<string, string[]>();
  for (const n of pack.nodes) {
    const words = [n.id, n.regionId, ...n.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and'].includes(w))];
    nodeAlias.set(n.id, [...new Set(words.map((w) => w.toLowerCase()))]);
  }
  const regionName = new Map(pack.regions.map((r) => [r.id, r.name.toLowerCase()]));

  // global lexicon: id -> names (examinables, npcs, items)
  const lexicon: { id: string; names: string[]; kind: string }[] = [];
  for (const n of pack.nodes) for (const ex of n.examinables ?? []) lexicon.push({ id: ex.id, names: ex.names.map((s) => s.toLowerCase()), kind: 'examinable' });
  for (const npc of pack.npcs) lexicon.push({ id: npc.id, names: npc.names.map((s) => s.toLowerCase()), kind: 'npc' });
  for (const it of pack.items) lexicon.push({ id: it.id, names: it.names.map((s) => s.toLowerCase()), kind: 'item' });
  const itemClass = new Map(pack.items.map((i) => [i.id, i.itemClass]));

  type Kind = 'exit' | 'item' | 'examinable' | 'npc';

  function matchExit(q: string, obs: RoleObservation): EntityRef | undefined {
    for (const e of obs.scene.exits) {
      if (e.label.toLowerCase().includes(q) || (e.to && e.to.toLowerCase().includes(q)) || e.dir.toLowerCase() === q) {
        return { id: e.to ?? e.dir, raw: q, tags: ['exit'] };
      }
    }
    // a named destination: match the target node's title-words / region / aliases
    for (const e of obs.scene.exits) {
      if (!e.to) continue;
      const aliases = nodeAlias.get(e.to) ?? [];
      const region = aliases[1] ? regionName.get(aliases[1]) : undefined;
      if (aliases.some((a) => a === q || q.includes(a)) || (region && q.includes(region))) {
        return { id: e.to, raw: q, tags: ['exit'] };
      }
    }
    return undefined;
  }

  function matchKind(q: string, kind: Kind, obs: RoleObservation): EntityRef | undefined {
    if (kind === 'exit') return matchExit(q, obs);
    // scene-present entities of this kind first (more specific than the global lexicon)
    for (const ent of obs.scene.entities) {
      if (ent.kind === kind && (ent.label.toLowerCase().includes(q) || ent.id.toLowerCase().includes(q))) {
        return { id: ent.id.replace(/^(npc|item)\./, ''), raw: q, tags: [kind] };
      }
    }
    for (const l of lexicon) {
      if (l.kind !== kind) continue;
      if (l.names.some((nm) => q === nm || q.includes(nm) || nm.includes(q))) {
        const cls = itemClass.get(l.id);
        return { id: l.id, raw: q, tags: cls ? [kind, cls] : [kind] };
      }
    }
    return undefined;
  }

  /** Verb-aware noun resolution: try the preferred kinds first (research rule 19). */
  function resolveNoun(noun: string, obs: RoleObservation, prefer: Kind[] = ['exit', 'npc', 'item', 'examinable']): EntityRef | undefined {
    const q = noun.toLowerCase().trim();
    if (!q) return undefined;
    const order: Kind[] = [...prefer, ...(['exit', 'npc', 'item', 'examinable'] as Kind[]).filter((k) => !prefer.includes(k))];
    for (const kind of order) {
      const r = matchKind(q, kind, obs);
      if (r) return r;
    }
    return undefined;
  }

  const PREFER: Partial<Record<IntentClass, Kind[]>> = {
    examine: ['examinable', 'item', 'npc'],
    read: ['examinable', 'item'],
    take: ['item', 'examinable'],
    drop: ['item'],
    use: ['item', 'examinable'],
    give: ['item', 'npc'],
    talk: ['npc'],
    parley: ['npc'],
    bribe: ['npc'],
    intimidate: ['npc'],
    ask_about: ['npc'],
    attack: ['npc', 'examinable'],
    go: ['exit', 'npc'],
    cross_threshold: ['exit'],
  };

  function parse(input: string, obs: RoleObservation): ParsedIntent {
    const raw = input.trim();
    const lower = raw.toLowerCase().replace(/^\s*(please|then)\s+/, '').replace(/[.!?]+$/, '');

    // meta queries -> recall (a free, non-committing view; handled by the Session)
    if (META[lower]) return mk('recall', { topic: META[lower], confidence: 1 });

    // bare "return" word -> go back the way you came (generic affordance)
    if (RETURN_WORDS.has(lower)) return mk('go', { direction: lower, tags: ['movement', 'return'], confidence: 0.9 });

    // a single token that names an exit HERE wins over a same-spelled verb
    // (so "survey" / "salvage" walk to the Survey / Striders, not deduce-a-law)
    const exitDir = obs.scene.exits.find((e) => e.dir.toLowerCase() === lower);
    if (exitDir) return mk('go', { direction: lower, target: { id: exitDir.to ?? exitDir.dir, raw: lower, tags: ['exit'] }, confidence: 0.9 });

    // bare direction -> go
    const firstTok = lower.split(/\s+/)[0] ?? '';
    if (DIRECTIONS[lower] || (DIRECTIONS[firstTok] && lower.split(/\s+/).length === 1)) {
      return mk('go', { direction: DIRECTIONS[lower] ?? DIRECTIONS[firstTok], confidence: 0.92 });
    }

    // match a verb phrase (longest first)
    for (const [phrase, cls] of VERBS) {
      if (lower === phrase || lower.startsWith(phrase + ' ')) {
        const rest = lower.slice(phrase.length).trim().replace(/^(at|to|the|on|in|into|about|a|an)\s+/, '');
        return classify(cls, phrase, rest, obs, raw);
      }
    }

    // no verb: if the whole thing resolves to an exit, treat as go; else unclassified
    const asExit = resolveNoun(lower, obs);
    if (asExit?.tags?.includes('exit')) return mk('go', { target: asExit, confidence: 0.7 });
    return mk('unclassified', { confidence: 0.2 });

    function mk(cls: IntentClass, extra: Partial<ParsedIntent>): ParsedIntent {
      return { class: cls, tags: [], confidence: 0.5, raw, ...extra };
    }
  }

  function classify(cls: IntentClass, _phrase: string, rest: string, obs: RoleObservation, raw: string): ParsedIntent {
    if (!isIntentClass(cls)) return { class: 'unclassified', tags: [], confidence: 0.2, raw };

    // vocal: the utterance is the remainder (a spoken name etc.)
    if (cls === 'speak_aloud') {
      const utter = rest.replace(/^["']|["']$/g, '');
      return { class: 'speak_aloud', utterance: utter || raw, tags: ['vocal'], confidence: utter ? 0.9 : 0.7, raw };
    }
    // ask_about: "ask X about Y" or "ask about Y"
    if (cls === 'ask_about') {
      const m = rest.match(/^(.*?)\s+about\s+(.*)$/);
      const topic = m ? m[2]!.trim() : rest;
      const whoRef = m ? resolveNoun(m[1]!.trim(), obs) : undefined;
      return { class: 'ask_about', topic, ...(whoRef ? { target: whoRef } : {}), tags: ['social'], confidence: 0.8, raw };
    }
    // deduce/survey: the topic is a law phrase
    if (cls === 'deduce' || cls === 'survey') {
      return { class: cls, topic: rest || undefined, tags: ['investigation'], confidence: rest ? 0.85 : 0.6, raw } as ParsedIntent;
    }
    // directional go
    if (cls === 'go' || cls === 'cross_threshold') {
      const dir = DIRECTIONS[rest];
      if (dir) return { class: cls, direction: dir, tags: ['movement'], confidence: 0.9, raw };
      const ref = resolveNoun(rest, obs, PREFER[cls]);
      if (ref) return { class: cls, target: ref, tags: ['movement'], confidence: 0.88, raw };
      return { class: cls, ...(rest ? { target: { raw: rest } } : {}), tags: ['movement'], confidence: 0.5, raw };
    }
    // no-target verbs
    if (['look', 'wait', 'rest', 'recall', 'look_back', 'hide', 'sneak', 'flee', 'listen', 'search'].includes(cls)) {
      const ref = rest ? resolveNoun(rest, obs) : undefined;
      return { class: cls, ...(ref ? { target: ref } : {}), tags: [], confidence: 0.9, raw };
    }
    // target verbs (examine/take/drop/use/open/close/talk/parley/bribe/intimidate/attack/give/read)
    const ref = resolveNoun(rest, obs, PREFER[cls]);
    if (ref) {
      const itemCls = ref.tags?.find((t) => ['metal', 'light', 'salvage', 'coin', 'tool'].includes(t));
      return { class: cls, target: ref, ...(itemCls ? { itemClass: itemCls } : {}), tags: [], confidence: 0.88, raw };
    }
    // verb understood, object not in scope -> tentative (forgiving near-miss, never lethal under K8)
    return { class: cls, ...(rest ? { target: { raw: rest } } : {}), tags: [], confidence: 0.55, raw };
  }

  return { parse };
}
