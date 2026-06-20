/**
 * Random-tape CONTRACTS (the SDK-level types). A module's `execute` receives a
 * `TapeReader` and asks for draws by stream; the kernel implements the reader
 * (see kernel/tape.ts) and records every draw into `TapeEntry`s for replay.
 *
 * These live in the SDK so the module interface can reference them without the
 * SDK depending on the kernel.
 */
import type { JsonValue } from './json.js';

export interface TapeEntry {
  readonly stream: string;
  readonly counter: number;
  /** "rng": recomputable from (seed, stream, counter). "oracle": the record IS the source. */
  readonly kind: 'rng' | 'oracle';
  readonly value: JsonValue;
  readonly label?: string;
}

/** What a module sees: pull deterministic draws, keyed by stream. */
export interface TapeReader {
  /** uniform double in [0,1) */
  unit(stream: string, label?: string): number;
  /** integer in [0, n) */
  intBelow(stream: string, n: number, label?: string): number;
  /** a die: integer in [1, sides] */
  die(stream: string, sides: number, label?: string): number;
  /** weighted pick: returns the chosen index given non-negative weights */
  weightedIndex(stream: string, weights: number[], label?: string): number;
  /** read a pre-recorded oracle decision (parse result, etc.) */
  oracle<T extends JsonValue>(stream: string, fallback: T, label?: string): T;
}
