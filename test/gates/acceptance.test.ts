/**
 * The consolidated acceptance suite — the named, falsifiable invariants as
 * runnable gates. Each `it` is one invariant from the design canon.
 */
import { describe, it, expect } from 'vitest';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../../src/game/assemble.js';
import { Session } from '../../src/game/session.js';
import { replay } from '../../src/kernel/replay.js';
import { engineFingerprint } from '../../src/kernel/eventlog.js';
import { bootCollisionAudit, type ArmingScenario } from '../../src/kernel/router.js';
import { ModuleRegistry } from '../../src/kernel/registry.js';
import { validateManifest, contentHash } from '../../src/sdk/define.js';
import { matrixIsTotal } from '../../src/sdk/law.js';
import { severityCapFor } from '../../src/kernel/engine.js';
import { coherencePass } from '../../src/gates/coherence.js';

const game = () => createGame(HUSH_PACK, 'acceptance');

describe('acceptance — named invariants', () => {
  it('no_crosswalks + K11: every module forbids crosswalks; red-tier is clean-room', () => {
    const g = game();
    for (const m of g.registry.all()) {
      expect(validateManifest(m.manifest), m.manifest.id).toEqual([]);
      expect(m.manifest.forbids.numericalCrosswalks).toBe(true);
      if (m.manifest.license.tier === 'red') expect(m.manifest.license.provenance).toBe('clean-room');
    }
  });

  it('jurisdiction_collision: the Hush charter boot-audit finds no exclusive collision', () => {
    const g = game();
    // build arming scenarios from every node the way armedAt does
    const scenarios: ArmingScenario[] = HUSH_PACK.nodes.map((n) => {
      const armed = new Set(['anomaly', 'invest', 'time', 'travel', 'spine', 'combat']);
      if (HUSH_PACK.npcs.some((p) => (p.atNodes ?? []).includes(n.id))) armed.add('social');
      if (HUSH_PACK.start.facts?.[`world.patrol.${n.id}`]) armed.add('stealth');
      return { label: n.id, armed, sampleFacts: { 'loc.pc': n.id } };
    });
    const audit = bootCollisionAudit(g.registry, scenarios);
    expect(audit.ok, JSON.stringify(audit.collisions)).toBe(true);
  });

  it('jurisdiction_collision: two exclusive claimants at equal priority ARE rejected', () => {
    // a synthetic registry where two modules tie -> the audit must catch it
    const g = game();
    const base = g.registry.get('combat.ito');
    const clash = { ...base, manifest: { ...base.manifest, id: 'combat.clash', priority: base.manifest.priority } };
    const reg = new ModuleRegistry([base, clash]);
    const audit = bootCollisionAudit(reg, [{ label: 'fight', armed: new Set(['combat']), sampleFacts: {} }]);
    expect(audit.ok).toBe(false);
    expect(audit.collisions[0]?.tied.sort()).toEqual(['combat.clash', 'combat.ito']);
  });

  it('hidden_information: the player observation masks non-visible facts', () => {
    const s = new Session(game());
    const obs = s.obs('player');
    // patrol placement, raw flags, and law internals must NOT be in the player's facts
    expect(obs.facts['world.patrol.cordon_checkpoint']).toBeUndefined();
    expect(Object.keys(obs.facts).some((k) => k.startsWith('flag.'))).toBe(false);
    // but the player DOES see their own location + survival
    expect(obs.facts['loc.pc']).toBe('waystation');
    expect(obs.facts['survival.pc']).toBe('alive');
  });

  it('K6: the category×category interaction matrix is total', () => {
    expect(matrixIsTotal().ok).toBe(true);
  });

  it('K8: severity cap is monotonic in confidence (lethal requires confidence)', () => {
    expect(severityCapFor({ class: 'attack', tags: [], confidence: 0.9, raw: '' })).toBe('full');
    expect(severityCapFor({ class: 'attack', tags: [], confidence: 0.5, raw: '' })).toBe('reversible');
    expect(severityCapFor({ class: 'attack', tags: [], confidence: 0.2, raw: '' })).toBe('safe_hold');
    expect(severityCapFor({ class: 'unclassified', tags: [], confidence: 0.99, raw: '' })).toBe('safe_hold');
  });

  it('K9: the engine fingerprint pins module identity (version + content hash)', () => {
    const fp = engineFingerprint(game().registry);
    expect(fp.modules.length).toBe(8);
    for (const m of fp.modules) {
      expect(m.version).toBeTruthy();
      expect(m.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(fp.rngAlgo).toBe('splitmix64');
  });

  it('frozen_module_versions: different content => different content hash (branch-on-version)', () => {
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
    expect(contentHash({ a: 1 })).toBe(contentHash({ a: 1 }));
  });

  it('coherence: the Hush pack passes the fairness checks', () => {
    const r = coherencePass(HUSH_PACK);
    expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  });

  it('deterministic_replay: a recorded Hush session replays bit-for-bit', () => {
    const g = game();
    const s = new Session(g);
    for (const c of ['out', 'road', 'survey', 'bribe eun', 'out', 'road', 'on', 'fork', 'water', 'in']) s.act(c);
    const res = replay(g.driver(), s.log.toGolden());
    expect(res.ok, JSON.stringify(res)).toBe(true);
  });

  it('no_llm_state_mutation: the renderer is pure (same inputs => same output, no state change)', () => {
    const s = new Session(game());
    const before = s.log.latestHash();
    const a = s.codex();
    const b = s.codex();
    expect(a).toBe(b);
    expect(s.log.latestHash()).toBe(before); // reading prose never mutates state
  });
});
