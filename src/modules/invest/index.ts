/**
 * invest.gumshoe — the learning engine, repointed from mysteries to physics. The
 * character sheet is a growing, fallible map of physical laws (the law codex).
 *
 * GUMSHOE's signature: if you look, you AUTOMATICALLY acquire the tell — no roll,
 * no failed-investigation dead end. Assembling enough tells lets you DEDUCE a law
 * to `surveyed` (safely usable) — and deduction is a deliberate spend that can be
 * done wrong (research rule 16: a tester that proves deduction without enabling
 * brute-force guessing). Law Drift later demotes surveyed laws (fallible codex).
 *
 * Source: GUMSHOE SRD, CC-BY-3.0 (Robin D. Laws; add'l material Hite & Kulp).
 */
import { stageRank, type KnowledgeStage, type LawDefinition } from '../../sdk/law.js';
import { makeManifest } from '../../sdk/define.js';
import type { FactView } from '../../sdk/facts.js';
import type { JsonObject } from '../../sdk/json.js';
import type { Module, ModuleResult, WorldEvent } from '../../sdk/types.js';
import type { WorldPack, TellProse } from '../../sdk/worldpack.js';

interface GumNative extends JsonObject {
  insight: number; // the general-ability pool (deduction spend)
}

export function createGumshoe(pack: WorldPack): Module {
  const laws = new Map<string, LawDefinition>(pack.laws.map((l) => [l.id, l]));
  const tellProse = new Map<string, TellProse>(pack.tellLibrary.map((t) => [t.id, t]));
  const nodeRegion = new Map<string, string>(pack.nodes.map((n) => [n.id, n.regionId]));

  // index: tell -> law; law -> tells; node -> observable tells
  const tellLaw = new Map<string, string>();
  const lawTells = new Map<string, string[]>();
  for (const law of pack.laws) {
    lawTells.set(law.id, law.tells.map((t) => t.id));
    for (const t of law.tells) tellLaw.set(t.id, law.id);
  }
  const nodeTells = new Map<string, Set<string>>();
  const addNodeTell = (node: string, tell: string) => {
    if (!nodeTells.has(node)) nodeTells.set(node, new Set());
    nodeTells.get(node)!.add(tell);
  };
  for (const n of pack.nodes) for (const t of n.tells ?? []) addNodeTell(n.id, t);
  for (const law of pack.laws)
    for (const t of law.tells) {
      for (const nd of t.at?.nodes ?? []) addNodeTell(nd, t.id);
      for (const rg of t.at?.regions ?? []) for (const n of pack.nodes) if (n.regionId === rg) addNodeTell(n.id, t.id);
    }

  const manifest = makeManifest({
    id: 'invest.gumshoe',
    content: { laws: pack.laws.map((l) => l.id), tells: pack.tellLibrary.map((t) => t.id) },
    source: 'GUMSHOE SRD §investigative-abilities (CC-BY-3.0)',
    license: { identifier: 'CC-BY-3.0', attribution: 'GUMSHOE by Robin D. Laws (add’l material Kenneth Hite & Kevin Kulp)', tier: 'green', provenance: 'licensed-source', indicationOfChanges: 'reimplemented as a deterministic tell->codex deduction engine over physical laws' },
    domain: 'investigation',
    priority: 15,
    intents: ['examine', 'search', 'listen', 'read', 'deduce', 'survey'],
    writesFacts: ['known', 'flag'],
    readsFacts: ['known', 'loc', 'phase', 'flag', 'law'],
  });

  function stageFromTells(lawId: string, facts: FactView): KnowledgeStage {
    const tells = lawTells.get(lawId) ?? [];
    const seen = tells.filter((t) => facts.getBool(`known.tell.${t}`)).length;
    const law = laws.get(lawId)!;
    const min = law.discovery.minTellsToSurvey;
    if (seen <= 0) return 'unknown';
    if (seen >= Math.ceil(min / 2)) return 'approximate';
    return 'referenced';
  }

  function observableHere(node: string | undefined, channel?: string): string[] {
    if (!node) return [];
    const all = [...(nodeTells.get(node) ?? [])];
    if (!channel) return all;
    return all.filter((t) => {
      const law = laws.get(tellLaw.get(t)!);
      const tell = law?.tells.find((x) => x.id === t);
      return tell?.channel === channel;
    });
  }

  return {
    manifest,
    init: (): GumNative => ({ insight: 3 }),
    claims: (intent) => ['examine', 'search', 'listen', 'read', 'deduce', 'survey'].includes(intent.class),
    validateLegality: () => ({ legal: true }),
    execute: (args): ModuleResult => {
      const native = args.native as GumNative;
      const c = args.action.intent.class;
      const node = args.facts.getString('loc.pc');
      const facts = args.facts;

      // ---- DEDUCE / SURVEY: the deliberate, fallible assembly --------------
      if (c === 'deduce' || c === 'survey') {
        let lawId = matchLaw(args.action.intent.topic ?? args.action.intent.target?.raw);
        // broaden: if no exact law named, fall back to a law whose scope covers where you stand
        if (!lawId) lawId = lawInScope(node);
        if (!lawId) {
          const candidate = bestLawHint(facts);
          const hint = candidate ? ` Do you mean ${laws.get(candidate)!.title}? Try: deduce the ${laws.get(candidate)!.title.replace(/^the /i, '').toLowerCase()}.` : '';
          return beat(native, { labels: ['invest.deduce_nothing'], hints: { result: 'no_subject' } }, `You turn it over, but you are not sure which rule you are reaching for.${hint}`);
        }
        const law = laws.get(lawId)!;
        const tells = lawTells.get(lawId) ?? [];
        const seen = tells.filter((t) => facts.getBool(`known.tell.${t}`)).length;
        const cur = (facts.getString(`known.law.${lawId}`) as KnowledgeStage) ?? 'unknown';
        if (seen >= law.discovery.minTellsToSurvey && native.insight > 0) {
          const conclusion = law.tells.map((t) => tellProse.get(t.id)?.conclusion).find(Boolean);
          return {
            nativeNext: { insight: native.insight - 1 },
            events: [
              { tag: 'law_surveyed', mutations: [{ op: 'set', key: `known.law.${lawId}`, value: 'surveyed' }], summary: `You are certain now. ${law.title}: ${conclusion ?? 'you understand how it works.'}`, data: { law: lawId } },
            ],
            control: { kind: 'continue' },
            render: { labels: [`survey.${lawId}`], valence: 'boon', hints: { law: lawId, stage: 'surveyed' } },
          };
        }
        // not enough yet — friction, not a dead end
        return beat(
          native,
          { labels: ['invest.deduce_short'], hints: { law: lawId, seen, need: law.discovery.minTellsToSurvey } },
          stageRank(cur) >= stageRank('approximate')
            ? `You can feel the shape of ${law.title}, but one more clear sign would settle it.`
            : `You don't have enough yet to trust a guess about ${law.title}. Watch for more.`,
        );
      }

      // ---- EXAMINE / SEARCH / LISTEN / READ: auto-acquire tells -----------
      const channel = c === 'listen' ? 'sound' : c === 'read' ? 'sight' : undefined;
      const targetTell = c === 'examine' ? resolveExamineTell(args.action.intent.target?.id, args.action.intent.target?.raw, node) : undefined;
      const candidates = targetTell ? [targetTell] : observableHere(node, channel);
      const fresh = candidates.filter((t) => !facts.getBool(`known.tell.${t}`));

      if (fresh.length === 0) {
        return beat(native, { labels: ['invest.nothing_new'], hints: { intent: c } }, 'You look closely, but nothing here tells you anything you didn’t already know.');
      }

      const events: WorldEvent[] = [];
      const acquiredLaws = new Set<string>();
      const acquired: string[] = [];
      for (const t of c === 'search' ? fresh : fresh.slice(0, 1)) {
        const prose = tellProse.get(t);
        events.push({
          tag: 'tell_observed',
          mutations: [{ op: 'set', key: `known.tell.${t}`, value: true }],
          summary: prose ? `${prose.cue} ${prose.note}` : `You notice something.`,
          data: { tell: t, law: tellLaw.get(t) ?? null },
        });
        acquired.push(t);
        const lid = tellLaw.get(t);
        if (lid) acquiredLaws.add(lid);
      }
      // advance codex stages for the laws whose tells we just gained
      for (const lid of acquiredLaws) {
        const next = stageFromTells(lid, withObserved(facts, acquired));
        const cur = (facts.getString(`known.law.${lid}`) as KnowledgeStage) ?? 'unknown';
        if (stageRank(next) > stageRank(cur)) {
          events.push({ tag: 'codex_advance', mutations: [{ op: 'set', key: `known.law.${lid}`, value: next }], summary: ``, data: { law: lid, stage: next }, visibility: 'private' });
        }
      }
      return {
        nativeNext: native,
        events,
        control: { kind: 'continue' },
        render: { labels: ['invest.observe', ...acquired.map((t) => `tell.${t}`)], valence: 'boon', hints: { tells: acquired } },
      };

      function resolveExamineTell(id: string | undefined, raw: string | undefined, node: string | undefined): string | undefined {
        if (!node) return undefined;
        const here = nodeTells.get(node) ?? new Set();
        // match by examinable id mapped to a tell, or by raw text against tell cues
        if (id && here.has(id)) return id;
        const q = (raw ?? '').toLowerCase();
        for (const t of here) {
          const p = tellProse.get(t);
          if (p && q && (p.cue.toLowerCase().includes(q) || q.includes(t))) return t;
        }
        return undefined;
      }
    },
  };

  function matchLaw(topic: string | undefined): string | undefined {
    if (!topic) return undefined;
    const q = topic.toLowerCase();
    for (const [id, law] of laws) {
      const title = law.title.toLowerCase();
      const bare = title.replace(/^the /, '');
      if (id === topic || title.includes(q) || q.includes(bare) || (law.scope.nodes ?? []).some((n) => q.includes(n))) return id;
    }
    return undefined;
  }

  /** a law whose authored scope covers the node you stand in (so "deduce" works in place). */
  function lawInScope(node: string | undefined): string | undefined {
    if (!node) return undefined;
    for (const [id, law] of laws) if ((law.scope.nodes ?? []).includes(node) || (law.scope.region && nodeRegion.get(node) === law.scope.region)) return id;
    return undefined;
  }

  /** the law the player has observed the most tells for — used to nudge a vague deduce. */
  function bestLawHint(facts: FactView): string | undefined {
    let best: string | undefined;
    let bestN = 0;
    for (const [id] of laws) {
      const seen = (lawTells.get(id) ?? []).filter((t) => facts.getBool(`known.tell.${t}`)).length;
      if (seen > bestN) {
        bestN = seen;
        best = id;
      }
    }
    return best;
  }

  // helper: a fact view that also treats just-acquired tells as observed
  function withObserved(facts: FactView, acquired: string[]): FactView {
    const set = new Set(acquired);
    return {
      ...facts,
      getBool: (k: string) => (k.startsWith('known.tell.') && set.has(k.slice('known.tell.'.length)) ? true : facts.getBool(k)),
    } as FactView;
  }

  function beat(native: GumNative, render: { labels: string[]; hints?: JsonObject }, summary: string): ModuleResult {
    return { nativeNext: native, events: [{ tag: 'invest_beat', mutations: [], summary, visibility: 'public' }], control: { kind: 'continue' }, render };
  }
}
