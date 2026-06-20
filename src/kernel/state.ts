/**
 * Game state lifecycle: initial state, the canonical state hash, and the
 * load/import gate (strict, finiteness-checked, prototype-pollution-safe).
 */
import { hashTagged } from './hash.js';
import { assertFinite, assertNoPrototypePollution, type JsonObject } from '../sdk/json.js';
import type { GameState } from '../sdk/types.js';
import type { ModuleRegistry } from './registry.js';

/** Build the initial authoritative state for a fresh campaign. */
export function initialState(registry: ModuleRegistry, seed: string, initialFacts: JsonObject = {}): GameState {
  const native: Record<string, JsonObject> = {};
  for (const m of registry.all()) {
    native[m.manifest.id] = m.init(seed);
  }
  return {
    turn: 0,
    seed,
    facts: { ...initialFacts },
    native,
    stack: [],
    scheduler: { pending: [] },
    rngCounters: {},
    status: 'active',
  };
}

/**
 * The canonical state hash. Hashes every authoritative field that influences
 * future transitions — identical state on any machine yields the identical hash.
 */
export function hashState(state: GameState): string {
  return hashTagged('loom.state.v1', {
    turn: state.turn,
    seed: state.seed,
    facts: state.facts,
    native: state.native as JsonObject,
    stack: state.stack as unknown as JsonObject[],
    scheduler: state.scheduler as unknown as JsonObject,
    rngCounters: state.rngCounters,
    status: state.status,
  } as JsonObject);
}

/**
 * The load gate (from save_load strict/finiteness pattern). Validates a state
 * imported from disk is structurally sound before the engine touches it.
 */
export function loadGate(raw: unknown): GameState {
  if (raw === null || typeof raw !== 'object') throw new Error('loadGate: state must be an object');
  const s = raw as Record<string, unknown>;
  assertNoPrototypePollution(s as JsonObject);
  assertFinite(s as JsonObject);
  for (const field of ['turn', 'seed', 'facts', 'native', 'stack', 'scheduler', 'rngCounters', 'status']) {
    if (!(field in s)) throw new Error(`loadGate: missing field "${field}"`);
  }
  if (typeof s.turn !== 'number' || !Number.isInteger(s.turn) || s.turn < 0) {
    throw new Error('loadGate: turn must be a non-negative integer');
  }
  if (typeof s.seed !== 'string') throw new Error('loadGate: seed must be a string');
  return raw as GameState;
}
