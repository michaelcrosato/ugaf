/**
 * Random Tape — the determinism contract for stochastic + oracle draws.
 *
 * A module's `execute` never reaches for entropy directly. It receives a
 * `TapeReader` and asks for draws by *stream*. Two kinds of entries land on the
 * tape:
 *
 *   - "rng":    a deterministic draw recomputable from (seed, stream, counter).
 *               Recorded for audit; on replay we recompute AND assert equality.
 *   - "oracle": a value that is NOT recomputable (e.g. the LLM intent-parse).
 *               The record IS the source of truth; on replay we read it back.
 *
 * The reader is created per pipeline step from the campaign seed + the prior
 * per-stream counters, so `execute` stays a pure function of its inputs. After
 * the step, the kernel reads back the advanced counters + the recorded entries
 * and folds them into the event log.
 */
import { drawU64, streamSeed, u64ToIntBelow, u64ToUnit } from './rng.js';
import type { JsonValue } from '../sdk/json.js';
import type { TapeEntry, TapeReader } from '../sdk/tape.js';

export type { TapeEntry, TapeReader } from '../sdk/tape.js';

export interface TapeContext {
  readonly seed: string;
  /** counters per stream at the start of the step (mutated as a copy) */
  readonly counters: Readonly<Record<string, number>>;
  /** in replay mode, the recorded entries to consume; absent in live mode */
  readonly recorded?: readonly TapeEntry[];
  /** in replay/oracle injection, pre-set oracle values keyed by `${stream}#${counter}` */
  readonly oracleValues?: Readonly<Record<string, JsonValue>>;
}

export interface TapeResult {
  readonly entries: TapeEntry[];
  readonly counters: Record<string, number>;
}

/**
 * Build a TapeReader plus a sink that records every draw. The returned `result`
 * accessor yields the recorded entries + advanced counters once execute returns.
 */
export function createTape(ctx: TapeContext): { reader: TapeReader; result: () => TapeResult } {
  const counters: Record<string, number> = { ...ctx.counters };
  const entries: TapeEntry[] = [];
  const seedCache = new Map<string, bigint>();
  const recordedByKey = new Map<string, TapeEntry>();
  if (ctx.recorded) {
    for (const e of ctx.recorded) recordedByKey.set(`${e.stream}#${e.counter}`, e);
  }

  function ss(stream: string): bigint {
    let v = seedCache.get(stream);
    if (v === undefined) {
      v = streamSeed(ctx.seed, stream);
      seedCache.set(stream, v);
    }
    return v;
  }

  function take(stream: string): { counter: number; recorded?: TapeEntry } {
    const counter = counters[stream] ?? 0;
    counters[stream] = counter + 1;
    return { counter, recorded: recordedByKey.get(`${stream}#${counter}`) };
  }

  function rawUnit(stream: string, label?: string): number {
    const { counter, recorded } = take(stream);
    const computed = u64ToUnit(drawU64(ss(stream), counter));
    if (recorded && recorded.kind === 'rng') {
      // determinism assertion: recorded value must match recompute
      if (recorded.value !== computed) {
        throw new TapeDivergence(stream, counter, recorded.value, computed);
      }
    }
    entries.push({ stream, counter, kind: 'rng', value: computed, ...(label ? { label } : {}) });
    return computed;
  }

  const reader: TapeReader = {
    unit: (stream, label) => rawUnit(stream, label),
    intBelow: (stream, n, label) => {
      const { counter, recorded } = take(stream);
      const computed = u64ToIntBelow(drawU64(ss(stream), counter), n);
      if (recorded && recorded.kind === 'rng' && recorded.value !== computed) {
        throw new TapeDivergence(stream, counter, recorded.value, computed);
      }
      entries.push({ stream, counter, kind: 'rng', value: computed, ...(label ? { label } : {}) });
      return computed;
    },
    die: (stream, sides, label) => {
      const { counter, recorded } = take(stream);
      const computed = u64ToIntBelow(drawU64(ss(stream), counter), sides) + 1;
      if (recorded && recorded.kind === 'rng' && recorded.value !== computed) {
        throw new TapeDivergence(stream, counter, recorded.value, computed);
      }
      entries.push({ stream, counter, kind: 'rng', value: computed, ...(label ? { label } : {}) });
      return computed;
    },
    weightedIndex: (stream, weights, label) => {
      const total = weights.reduce((a, b) => a + (b > 0 ? b : 0), 0);
      const u = rawUnit(stream, label);
      if (total <= 0) return 0;
      let acc = 0;
      const target = u * total;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i]! > 0 ? weights[i]! : 0;
        if (target < acc) return i;
      }
      return weights.length - 1;
    },
    oracle: <T extends JsonValue>(stream: string, fallback: T, label?: string): T => {
      const { counter, recorded } = take(stream);
      const key = `${stream}#${counter}`;
      let value: T = fallback;
      if (recorded && recorded.kind === 'oracle') value = recorded.value as T;
      else if (ctx.oracleValues && key in ctx.oracleValues) value = ctx.oracleValues[key] as T;
      entries.push({ stream, counter, kind: 'oracle', value, ...(label ? { label } : {}) });
      return value;
    },
  };

  return { reader, result: () => ({ entries, counters }) };
}

export class TapeDivergence extends Error {
  constructor(
    readonly stream: string,
    readonly counter: number,
    readonly recorded: JsonValue,
    readonly computed: JsonValue,
  ) {
    super(
      `tape divergence on stream "${stream}" #${counter}: recorded ${JSON.stringify(recorded)} != recomputed ${JSON.stringify(computed)}`,
    );
    this.name = 'TapeDivergence';
  }
}
