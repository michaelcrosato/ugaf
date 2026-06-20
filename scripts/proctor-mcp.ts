/**
 * PROCTOR over MCP — the runnable stdio server a blind `claude -p` player connects
 * to. It exposes EXACTLY two tools (observe, act) over newline-delimited JSON-RPC,
 * backed by a real ProctorSession on The Hush. The player can see nothing but the
 * game. stdout carries ONLY JSON-RPC; everything else goes to stderr.
 *
 *   PROCTOR_SEED   the world seed for this run        (default: blind-0)
 *   PROCTOR_OUT    where to persist transcript+manifest+verdict json (optional)
 *   PROCTOR_DELAY  server-side inter-turn delay ms     (default: 0)
 *
 * Run by the launcher via --mcp-config; not meant to be invoked by hand except to
 * smoke-test the protocol.
 */
import { writeFileSync } from 'node:fs';
import { HUSH_PACK } from '../content/hush/index.js';
import { createGame } from '../src/game/assemble.js';
import { ProctorMcpBridge } from '../src/proctor/mcp-server.js';

const seed = process.env.PROCTOR_SEED || 'blind-0';
const outPath = process.env.PROCTOR_OUT || '';
const delayMs = Number(process.env.PROCTOR_DELAY || '0') || 0;
const maxTurns = Number(process.env.PROCTOR_MAX_TURNS || '0') || 0;

const game = createGame(HUSH_PACK, seed);
const bridge = new ProctorMcpBridge(game, { delayMs, maxTurns });

function persist(): void {
  if (!outPath) return;
  try {
    writeFileSync(outPath, JSON.stringify(bridge.snapshot(), null, 0));
  } catch (e) {
    process.stderr.write(`[proctor-mcp] persist failed: ${String(e)}\n`);
  }
}

function send(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buf += chunk;
  let nl: number;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(line);
    } catch {
      process.stderr.write(`[proctor-mcp] bad JSON line dropped\n`);
      continue;
    }
    const res = bridge.handle(msg);
    if (res) send(res);
    if (msg.method === 'tools/call') persist();
  }
});
process.stdin.on('end', () => {
  persist();
  process.exit(0);
});

process.stderr.write(`[proctor-mcp] ready · seed=${seed} · delay=${delayMs}ms\n`);
