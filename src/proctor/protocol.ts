/**
 * PROCTOR — the internal typed player protocol. THIS is LOOM's stable interface
 * (MCP is a thin adapter behind it). A player sees exactly three verbs —
 * observe / list_legal_actions / act — plus a per-turn nonce and a server-side
 * delay gate. The masked observation never carries hidden state; `act` is
 * rejected unless it echoes the current nonce and (in paced mode) the wall-clock
 * delay has elapsed. Every turn is recorded into a signed session manifest that
 * proves the run was actually played (see oracle.ts).
 */
import { hashText, hashTagged } from '../kernel/hash.js';
import type { FactRecord } from '../sdk/facts.js';
import type { LegalAction } from '../sdk/types.js';
import type { GoldenTape } from '../kernel/eventlog.js';
import { createRenderer } from '../narrator/render.js';
import { Session } from '../game/session.js';
import type { Game } from '../game/assemble.js';

export interface Observation {
  readonly turn: number;
  readonly turn_nonce: string;
  readonly scene: string; // prose rendered from committed facts (masked)
  readonly status_line: string;
  readonly you: Readonly<Record<string, unknown>>;
  readonly world: FactRecord; // canonical facts the player is permitted to know
  readonly legal_actions: readonly LegalAction[];
  readonly delay_remaining_ms: number;
  readonly ended: boolean;
  readonly outcome?: 'won' | 'lost' | 'ended';
}

export type ActResult =
  | { readonly ok: true; readonly committed_event_index: number; readonly result_text: string; readonly next: Observation }
  | { readonly ok: false; readonly rejection: 'WRONG_NONCE' | 'DELAY_NOT_ELAPSED' | 'SESSION_OVER' | 'NOT_UNDERSTOOD'; readonly retry_after_ms?: number; readonly detail?: string };

export interface TurnManifest {
  readonly turn: number;
  readonly nonce_issued: string;
  readonly nonce_echoed: string;
  readonly observation_hash: string;
  readonly command: string;
  readonly intent_class: string;
  readonly prior_hash: string;
  readonly next_hash: string;
  readonly wall_clock_gap_ms: number;
}

export interface SessionManifest {
  readonly campaign_id: string;
  readonly seed: string;
  readonly fingerprint_id: string;
  readonly role: 'player';
  readonly turns: readonly TurnManifest[];
  readonly golden: GoldenTape;
  readonly final_status: string;
}

export interface ProctorOptions {
  /** the SERVER-side inter-turn delay (ms). The player cannot shorten it. 0 = headless. */
  readonly delayMs?: number;
  /** injectable monotonic clock (ms). Defaults to a deterministic logical clock for headless runs. */
  readonly now?: () => number;
}

export class ProctorSession {
  private readonly session: Session;
  private readonly renderer: ReturnType<typeof createRenderer>;
  private readonly turns: TurnManifest[] = [];
  private nonce = '';
  private nonceCounter = 0;
  private lastCommitAt = 0;
  private readonly salt: string;
  private logicalClock = 0;

  constructor(readonly game: Game, private readonly opts: ProctorOptions = {}) {
    this.session = new Session(game, 'proctor');
    this.renderer = createRenderer(game.pack);
    this.salt = hashText('proctor-salt:' + game.seed); // private to the server; players can't read it
    this.rotateNonce();
  }

  private now(): number {
    if (this.opts.now) return this.opts.now();
    return (this.logicalClock += (this.opts.delayMs ?? 0) + 1); // deterministic monotonic for headless
  }

  private rotateNonce(): void {
    this.nonce = hashText(`${this.salt}:${this.session.state.turn}:${this.nonceCounter++}`).slice(0, 16);
  }

  observe(): Observation {
    const o = this.session.obs('player');
    const ready = this.lastCommitAt + (this.opts.delayMs ?? 0);
    const remaining = Math.max(0, ready - this.now());
    const ended = this.session.isEnded();
    return {
      turn: this.session.state.turn,
      turn_nonce: this.nonce,
      scene: this.session.isEnded() ? '(the story has ended)' : this.renderer.renderScene(this.session.state, o, { firstVisit: false }),
      status_line: this.session.statusLine(),
      you: o.self,
      world: o.facts,
      legal_actions: o.legalActions,
      delay_remaining_ms: remaining,
      ended,
      ...(ended ? { outcome: this.session.outcome() as 'won' | 'lost' | 'ended' } : {}),
    };
  }

  openingText(): string {
    return this.session.opening();
  }

  act(nonce: string, command: string): ActResult {
    if (this.session.isEnded()) return { ok: false, rejection: 'SESSION_OVER' };
    if (nonce !== this.nonce) return { ok: false, rejection: 'WRONG_NONCE', detail: 'stale or missing nonce — observe() first' };
    const ready = this.lastCommitAt + (this.opts.delayMs ?? 0);
    const t = this.now();
    if (t < ready) return { ok: false, rejection: 'DELAY_NOT_ELAPSED', retry_after_ms: ready - t };

    const issued = this.nonce;
    const priorObs = this.session.obs('player');
    const observationHash = hashTagged('proctor.obs', { scene: priorObs.scene, facts: priorObs.facts, legal: priorObs.legalActions } as unknown as Record<string, never>);
    const priorHash = this.session.log.latestHash();
    const intent = this.session.parse(command);
    const res = this.session.applyIntent(intent, command);
    const committedThisTurn = !res.rejected && !res.clarify;
    const commitAt = this.now();

    if (committedThisTurn) {
      this.turns.push({
        turn: this.session.state.turn,
        nonce_issued: issued,
        nonce_echoed: nonce,
        observation_hash: observationHash,
        command,
        intent_class: intent.class,
        prior_hash: priorHash,
        next_hash: this.session.log.latestHash(),
        wall_clock_gap_ms: commitAt - this.lastCommitAt,
      });
      this.lastCommitAt = commitAt;
      this.rotateNonce();
    }

    if (res.rejected) return { ok: false, rejection: 'NOT_UNDERSTOOD', detail: res.text };
    return { ok: true, committed_event_index: this.session.state.turn, result_text: res.text, next: this.observe() };
  }

  manifest(): SessionManifest {
    return {
      campaign_id: 'proctor',
      seed: this.game.seed,
      fingerprint_id: this.session.log.toGolden().fingerprintId,
      role: 'player',
      turns: this.turns,
      golden: this.session.log.toGolden(),
      final_status: this.session.outcome(),
    };
  }

  underlying(): Session {
    return this.session;
  }
}
