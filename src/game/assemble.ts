/**
 * The composition root. Wires the eight intact modules from a World Pack into a
 * kernel registry, computes per-seed variance (which laws are LIVE, the start
 * kit), and provides the two deterministic functions replay needs: `armedAt`
 * (the finite author-declared arming) and `buildObservation` (the masked,
 * role-scoped view). This is the only layer that imports both modules and world.
 */
import { ModuleRegistry } from '../kernel/registry.js';
import { initialState } from '../kernel/state.js';
import { drawU64, streamSeed, u64ToIntBelow } from '../kernel/rng.js';
import type { ReplayDriver } from '../kernel/replay.js';
import type { GameState, Module, Role, RoleObservation, LegalAction } from '../sdk/types.js';
import { evalPredicate } from '../sdk/law.js';
import { makeFactView, type FactRecord } from '../sdk/facts.js';
import type { JsonValue } from '../sdk/json.js';
import type { WorldPack, NodeDef } from '../sdk/worldpack.js';

import { createSpine } from '../modules/spine/index.js';
import { createTime, phaseOf } from '../modules/time/index.js';
import { createTravel } from '../modules/travel/index.js';
import { createAnomaly } from '../modules/anomaly/index.js';
import { createGumshoe } from '../modules/invest/index.js';
import { createStealth } from '../modules/stealth/index.js';
import { createSocial } from '../modules/social/index.js';
import { createCombat } from '../modules/combat/index.js';

const ALWAYS_ARMED = ['anomaly', 'invest', 'time', 'travel', 'spine', 'combat'];
const PLAYER_VISIBLE_NS = new Set([
  'loc',
  'facing',
  'phase',
  'clock',
  'survival',
  'known',
  'reputation',
  'possession',
  'meta',
  'aspect',
  'objective',
]);

export interface Game {
  readonly pack: WorldPack;
  readonly seed: string;
  readonly registry: ModuleRegistry;
  readonly startMinutes: number;
  initialState(): GameState;
  armedAt(state: GameState): ReadonlySet<string>;
  buildObservation(state: GameState, role: Role): RoleObservation;
  driver(): ReplayDriver;
  nodeById(id: string): NodeDef | undefined;
}

export interface GameOptions {
  readonly startMinutes?: number;
}

export function createGame(pack: WorldPack, seed: string, opts: GameOptions = {}): Game {
  const startMinutes = opts.startMinutes ?? 16 * 60;
  const modules: Module[] = [
    createSpine(),
    createTime({ startMinutes }),
    createTravel(pack),
    createAnomaly(pack),
    createGumshoe(pack),
    createStealth(),
    createSocial(pack),
    createCombat(),
  ];
  const registry = new ModuleRegistry(modules);
  const nodes = new Map<string, NodeDef>(pack.nodes.map((n) => [n.id, n]));
  const npcAtNode = new Map<string, string[]>();
  for (const n of pack.npcs)
    for (const nd of n.atNodes ?? []) (npcAtNode.get(nd) ?? npcAtNode.set(nd, []).get(nd)!).push(n.id);

  function liveLaws(): Set<string> {
    const v = pack.seedVariance?.liveLaws;
    if (!v) return new Set(pack.laws.map((l) => l.id));
    const always = new Set(v.always ?? []);
    const rest = pack.laws.map((l) => l.id).filter((id) => !always.has(id));
    // deterministic shuffle of `rest` by seed
    const ss = streamSeed(seed, 'variance');
    const order = rest
      .map((id, i) => ({ id, k: Number(drawU64(ss, i) % 1000000n) }))
      .sort((a, b) => a.k - b.k || a.id.localeCompare(b.id))
      .map((x) => x.id);
    const target = v.min + u64ToIntBelow(drawU64(ss, 9999), Math.max(1, v.max - v.min + 1));
    const live = new Set<string>(always);
    for (const id of order) {
      if (live.size >= target) break;
      live.add(id);
    }
    return live;
  }

  function startInventoryFacts(): FactRecord {
    const f: FactRecord = {};
    const itemById = new Map(pack.items.map((i) => [i.id, i]));
    let kit = pack.start.inventory ?? [];
    if (pack.seedVariance?.startKits?.length) {
      const ss = streamSeed(seed, 'kit');
      const pick = pack.seedVariance.startKits[u64ToIntBelow(drawU64(ss, 0), pack.seedVariance.startKits.length)]!;
      kit = pick.items;
      for (const [k, val] of Object.entries(pick.facts ?? {})) f[k] = val as JsonValue;
    }
    for (const id of kit) {
      f[`possession.pc.${id}`] = true;
      const it = itemById.get(id);
      if (it?.itemClass) f[`possession.pc.${id}.class`] = it.itemClass;
    }
    return f;
  }

  function initialFacts(): FactRecord {
    const live = liveLaws();
    const f: FactRecord = {
      'loc.pc': pack.start.node,
      'facing.pc': 'forward',
      'phase.now': phaseOf(startMinutes),
      'clock.minutes': startMinutes,
      'survival.pc': 'alive',
      'survival.pc.hp': 6,
      'survival.pc.exposure': 0,
      'survival.pc.unsettled': 0,
      ...startInventoryFacts(),
      ...(pack.start.facts ?? {}),
    };
    for (const law of pack.laws) f[`law.${law.id}.live`] = live.has(law.id);
    return f;
  }

  function maskFacts(facts: FactRecord, role: Role): FactRecord {
    if (role !== 'player') return facts; // spectator/author see all
    const out: FactRecord = {};
    for (const [k, v] of Object.entries(facts)) {
      const ns = k.split('.', 1)[0]!;
      if (PLAYER_VISIBLE_NS.has(ns)) out[k] = v;
      else if (ns === 'law' && (k.endsWith('.witnessed') || k.endsWith('.contacts') || k.endsWith('.drift_warned')))
        out[k] = v;
      else if (ns === 'awareness' && !k.endsWith('.turn')) out[k] = v;
    }
    return out;
  }

  function legalActionsAt(state: GameState): LegalAction[] {
    const node = nodes.get((state.facts['loc.pc'] as string) ?? '');
    if (!node) return [];
    const view = makeFactView(state.facts);
    const acts: LegalAction[] = [];
    for (const e of node.exits) {
      if (e.hidden) continue;
      const ok = !e.when || evalPredicate(e.when, view);
      if (ok) acts.push({ id: `go:${e.to}`, label: e.label, intent: 'go', target: e.to });
    }
    for (const ex of node.examinables ?? [])
      acts.push({
        id: `examine:${ex.id}`,
        label: `examine ${ex.names[0]}`,
        intent: 'examine',
        target: ex.id,
      });
    for (const nid of npcAtNode.get(node.id) ?? []) {
      const npc = pack.npcs.find((n) => n.id === nid)!;
      acts.push({ id: `talk:${nid}`, label: `talk to ${npc.name}`, intent: 'talk', target: nid });
    }
    acts.push({ id: 'look', label: 'look around', intent: 'look' });
    acts.push({ id: 'search', label: 'search the area', intent: 'search' });
    acts.push({ id: 'wait', label: 'wait', intent: 'wait' });
    return acts;
  }

  function buildObservation(state: GameState, role: Role): RoleObservation {
    const nodeId = (state.facts['loc.pc'] as string) ?? '—';
    const node = nodes.get(nodeId);
    const view = makeFactView(state.facts);
    const exits = (node?.exits ?? [])
      .filter((e) => !e.hidden)
      .map((e) => {
        const ok = !e.when || evalPredicate(e.when, view);
        return ok ? { dir: e.dir, to: e.to, label: e.label } : { dir: e.dir, label: e.label + ' (blocked)' };
      });
    const npcsHere = (npcAtNode.get(nodeId) ?? []).map((id) => {
      const n = pack.npcs.find((x) => x.id === id)!;
      return { id: `npc.${id}`, label: n.name, kind: 'npc' };
    });
    const groundHere = Object.keys(state.facts)
      .filter((k) => k.startsWith(`world.ground.${nodeId}.`) && state.facts[k] === true)
      .map((k) => k.slice(`world.ground.${nodeId}.`.length));
    const itemIdsHere = [
      ...new Set([...(node?.items ?? []).filter((id) => state.facts[`possession.pc.${id}`] !== true), ...groundHere]),
    ];
    const itemsHere = itemIdsHere.map((id) => {
      const it = pack.items.find((x) => x.id === id)!;
      return { id: `item.${id}`, label: it?.names[0] ?? id, kind: 'item' };
    });
    const tellHints = (node?.tells ?? []).filter((t) => state.facts[`known.tell.${t}`] !== true);
    return {
      turn: state.turn,
      role,
      location: nodeId,
      facts: maskFacts(state.facts, role),
      self: {
        survival: (state.facts['survival.pc'] as JsonValue) ?? 'alive',
        unsettled: (state.facts['survival.pc.unsettled'] as JsonValue) ?? 0,
        exposure: (state.facts['survival.pc.exposure'] as JsonValue) ?? 0,
      },
      scene: {
        nodeId,
        title: node?.title ?? nodeId,
        ...(node?.regionId ? { regionId: node.regionId } : {}),
        ...(typeof state.facts['phase.now'] === 'string' ? { phase: state.facts['phase.now'] as string } : {}),
        exits,
        entities: [...npcsHere, ...itemsHere],
        tellHints,
        labels: [`node.${nodeId}`],
      },
      legalActions: legalActionsAt(state),
    };
  }

  function armedAt(state: GameState): ReadonlySet<string> {
    const armed = new Set(ALWAYS_ARMED);
    const node = (state.facts['loc.pc'] as string) ?? '';
    if ((npcAtNode.get(node) ?? []).length) armed.add('social');
    if (typeof state.facts[`world.patrol.${node}`] === 'string') armed.add('stealth');
    return armed;
  }

  function build(): GameState {
    return initialState(registry, seed, initialFacts());
  }

  return {
    pack,
    seed,
    registry,
    startMinutes,
    initialState: build,
    armedAt,
    buildObservation,
    nodeById: (id) => nodes.get(id),
    driver: (): ReplayDriver => ({
      registry,
      initialState: build,
      armedAt,
      observationAt: (s, role) => buildObservation(s, role),
    }),
  };
}
