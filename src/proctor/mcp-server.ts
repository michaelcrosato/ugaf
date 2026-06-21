/**
 * The PROCTOR MCP bridge — the thin adapter protocol.ts always promised ("MCP is
 * a thin adapter behind it"). It turns a ProctorSession into two MCP tools, and
 * NOTHING else: a blind LLM player connected to this server can ONLY `observe`
 * and `act`; it cannot read files, code, or hidden state. The player's entire
 * knowable universe is the masked player observation (formatObservation).
 *
 * This module is content-free and Node-I/O-free on purpose: it speaks plain
 * JSON-RPC *objects* (handle(message) -> response | null) so it can be unit-tested
 * in-process. The stdio/transport/fs wiring lives in scripts/proctor-mcp.ts.
 */
import { ProctorSession } from './protocol.js';
import { formatObservation, plain } from './transcript.js';
import { verifyRealness, type RealnessVerdict } from './oracle.js';
import type { Observation, SessionManifest } from './protocol.js';
import type { Game } from '../game/assemble.js';

export interface RpcMessage {
  readonly jsonrpc?: string;
  readonly id?: string | number | null;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
}
export type RpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string } };

export interface BridgeTurn {
  readonly n: number;
  readonly command: string;
  readonly ok: boolean;
  readonly text: string;
}
export interface BridgeSnapshot {
  readonly seed: string;
  readonly turns: readonly BridgeTurn[];
  readonly finalStatus: string;
  readonly ended: boolean;
  readonly manifest: SessionManifest;
  readonly verdict: RealnessVerdict;
}

const OBSERVE_TOOL = {
  name: 'observe',
  description:
    'Look at your current situation in the game: the scene around you, how you feel, and some of the things you could do. Call this first, and any time you want to re-read your surroundings.',
  inputSchema: { type: 'object', properties: {}, required: [] as string[] },
};
const ACT_TOOL = {
  name: 'act',
  description:
    'Take ONE action in the game by typing a short, plain-words command — e.g. "examine the milepost", "go north", "look back", "listen", "search", "take the knife", "talk to lyle", "ask lyle about the greywater", "deduce the greywater", "say maren", "hide", "wait", "codex", "inventory". Returns what happens next.',
  inputSchema: {
    type: 'object',
    properties: { command: { type: 'string', description: 'Your next action, in plain words.' } },
    required: ['command'],
  },
};

export class ProctorMcpBridge {
  private readonly session: ProctorSession;
  private readonly turns: BridgeTurn[] = [];
  private opened = false;
  private n = 0;
  private readonly maxTurns: number;

  constructor(
    private readonly game: Game,
    opts: { delayMs?: number; maxTurns?: number } = {},
  ) {
    this.session = new ProctorSession(game, { delayMs: opts.delayMs ?? 0 });
    this.maxTurns = opts.maxTurns ?? 0; // 0 = unlimited
  }

  /** Handle one JSON-RPC message. Returns a response object, or null for notifications. */
  handle(msg: RpcMessage): RpcResponse | null {
    const id = msg.id ?? null;
    const isNotification = msg.id === undefined || msg.id === null;
    switch (msg.method) {
      case 'initialize':
        return this.ok(id, {
          protocolVersion: (msg.params?.protocolVersion as string) ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'proctor', version: '0.1.0' },
        });
      case 'ping':
        return this.ok(id, {});
      case 'tools/list':
        return this.ok(id, { tools: [OBSERVE_TOOL, ACT_TOOL] });
      case 'tools/call':
        return this.toolCall(id, msg.params ?? {});
      default:
        if (isNotification || (msg.method ?? '').startsWith('notifications/')) return null;
        return this.err(id, -32601, `method not found: ${msg.method}`);
    }
  }

  private toolCall(id: string | number | null, params: Record<string, unknown>): RpcResponse {
    const name = params.name as string;
    const args = (params.arguments as Record<string, unknown>) ?? {};
    if (name === 'observe') return this.ok(id, this.text(this.doObserve()));
    if (name === 'act') {
      const command = typeof args.command === 'string' ? args.command : '';
      if (!command.trim()) return this.err(id, -32602, 'act requires a non-empty "command" string');
      return this.ok(id, this.text(this.doAct(command)));
    }
    return this.err(id, -32602, `unknown tool: ${name}`);
  }

  /** The player-visible text for a fresh look at the situation. */
  private doObserve(): string {
    const o = this.session.observe();
    if (!this.opened) {
      this.opened = true;
      // First look: the premise + the first-visit scene (which carries firstReveal
      // content like the waystation's three-rule map) + the available actions.
      return plain(this.session.openingText()) + '\n\n' + this.tail(o);
    }
    if (o.ended) return this.endedText(o);
    return formatObservation(o);
  }

  /** Apply one command and return what the player sees next. */
  private doAct(command: string): string {
    if (this.maxTurns && this.n >= this.maxTurns) {
      return `** YOUR TIME IN THE HUSH IS UP (turn limit ${this.maxTurns} reached) — the run is over. Give your exit interview now. **`;
    }
    const o = this.session.observe();
    if (o.ended) return this.endedText(o);
    const r = this.session.act(o.turn_nonce, command);
    this.n += 1;
    if (r.ok) {
      this.turns.push({ n: this.n, command, ok: true, text: plain(r.result_text) });
      const next = r.next;
      const body = plain(r.result_text).trim() || '(nothing happens)';
      if (next.ended) return body + '\n\n' + this.endedBanner(next);
      return body + '\n\n' + this.tail(next);
    }
    const detail = plain(r.detail ?? r.rejection);
    this.turns.push({ n: this.n, command, ok: false, text: detail });
    // re-show where they are so a rejected command never leaves them blind
    return `[${r.rejection}] ${detail}\n\n` + this.tail(o);
  }

  /** Status line + condition + the "you can…" affordances, without re-rendering the scene. */
  private tail(o: Observation): string {
    const lines: string[] = [plain(o.status_line)];
    const you = o.you as Record<string, unknown>;
    const bits: string[] = [];
    if (you.survival && you.survival !== 'alive') bits.push(`condition: ${String(you.survival)}`);
    if (typeof you.unsettled === 'number' && you.unsettled > 0) bits.push(`unsettled ${you.unsettled}`);
    if (typeof you.exposure === 'number' && you.exposure > 0) bits.push(`exposure ${you.exposure}`);
    if (bits.length) lines.push('You feel: ' + bits.join(', ') + '.');
    if (o.legal_actions.length)
      lines.push('', 'You can (among other things): ' + o.legal_actions.map((a) => a.label).join(' · '));
    return lines.join('\n');
  }

  private endedText(o: Observation): string {
    return '(the story has already ended)\n\n' + this.endedBanner(o);
  }
  private endedBanner(o: Observation): string {
    return `** THE STORY HAS ENDED — outcome: ${o.outcome ?? 'ended'} **`;
  }

  private text(s: string): { content: { type: 'text'; text: string }[] } {
    return { content: [{ type: 'text', text: s }] };
  }
  private ok(id: string | number | null, result: unknown): RpcResponse {
    return { jsonrpc: '2.0', id, result };
  }
  private err(id: string | number | null, code: number, message: string): RpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  /** Everything the harness needs to persist + verify the run. */
  snapshot(): BridgeSnapshot {
    const manifest = this.session.manifest();
    return {
      seed: this.game.seed,
      turns: this.turns,
      finalStatus: manifest.final_status,
      ended: this.session.underlying().isEnded(),
      manifest,
      verdict: verifyRealness(manifest, this.game),
    };
  }
}
