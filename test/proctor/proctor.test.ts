/**
 * PROCTOR — the play harness + realness oracle. Proves the three-verb protocol
 * enforces the nonce, builds a verifiable manifest, and that the oracle accepts
 * a real run and rejects a tampered one.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { ProctorSession } from '../../src/proctor/protocol.js';
import { verifyRealness } from '../../src/proctor/oracle.js';
import { formatObservation } from '../../src/proctor/transcript.js';

function playScript(commands: string[], seed = 'proctor-test') {
  const game = createGame(HUSH_PACK, seed);
  const p = new ProctorSession(game, { delayMs: 0 });
  for (const cmd of commands) {
    const o = p.observe();
    if (o.ended) break;
    p.act(o.turn_nonce, cmd);
  }
  return { game, p };
}

describe('PROCTOR', () => {
  it('the player sees only three verbs and a masked observation (no hidden state)', () => {
    const game = createGame(HUSH_PACK, 'mask-test');
    const p = new ProctorSession(game, { delayMs: 0 });
    const o = p.observe();
    expect(o.world['world.patrol.cordon_checkpoint']).toBeUndefined();
    expect(Object.keys(o.world).some((k) => k.startsWith('flag.'))).toBe(false);
    expect(o.legal_actions.length).toBeGreaterThan(0);
    expect(formatObservation(o)).toContain('WAYSTATION'.toLowerCase().toUpperCase());
  });

  it('act is rejected without the current nonce, accepted with it (T3)', () => {
    const game = createGame(HUSH_PACK, 'nonce-test');
    const p = new ProctorSession(game, { delayMs: 0 });
    const o = p.observe();
    const bad = p.act('not-the-nonce', 'out');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.rejection).toBe('WRONG_NONCE');
    const good = p.act(o.turn_nonce, 'out');
    expect(good.ok).toBe(true);
    // the nonce rotated — the old one is now dead
    const stale = p.act(o.turn_nonce, 'road');
    expect(stale.ok).toBe(false);
  });

  it('a real session produces a manifest the realness oracle accepts', () => {
    const { game, p } = playScript(['out', 'road', 'talk to lyle', 'road', 'examine the milepost', 'look back', 'on', 'examine the walker', 'deduce the mile road']);
    const manifest = p.manifest();
    expect(manifest.turns.length).toBeGreaterThan(5);
    const v = verifyRealness(manifest, game);
    expect(v.real, JSON.stringify(v.checks)).toBe(true);
    expect(v.checks.find((c) => c.name === 'nonce_chain')!.ok).toBe(true);
    expect(v.checks.find((c) => c.name === 'determinism')!.ok).toBe(true);
  });

  it('a tampered tape is rejected by the oracle (determinism check fails)', () => {
    const { game, p } = playScript(['out', 'road', 'on', 'examine the milepost']);
    const manifest = p.manifest();
    const tampered = {
      ...manifest,
      golden: {
        ...manifest.golden,
        records: manifest.golden.records.map((r, i) => (i === 0 ? { ...r, nextHash: 'deadbeef' } : r)),
      },
    };
    const v = verifyRealness(tampered, game);
    expect(v.real).toBe(false);
  });

  it('nonce reuse in a manifest is caught', () => {
    const { game, p } = playScript(['out', 'road', 'on']);
    const manifest = p.manifest();
    const reused = manifest.turns[0]!.nonce_issued;
    const tampered = { ...manifest, turns: manifest.turns.map((t) => ({ ...t, nonce_issued: reused, nonce_echoed: reused })) };
    const v = verifyRealness(tampered, game);
    expect(v.checks.find((c) => c.name === 'nonce_chain')!.ok).toBe(false);
  });
});
