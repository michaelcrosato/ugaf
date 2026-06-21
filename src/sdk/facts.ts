/**
 * Canonical World Facts — the small, typed, shared layer that modules READ
 * freely (by permission) and WRITE only through `WorldEvent` mutations the
 * pipeline validates. Facts are addressed by dotted keys; the first segment is
 * the *namespace* (the fact type), drawn from a CLOSED set. A module's manifest
 * declares which namespaces it may write — this is how "no numerical crosswalk"
 * is enforced structurally: a combat module simply has no permission to write
 * `reputation.*`, so it cannot convert HP into standing.
 */
import type { JsonValue } from './json.js';

export type FactValue = JsonValue;
export type FactRecord = Record<string, FactValue>;

/** The closed set of canonical fact namespaces (fact types). */
export const FACT_NAMESPACES = [
  'identity', // who an entity is (kind, name)
  'loc', // canonical location/position (owner: travel.graph)
  'facing', // heading/orientation memory (owner: travel.graph)
  'route', // route memory / passability facts (owner: travel.graph, distorted by anomaly.hush)
  'possession', // who holds / where an item is
  'allegiance', // faction membership
  'rel', // relationship edges between entities
  'known', // known_information: knowledge stages + law codex (owner: invest.gumshoe)
  'reputation', // public, SCOPED standing (owner: social.fate)
  'aspect', // Fate-style narrative aspects on entities/scenes (owner: social.fate)
  'event', // recorded world flags ("gate_opened")
  'objective', // completed objectives / lead state
  'survival', // survival_status (alive/wounded/...) + condition stack
  'phase', // world phase: day/dusk/night/predawn (owner: time.cycle)
  'clock', // named numeric clocks (owner: time.cycle / scheduler)
  'law', // active-law facts + drift state (owner: anomaly.hush)
  'awareness', // per-NPC detection FSM surfaced as fact (owner: stealth.detection)
  'world', // open pack-defined world flags
  'flag', // generic ephemeral flags
  'meta', // system/meta surfaced to the player (drift warnings, etc.)
] as const;

export type FactNamespace = (typeof FACT_NAMESPACES)[number];
const NS_SET = new Set<string>(FACT_NAMESPACES);

/** Classify a dotted fact key into its namespace. Throws on unknown namespace. */
export function factNamespace(key: string): FactNamespace {
  const ns = key.split('.', 1)[0]!;
  if (!NS_SET.has(ns)) {
    throw new Error(`unknown fact namespace "${ns}" in key "${key}" (closed set: ${FACT_NAMESPACES.join(', ')})`);
  }
  return ns as FactNamespace;
}

/** A read-only view of canonical facts handed to a module's execute. */
export interface FactView {
  get(key: string): FactValue | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBool(key: string): boolean | undefined;
  has(key: string): boolean;
  /** all keys under a namespace or dotted prefix, e.g. `keysUnder('reputation.pc')` */
  keysUnder(prefix: string): string[];
}

export function makeFactView(facts: FactRecord): FactView {
  return {
    get: (k) => facts[k],
    getString: (k) => (typeof facts[k] === 'string' ? (facts[k] as string) : undefined),
    getNumber: (k) => (typeof facts[k] === 'number' ? (facts[k] as number) : undefined),
    getBool: (k) => (typeof facts[k] === 'boolean' ? (facts[k] as boolean) : undefined),
    has: (k) => k in facts,
    keysUnder: (prefix) => {
      const p = prefix.endsWith('.') ? prefix : prefix + '.';
      const exact = prefix;
      return Object.keys(facts)
        .filter((k) => k === exact || k.startsWith(p))
        .sort();
    },
  };
}

/** A single canonical fact mutation emitted inside a WorldEvent. */
export type FactMutation =
  | { readonly op: 'set'; readonly key: string; readonly value: FactValue }
  | { readonly op: 'delete'; readonly key: string }
  | {
      readonly op: 'adjust';
      readonly key: string;
      readonly by: number;
      readonly min?: number;
      readonly max?: number;
    };

/** Apply a list of mutations to a fact record immutably, returning a new record. */
export function applyMutations(facts: FactRecord, mutations: readonly FactMutation[]): FactRecord {
  const next: FactRecord = { ...facts };
  for (const m of mutations) {
    if (m.op === 'set') {
      next[m.key] = m.value;
    } else if (m.op === 'delete') {
      delete next[m.key];
    } else {
      const cur = typeof next[m.key] === 'number' ? (next[m.key] as number) : 0;
      let v = cur + m.by;
      if (m.min !== undefined) v = Math.max(m.min, v);
      if (m.max !== undefined) v = Math.min(m.max, v);
      next[m.key] = v;
    }
  }
  return next;
}
