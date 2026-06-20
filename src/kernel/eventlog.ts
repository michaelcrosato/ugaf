/**
 * Event-sourced log + the engine fingerprint that pins replay. A campaign is
 * its seed + an ordered list of event records; replaying them reproduces every
 * `nextHash` bit-for-bit. Changing a module's content hash (or the engine
 * fingerprint) forks a new branch rather than silently invalidating the tape.
 */
import type { ParsedIntent } from '../sdk/intents.js';
import type { ModuleId, WorldEvent } from '../sdk/types.js';
import type { TapeEntry } from './tape.js';
import { hashTagged } from './hash.js';
import type { ModuleRegistry } from './registry.js';

export const ENGINE = {
  version: '0.1.0',
  rngAlgo: 'splitmix64',
  hashAlgo: 'sha256',
  floatMode: 'ieee754-double',
  collectionOrder: 'sorted-keys',
} as const;

export interface EngineFingerprint {
  readonly version: string;
  readonly rngAlgo: string;
  readonly hashAlgo: string;
  readonly floatMode: string;
  readonly collectionOrder: string;
  readonly modules: { readonly module: ModuleId; readonly version: string; readonly contentHash: string }[];
}

export function engineFingerprint(registry: ModuleRegistry): EngineFingerprint {
  return { ...ENGINE, modules: registry.contentFingerprint() };
}

/** A 12-char id summarizing the fingerprint, for branch labels + provenance. */
export function fingerprintId(fp: EngineFingerprint): string {
  return hashTagged('loom.fingerprint.v1', fp as unknown as Record<string, never>).slice(0, 12);
}

export interface EventRecord {
  readonly eventIndex: number; // turn after commit
  readonly intent: ParsedIntent; // the resolved intent token (replay uses this; never re-parses)
  readonly owner: ModuleId;
  readonly tape: readonly TapeEntry[];
  readonly events: readonly WorldEvent[]; // for audit + spectator + render
  readonly priorHash: string;
  readonly nextHash: string;
}

export interface GoldenTape {
  readonly campaignId: string;
  readonly seed: string;
  readonly fingerprintId: string;
  readonly fingerprint: EngineFingerprint;
  readonly initialHash: string;
  readonly records: readonly EventRecord[];
}

/** A growable event log for a live campaign. */
export class EventLog {
  private readonly records: EventRecord[] = [];
  constructor(
    readonly campaignId: string,
    readonly seed: string,
    readonly fingerprint: EngineFingerprint,
    readonly initialHash: string,
  ) {}

  append(rec: EventRecord): void {
    if (this.records.length && this.records.at(-1)!.eventIndex + 1 !== rec.eventIndex) {
      throw new Error(`event log gap: expected ${this.records.length + this.records[0]!.eventIndex} got ${rec.eventIndex}`);
    }
    if (this.records.length && this.records.at(-1)!.nextHash !== rec.priorHash) {
      throw new Error(`event log chain break at index ${rec.eventIndex}: priorHash mismatch`);
    }
    this.records.push(rec);
  }

  length(): number {
    return this.records.length;
  }

  latestHash(): string {
    return this.records.length ? this.records.at(-1)!.nextHash : this.initialHash;
  }

  toGolden(): GoldenTape {
    return {
      campaignId: this.campaignId,
      seed: this.seed,
      fingerprintId: fingerprintId(this.fingerprint),
      fingerprint: this.fingerprint,
      initialHash: this.initialHash,
      records: [...this.records],
    };
  }
}
