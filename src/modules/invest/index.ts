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
import type { FactView, FactMutation } from '../../sdk/facts.js';
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
    lawTells.set(
      law.id,
      law.tells.map((t) => t.id),
    );
    for (const t of law.tells) tellLaw.set(t.id, law.id);
  }
  // examinable id -> the tell it surfaces (so "examine the walker" finds its tell)
  const examTell = new Map<string, string>();
  const examIds = new Set<string>(); // every authored examinable (its look prose carries the description)
  const npcIds = new Set<string>(pack.npcs.map((n) => n.id)); // NPCs carry their own authored look prose too
  const itemIds = new Set<string>(pack.items.map((i) => i.id)); // items carry their own authored look prose too
  for (const n of pack.nodes)
    for (const ex of n.examinables ?? []) {
      examIds.add(ex.id);
      if (ex.tell) examTell.set(ex.id, ex.tell);
    }

  const nodeTells = new Map<string, Set<string>>();
  const tellNodes = new Map<string, Set<string>>(); // inverse: where each tell is observable (for "look ELSEWHERE")
  const regionName = new Map<string, string>(pack.regions.map((r) => [r.id, r.name]));
  const addNodeTell = (node: string, tell: string) => {
    (nodeTells.get(node) ?? nodeTells.set(node, new Set()).get(node)!).add(tell);
    (tellNodes.get(tell) ?? tellNodes.set(tell, new Set()).get(tell)!).add(node);
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
    license: {
      identifier: 'CC-BY-3.0',
      attribution: 'GUMSHOE by Robin D. Laws (add’l material Kenneth Hite & Kevin Kulp)',
      tier: 'green',
      provenance: 'licensed-source',
      indicationOfChanges: 'reimplemented as a deterministic tell->codex deduction engine over physical laws',
    },
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
        // a non-live rotating law cannot be surveyed — there is no rule here to name
        if (lawId && !isLive(lawId, facts)) {
          return beat(
            native,
            { labels: ['invest.deduce_dead'], hints: { law: lawId } },
            'You reach for a rule — and there is nothing there to take hold of. Whatever you half-sensed, the Zone is not enforcing it here. Not this time.',
          );
        }
        if (!lawId) {
          const candidate = bestLawHint(facts);
          const hint = candidate
            ? ` Do you mean ${laws.get(candidate)!.title}? Try: deduce the ${laws.get(candidate)!.title.replace(/^the /i, '').toLowerCase()}.`
            : '';
          return beat(
            native,
            { labels: ['invest.deduce_nothing'], hints: { result: 'no_subject' } },
            `You turn it over, but you are not sure which rule you are reaching for.${hint}`,
          );
        }
        const law = laws.get(lawId)!;
        const tells = lawTells.get(lawId) ?? [];
        const seen = tells.filter((t) => facts.getBool(`known.tell.${t}`)).length;
        const cur = (facts.getString(`known.law.${lawId}`) as KnowledgeStage) ?? 'unknown';
        // A fully-evidenced deduction ALWAYS succeeds — insight is the cost of the FIRST deductive
        // leap, never a wall in front of a law you have already read all the signs for (feedback/0016
        // #2). The old `insight > 0` gate stranded the SIGNATURE loop: after a few drift→re-Settle
        // cycles the pool hit 0 and a re-deduce of a 2-of-2 law fell into the "go deeper" branch — a
        // flat contradiction ("2 of 2 signs found" yet "go deeper") that left the codex stuck at
        // approximate, even on a mastery run. Re-confirming a law you have EVER surveyed costs no
        // insight (you did the work once; this is a refresh); only a first-ever deduction spends it.
        // Brute-force guessing is already barred by the evidence requirement below, not by insight.
        if (seen >= law.discovery.minTellsToSurvey) {
          const everSurveyed = facts.getBool(`known.${lawId}.ever_surveyed`);
          const spend = everSurveyed ? 0 : 1;
          const conclusion = law.tells.map((t) => tellProse.get(t.id)?.conclusion).find(Boolean);
          // a re-read of a DRIFTED law is not byte-identical: it reports the widened window,
          // so re-Settling visibly refreshes stale knowledge (feedback/0012 #5).
          const driftNote = facts.getBool(`law.${lawId}.window_drifted`)
            ? ' And it has spread since you first read it: the hungry hours have crept into the grey hour before dawn, where once the coming light meant safety.'
            : '';
          return {
            nativeNext: { insight: Math.max(0, native.insight - spend) },
            events: [
              {
                tag: 'law_surveyed',
                mutations: [
                  { op: 'set', key: `known.law.${lawId}`, value: 'surveyed' },
                  { op: 'set', key: `known.${lawId}.surveyed_turn`, value: args.ctx.turn },
                  { op: 'set', key: `known.${lawId}.ever_surveyed`, value: true }, // high-water mark; drift never clears it
                ],
                summary: `You are certain now. ${law.title}: ${conclusion ?? 'you understand how it works.'}${driftNote}`,
                data: { law: lawId },
              },
            ],
            control: { kind: 'continue' },
            render: { labels: [`survey.${lawId}`], valence: 'boon', hints: { law: lawId, stage: 'surveyed' } },
          };
        }
        // not enough yet — friction, not a dead end. NAME what is missing (the count) and WHERE to
        // find it: a sign still readable HERE (and through which sense), or ELSEWHERE (which region).
        // "Watch for more" must never be a blind dead end (feedback/0012 #3).
        const need = law.discovery.minTellsToSurvey;
        const unread = tells.filter((t) => !facts.getBool(`known.tell.${t}`));
        const hereSet = nodeTells.get(node ?? '') ?? new Set<string>();
        const hereUnread = unread.filter((t) => hereSet.has(t));
        const count = `You have read ${Math.min(seen, need)} of the ${need} sign${need === 1 ? '' : 's'} you need to be sure of ${law.title}.`;
        let where: string;
        if (hereUnread.length > 0) {
          const channels = new Set(hereUnread.map((t) => tellProse.get(t)?.channel).filter(Boolean) as string[]);
          where = `There is still a sign to read right here — ${channelHint(channels)}.`;
        } else {
          const curRegion = node ? nodeRegion.get(node) : undefined;
          const regionIds = new Set<string>();
          for (const t of unread)
            for (const n of tellNodes.get(t) ?? []) {
              const r = nodeRegion.get(n);
              if (r) regionIds.add(r);
            }
          const elsewhere = [...regionIds]
            .filter((r) => r !== curRegion)
            .map((r) => regionName.get(r))
            .filter(Boolean) as string[];
          where = elsewhere.length
            ? `What is left to learn is not here — look for it ${elsewhere.map(towardRegion).join(', or ')}.`
            : `What is left is not at this exact spot — go on deeper, and keep watching and listening.`;
        }
        const lead =
          stageRank(cur) >= stageRank('approximate') ? `You can almost name the shape of ${law.title}. ` : '';
        return beat(
          native,
          { labels: ['invest.deduce_short'], hints: { law: lawId, seen, need, here: hereUnread.length > 0 } },
          `${lead}${count} ${where}`,
        );
      }

      // ---- EXAMINE / SEARCH / LISTEN / READ: auto-acquire tells -----------
      const channel = c === 'listen' ? 'sound' : c === 'read' ? 'sight' : undefined;
      const targetTell =
        c === 'examine'
          ? resolveExamineTell(args.action.intent.target?.id, args.action.intent.target?.raw, node)
          : undefined;
      const candidates = targetTell ? [targetTell] : observableHere(node, channel);
      // only LIVE laws have tells to read this seed (rotating laws absent on some seeds)
      const fresh = candidates.filter((t) => !facts.getBool(`known.tell.${t}`) && isLive(tellLaw.get(t), facts));

      if (fresh.length === 0) {
        // examining a real authored object OR an NPC: its own look prose carries it —
        // stay quiet rather than contradict it with "nothing here tells you anything".
        const exTarget = args.action.intent.target?.id;
        if (c === 'examine' && exTarget && (examIds.has(exTarget) || npcIds.has(exTarget) || itemIds.has(exTarget))) {
          return {
            nativeNext: native,
            events: [{ tag: 'invest_examined', mutations: [], summary: '', visibility: 'private' }],
            control: { kind: 'continue' },
          };
        }
        return beat(
          native,
          { labels: ['invest.nothing_new'], hints: { intent: c } },
          'You look closely, but nothing here tells you anything you didn’t already know.',
        );
      }

      const events: WorldEvent[] = [];
      const acquiredLaws = new Set<string>();
      const acquired: string[] = [];
      // when examining a specific thing, its own look prose already paints the cue —
      // so the tell adds only the REALISATION (the note), not a duplicate description.
      const examinedSpecific = c === 'examine' && !!targetTell;
      for (const t of c === 'search' ? fresh : fresh.slice(0, 1)) {
        const prose = tellProse.get(t);
        const summary = prose
          ? examinedSpecific
            ? prose.note
            : `${prose.cue} ${prose.note}`
          : `You notice something.`;
        events.push({
          tag: 'tell_observed',
          mutations: [{ op: 'set', key: `known.tell.${t}`, value: true }],
          summary,
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
          const muts: FactMutation[] = [{ op: 'set', key: `known.law.${lid}`, value: next }];
          // the first time a law reaches "approximate", tell the player how to confirm it
          let hint = '';
          if (next === 'approximate' && !facts.getBool(`known.${lid}.hinted`)) {
            muts.push({ op: 'set', key: `known.${lid}.hinted`, value: true });
            const title = laws.get(lid)!.title;
            hint = `You have seen enough to almost name the rule of ${title}. One clear thought might settle it — try: deduce the ${title.replace(/^the /i, '').toLowerCase()}.`;
          }
          events.push({
            tag: 'codex_advance',
            mutations: muts,
            summary: hint,
            data: { law: lid, stage: next },
            visibility: hint ? 'public' : 'private',
          });
        }
      }
      return {
        nativeNext: native,
        events,
        control: { kind: 'continue' },
        render: {
          labels: ['invest.observe', ...acquired.map((t) => `tell.${t}`)],
          valence: 'boon',
          hints: { tells: acquired },
        },
      };

      function resolveExamineTell(
        id: string | undefined,
        raw: string | undefined,
        node: string | undefined,
      ): string | undefined {
        if (!node) return undefined;
        const here = nodeTells.get(node) ?? new Set();
        // an examinable maps to its surfaced tell; or the target may BE a tell id
        if (id && examTell.has(id) && here.has(examTell.get(id)!)) return examTell.get(id)!;
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
      if (id === topic || title.includes(q) || q.includes(bare) || (law.scope.nodes ?? []).some((n) => q.includes(n)))
        return id;
    }
    return undefined;
  }

  /** a law whose authored scope covers the node you stand in (so "deduce" works in place). */
  function lawInScope(node: string | undefined): string | undefined {
    if (!node) return undefined;
    for (const [id, law] of laws)
      if ((law.scope.nodes ?? []).includes(node) || (law.scope.region && nodeRegion.get(node) === law.scope.region))
        return id;
    return undefined;
  }

  /** a law is learnable only if it is LIVE this seed (a non-live rotating law has no tells to read). */
  function isLive(lawId: string | undefined, facts: FactView): boolean {
    if (!lawId) return false;
    return facts.getBool(`law.${lawId}.live`) !== false;
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
      getBool: (k: string) =>
        k.startsWith('known.tell.') && set.has(k.slice('known.tell.'.length)) ? true : facts.getBool(k),
    } as FactView;
  }

  function beat(native: GumNative, render: { labels: string[]; hints?: JsonObject }, summary: string): ModuleResult {
    return {
      nativeNext: native,
      events: [{ tag: 'invest_beat', mutations: [], summary, visibility: 'public' }],
      control: { kind: 'continue' },
      render,
    };
  }
}

/** how to read a sign that is HERE, by the sense(s) it speaks through (deduce-legibility, #3). */
function channelHint(channels: ReadonlySet<string>): string {
  const parts: string[] = [];
  if (channels.has('sight')) parts.push('look closer (examine what is here, or search)');
  if (channels.has('sound')) parts.push('listen');
  if (channels.has('touch')) parts.push('hold still and feel for it');
  if (channels.has('smell')) parts.push('breathe the air here');
  if (channels.has('taste')) parts.push('taste it on the air');
  return parts.length ? parts.join(', or ') : 'look closer';
}

/** an in-world direction to a region whose name a missing tell lives in ("toward the Greywater"). */
function towardRegion(name: string): string {
  return 'toward ' + name.replace(/^The /, 'the ');
}
