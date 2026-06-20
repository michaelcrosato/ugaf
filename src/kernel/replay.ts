/**
 * Replay + first-divergence localization — the determinism oracle. Feed a
 * golden tape's recorded intents + recorded random draws back through the
 * kernel; every `nextHash` must reproduce bit-for-bit. The first index where a
 * hash diverges localizes a non-determinism bug precisely.
 *
 * The kernel stays game-agnostic: the caller supplies a `ReplayDriver` that
 * knows how to build the initial state, compute the armed set, and build the
 * masked observation for any state (these must be deterministic functions of
 * state, exactly as live play computed them).
 */
import type { GameState, RoleObservation, Role } from '../sdk/types.js';
import { step } from './engine.js';
import { hashState } from './state.js';
import type { ModuleRegistry } from './registry.js';
import type { GoldenTape } from './eventlog.js';

export interface ReplayDriver {
  readonly registry: ModuleRegistry;
  initialState(): GameState;
  armedAt(state: GameState): ReadonlySet<string>;
  observationAt(state: GameState, role: Role): RoleObservation;
}

export type ReplayResult =
  | { readonly ok: true; readonly finalHash: string; readonly steps: number }
  | {
      readonly ok: false;
      readonly divergedAt: number;
      readonly expected: string;
      readonly actual: string;
      readonly detail: string;
    };

export function replay(driver: ReplayDriver, golden: GoldenTape): ReplayResult {
  let state = driver.initialState();
  const initialHash = hashState(state);
  if (initialHash !== golden.initialHash) {
    return {
      ok: false,
      divergedAt: -1,
      expected: golden.initialHash,
      actual: initialHash,
      detail: 'initial state hash mismatch (engine fingerprint or content drift)',
    };
  }

  for (const rec of golden.records) {
    const priorHash = hashState(state);
    if (priorHash !== rec.priorHash) {
      return {
        ok: false,
        divergedAt: rec.eventIndex,
        expected: rec.priorHash,
        actual: priorHash,
        detail: `prior-hash divergence before replaying step ${rec.eventIndex}`,
      };
    }
    const armed = driver.armedAt(state);
    const observation = driver.observationAt(state, 'player');
    let outcome: ReturnType<typeof step>;
    try {
      outcome = step(state, driver.registry, rec.intent, {
        armed,
        observation,
        recordedTape: rec.tape,
      });
    } catch (e) {
      // a TapeDivergence (recorded draw != recompute) surfaces here — a tamper
      // or non-determinism. Report it as a divergence at this index.
      return {
        ok: false,
        divergedAt: rec.eventIndex,
        expected: rec.nextHash,
        actual: '(throw)',
        detail: `step ${rec.eventIndex} threw on replay: ${(e as Error).message}`,
      };
    }
    if (outcome.kind !== 'committed') {
      return {
        ok: false,
        divergedAt: rec.eventIndex,
        expected: rec.nextHash,
        actual: '(no commit)',
        detail: `step ${rec.eventIndex} did not commit on replay: ${outcome.kind}`,
      };
    }
    if (outcome.nextHash !== rec.nextHash) {
      return {
        ok: false,
        divergedAt: rec.eventIndex,
        expected: rec.nextHash,
        actual: outcome.nextHash,
        detail: `next-hash divergence at step ${rec.eventIndex}`,
      };
    }
    state = outcome.state;
  }

  return { ok: true, finalHash: hashState(state), steps: golden.records.length };
}
