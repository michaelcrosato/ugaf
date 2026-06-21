/**
 * The PROCTOR MCP bridge — the thin adapter that lets a blind LLM player drive a
 * ProctorSession over observe/act and NOTHING else. Proves the handshake, the
 * two-tool surface, that the player text leaks no hidden state, that a real
 * tool-driven run is realness-verified, and that the runaway turn-guard fires.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { ProctorMcpBridge } from '../../src/proctor/mcp-server.js';

function bridge(opts?: { maxTurns?: number; seed?: string }) {
  return new ProctorMcpBridge(createGame(HUSH_PACK, opts?.seed ?? 'mcp-test'), {
    maxTurns: opts?.maxTurns,
  });
}
function callTool(b: ProctorMcpBridge, name: string, args: Record<string, unknown> = {}): string {
  const r = b.handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  const result = (r as { result: { content: { text: string }[] } }).result;
  return result.content[0]!.text;
}

describe('PROCTOR MCP bridge', () => {
  it('initialize returns serverInfo and a tools capability', () => {
    const r = bridge().handle({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18' },
    });
    const res = (r as { result: Record<string, unknown> }).result;
    expect((res.serverInfo as { name: string }).name).toBe('proctor');
    expect(res.capabilities).toHaveProperty('tools');
    expect(res.protocolVersion).toBe('2025-06-18');
  });

  it('exposes exactly two tools: observe and act', () => {
    const r = bridge().handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const tools = (r as { result: { tools: { name: string }[] } }).result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual(['act', 'observe']);
  });

  it('notifications get no response; unknown methods error', () => {
    expect(bridge().handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    const e = bridge().handle({ jsonrpc: '2.0', id: 2, method: 'no/such/method' });
    expect((e as { error: { code: number } }).error.code).toBe(-32601);
  });

  it('the first observe shows the opening + first-visit reveal and leaks NO hidden state', () => {
    const text = callTool(bridge(), 'observe');
    // player-visible content the opening must carry
    expect(text).toContain('WAYSTATION');
    expect(text).toContain("DON'T LOOK BACK"); // the firstReveal three-rule map
    expect(text).toContain('You can (among other things):');
    // hidden engine state must never appear in the player's text
    expect(text).not.toContain('world.patrol');
    expect(text).not.toContain('law.mile_road.live');
    expect(text).not.toMatch(/\bflag\.[a-z]/);
  });

  it('act drives the game; a real tool-driven run is realness-verified', () => {
    const b = bridge({ seed: 'mcp-real' });
    callTool(b, 'observe');
    for (const cmd of [
      'out',
      'road',
      'talk to lyle',
      'road',
      'examine the milepost',
      'look back',
      'on',
      'examine the walker',
      'deduce the mile road',
    ]) {
      callTool(b, 'act', { command: cmd });
    }
    const snap = b.snapshot();
    expect(snap.turns.length).toBeGreaterThan(5);
    expect(snap.verdict.real, JSON.stringify(snap.verdict.checks)).toBe(true);
  });

  it('act requires a non-empty command', () => {
    const r = bridge().handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'act', arguments: { command: '   ' } },
    });
    expect((r as { error: { code: number } }).error.code).toBe(-32602);
  });

  it('the runaway turn-guard fires at the cap', () => {
    const b = bridge({ maxTurns: 2 });
    callTool(b, 'act', { command: 'out' });
    callTool(b, 'act', { command: 'road' });
    const third = callTool(b, 'act', { command: 'look' });
    expect(third).toContain('turn limit');
  });
});
