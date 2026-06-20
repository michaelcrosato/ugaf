/**
 * Session — the turn loop that ties the deterministic kernel to the player:
 * parse -> step -> render -> goal-check, plus the codex view, save/load, and the
 * golden tape. Both the CLI and PROCTOR drive a Session (PROCTOR adds the nonce
 * + delay gate around it).
 */
import { step } from '../kernel/engine.js';
import { hashState } from '../kernel/state.js';
import { EventLog, engineFingerprint, type EventRecord } from '../kernel/eventlog.js';
import { evalPredicate, stageRank, type KnowledgeStage } from '../sdk/law.js';
import { makeFactView } from '../sdk/facts.js';
import type { GameState, RoleObservation } from '../sdk/types.js';
import type { ParsedIntent } from '../sdk/intents.js';
import { createParser, type Parser } from '../narrator/parse.js';
import { createRenderer, bold, dim, type Renderer } from '../narrator/render.js';
import type { Game } from './assemble.js';

export interface TurnResult {
  readonly text: string;
  readonly status: 'active' | 'won' | 'lost' | 'ended';
  readonly rejected?: boolean;
  readonly clarify?: { question: string; options: readonly { readonly id: string; readonly label: string }[] };
}

export class Session {
  state: GameState;
  readonly log: EventLog;
  private readonly parser: Parser;
  private readonly renderer: Renderer;
  private readonly visited = new Set<string>();
  private ended = false;
  private endStatus: TurnResult['status'] = 'active';

  constructor(readonly game: Game, readonly campaignId = 'play') {
    this.state = game.initialState();
    this.parser = createParser(game.pack);
    this.renderer = createRenderer(game.pack);
    this.log = new EventLog(campaignId, game.seed, engineFingerprint(game.registry), hashState(this.state));
    this.visited.add(this.state.facts['loc.pc'] as string);
  }

  obs(role: RoleObservation['role'] = 'player'): RoleObservation {
    return this.game.buildObservation(this.state, role);
  }

  opening(): string {
    const lines: string[] = [];
    if (this.game.pack.start.opening) lines.push(this.game.pack.start.opening, '');
    lines.push(this.renderer.renderScene(this.state, this.obs(), { firstVisit: true }));
    return lines.join('\n');
  }

  /** Parse a raw input into an intent (exposed so PROCTOR can record it). */
  parse(input: string): ParsedIntent {
    return this.parser.parse(input, this.obs());
  }

  statusLine(): string {
    const f = this.state.facts;
    const node = this.game.nodeById(f['loc.pc'] as string);
    const tod = (f['clock.tod'] as string) ?? '';
    const phase = (f['phase.now'] as string) ?? '';
    const surv = (f['survival.pc'] as string) ?? 'alive';
    const uns = (f['survival.pc.unsettled'] as number) ?? 0;
    const exp = (f['survival.pc.exposure'] as number) ?? 0;
    const bits = [node?.title ?? f['loc.pc'], `${tod} (${phase})`, surv];
    if (uns > 0) bits.push(`unsettled ${uns}`);
    if (exp > 0) bits.push(`exposure ${exp}`);
    return dim('— ' + bits.join('  ·  ') + ' —');
  }

  act(input: string): TurnResult {
    if (this.ended) return { text: 'The story has ended. (type `new` to begin again, or `quit`.)', status: this.endStatus };
    const intent = this.parse(input);
    return this.applyIntent(intent, input);
  }

  /** Apply an already-parsed intent (PROCTOR path: parse is recorded as the intent). */
  applyIntent(intent: ParsedIntent, _raw: string): TurnResult {
    // meta queries: a free, non-committing view (reachable from BOTH the CLI and PROCTOR)
    if (intent.class === 'recall') {
      const topic = intent.topic ?? 'codex';
      const text = topic === 'inv' ? this.inventory() : topic === 'map' ? this.mapText() : topic === 'help' ? HELP_TEXT : this.codex();
      return { text, status: this.ended ? this.endStatus : 'active' };
    }
    // unclassified input is a FREE, helpful nudge — it never burns a turn (research rule 19)
    if (intent.class === 'unclassified') {
      const w = intent.raw.trim();
      return {
        text: dim(`You're not sure how to ${w ? `“${w}”` : 'do that'} here. Try LOOK, GO <way>, EXAMINE <thing>, LISTEN, SEARCH, or TALK TO <someone>. (CODEX, INVENTORY, MAP, HELP.)`),
        status: this.ended ? this.endStatus : 'active',
        rejected: true,
      };
    }
    const before = this.state;
    const beforeLoc = before.facts['loc.pc'];
    const outcome = step(before, this.game.registry, intent, { armed: this.game.armedAt(before), observation: this.obs() });

    if (outcome.kind === 'rejected') {
      return { text: italicReason(outcome.reason), status: 'active', rejected: true };
    }
    if (outcome.kind === 'clarify') {
      return { text: outcome.request.question, status: 'active', clarify: outcome.request };
    }

    // committed
    const rec: EventRecord = {
      eventIndex: outcome.state.turn,
      intent,
      owner: outcome.owner,
      tape: outcome.tape,
      events: outcome.events,
      priorHash: outcome.priorHash,
      nextHash: outcome.nextHash,
    };
    this.log.append(rec);
    this.state = outcome.state;

    const lines: string[] = [];
    // examine: lead with the thing's own description
    if (intent.class === 'examine') {
      const d = this.renderer.describeExamine(intent.target?.id, this.state);
      if (d) lines.push(d);
    }
    const narration = this.renderer.renderEvents(outcome.events, outcome.renders, this.obs());
    if (narration) lines.push(narration);

    // moved or looked -> show the scene
    const movedTo = this.state.facts['loc.pc'];
    if (intent.class === 'look' || (movedTo !== beforeLoc && typeof movedTo === 'string')) {
      const firstVisit = typeof movedTo === 'string' && !this.visited.has(movedTo);
      if (typeof movedTo === 'string') this.visited.add(movedTo);
      lines.push('', this.renderer.renderScene(this.state, this.obs(), { firstVisit }));
    }

    // goal check
    const goal = this.checkGoals();
    if (goal) {
      this.ended = true;
      this.endStatus = goal.outcome;
      lines.push('', bold(goal.outcome === 'won' ? '✦ ' + goal.title : '† ' + goal.title), goal.epilogue);
      return { text: lines.join('\n').trim(), status: goal.outcome };
    }
    if (this.state.status !== 'active') {
      this.ended = true;
      this.endStatus = this.state.status;
    }
    return { text: lines.join('\n').trim() || dim('(nothing happens)'), status: this.state.status };
  }

  private checkGoals() {
    const view = makeFactView(this.state.facts);
    for (const g of this.game.pack.goals ?? []) if (evalPredicate(g.when, view)) return g;
    return undefined;
  }

  /** Render the law codex (the fallible character sheet). */
  codex(): string {
    const f = this.state.facts;
    const lines: string[] = [bold('THE LAW CODEX'), dim('(what you have learned of the Hush — and how far you trust it)')];
    let any = false;
    for (const law of this.game.pack.laws) {
      const stage = (f[`known.law.${law.id}`] as KnowledgeStage) ?? (f[`law.${law.id}.witnessed`] ? 'referenced' : 'unknown');
      if (stage === 'unknown' && !f[`law.${law.id}.witnessed`]) continue;
      any = true;
      const drift = f[`law.${law.id}.drift_warned`] ? '  (your certainty is decaying)' : '';
      const surveyed = stageRank(stage) >= stageRank('surveyed');
      const purchased = f[`known.purchased.${law.id}`] && !surveyed ? '  (from a bought map — unverified; trust it at your own risk)' : '';
      const conclusion = surveyed ? law.tells.map((t) => this.game.pack.tellLibrary.find((p) => p.id === t.id)?.conclusion).find(Boolean) : undefined;
      lines.push(`  • ${bold(law.title)} — ${stage}${drift}${purchased}`);
      if (conclusion) lines.push(dim(`      ${conclusion}`));
    }
    if (!any) lines.push(dim('  You have learned nothing certain yet. Look. Listen. The Hush is lawful — it can be read.'));
    // rumors heard — and any CONFLICTS between them (a wrong law gets you killed)
    const heardRumors = this.game.pack.rumors.filter((r) => f[`known.rumor.${r.id}`]);
    if (heardRumors.length) {
      lines.push('', dim('Rumours you have heard (reliability varies — a wrong law gets you killed):'));
      for (const r of heardRumors) lines.push(dim(`  – “${r.text}”`));
      const byTopic = new Map<string, Set<string>>();
      for (const r of heardRumors) (byTopic.get(r.topic) ?? byTopic.set(r.topic, new Set()).get(r.topic)!).add(r.truth);
      for (const [topic, truths] of byTopic) {
        if (truths.size > 1) {
          const law = this.game.pack.laws.find((l) => l.id === topic);
          lines.push(dim(`  ⚠ You have heard opposite things about ${law?.title ?? topic}. One of them is wrong — and here, wrong is fatal. Verify it yourself before you trust it.`));
        }
      }
    }
    return lines.join('\n');
  }

  mapText(): string {
    const exits = this.obs().scene.exits;
    if (!exits.length) return dim('There are no obvious ways from here.');
    return [bold('Ways from here:'), ...exits.map((e) => '  • ' + e.label)].join('\n');
  }

  inventory(): string {
    const items = Object.keys(this.state.facts)
      .filter((k) => k.startsWith('possession.pc.') && !k.endsWith('.class') && !k.endsWith('.condition') && this.state.facts[k] === true)
      .map((k) => k.slice('possession.pc.'.length));
    if (!items.length) return dim('You are carrying nothing of note.');
    const lines = [bold('You are carrying:')];
    for (const id of items) {
      const it = this.game.pack.items.find((x) => x.id === id);
      const cond = this.state.facts[`possession.pc.${id}.condition`];
      lines.push(`  • ${it?.names[0] ?? id}${cond ? dim(` (${cond})`) : ''}`);
    }
    return lines.join('\n');
  }

  save(): string {
    return JSON.stringify({ seed: this.game.seed, campaignId: this.campaignId, golden: this.log.toGolden(), visited: [...this.visited], ended: this.ended, endStatus: this.endStatus }, null, 0);
  }

  isEnded(): boolean {
    return this.ended;
  }

  /** the true session outcome — the goal endStatus if a goal fired, else kernel status. */
  outcome(): 'active' | 'won' | 'lost' | 'ended' {
    if (this.ended) return this.endStatus === 'active' ? 'ended' : this.endStatus;
    return this.state.status;
  }
}

function italicReason(reason: string): string {
  return dim(reason.charAt(0).toUpperCase() + reason.slice(1) + '.');
}

const HELP_TEXT = [
  'Type what you want to do in plain words: go north · look · examine the milepost · look back · listen ·',
  'search · take the knife · drop the knife · talk to lyle · ask lyle about the greywater · deduce the greywater ·',
  'say maren · hide · wait · rest · back. CODEX shows what you have learned; INVENTORY what you carry; MAP the ways out.',
  'The Hush is lawful: its dangers obey hidden, consistent rules. The first brush with any law warns you — it never',
  'kills you outright. Read the tells, deduce the laws, and use them.',
].join('\n');
