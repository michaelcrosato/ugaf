/**
 * Module-SDK helpers: manifest construction with sane defaults, manifest
 * validation (the forbids invariants + namespace legality), and content hashing
 * so a module's captured content folds into its identity (frozen-module-version
 * branching).
 */
import { createHash } from 'node:crypto';
import { canonicalStringify, type JsonValue } from './json.js';
import { FACT_NAMESPACES } from './facts.js';
import type { IntentClass } from './intents.js';
import type { Fidelity, LicenseTier, ModuleManifest } from './types.js';

export interface ManifestSpec {
  readonly id: string;
  readonly version?: string;
  readonly content: JsonValue; // captured content -> contentHash
  readonly source: string;
  readonly license: {
    readonly identifier: string;
    readonly attribution: string;
    readonly tier: LicenseTier;
    readonly provenance: 'licensed-source' | 'clean-room';
    readonly indicationOfChanges?: string;
  };
  readonly fidelity?: Fidelity;
  readonly domain: string;
  readonly priority: number;
  readonly intents: readonly IntentClass[];
  readonly writesFacts: readonly string[];
  readonly readsFacts: readonly string[];
  readonly scales?: readonly string[];
  readonly phases?: readonly string[];
  readonly ownsPaths?: readonly string[];
}

export function contentHash(content: JsonValue): string {
  return createHash('sha256').update(canonicalStringify(content), 'utf8').digest('hex');
}

export function makeManifest(spec: ManifestSpec): ModuleManifest {
  return {
    id: spec.id,
    version: spec.version ?? '0.1.0',
    contentHash: contentHash(spec.content),
    source: spec.source,
    license: {
      identifier: spec.license.identifier,
      attribution: spec.license.attribution,
      tier: spec.license.tier,
      approvedForImplementation: true,
      provenance: spec.license.provenance,
      ...(spec.license.indicationOfChanges ? { indicationOfChanges: spec.license.indicationOfChanges } : {}),
    },
    fidelity: spec.fidelity ?? 'native-subsystem',
    domain: spec.domain,
    priority: spec.priority,
    jurisdiction: {
      scales: spec.scales ?? ['character'],
      domains: [spec.domain],
      phases: spec.phases ?? ['any'],
      intents: spec.intents,
    },
    owns: { nativeStatePaths: spec.ownsPaths ?? [spec.id] },
    writesFacts: spec.writesFacts,
    readsFacts: spec.readsFacts,
    forbids: { numericalCrosswalks: true, normalizedOutcomes: true, universalBaseStatistics: true, runtimeRuleGeneration: true },
  };
}

/** Validate a manifest at registration: forbids flags + namespace legality + license sanity. */
export function validateManifest(m: ModuleManifest): string[] {
  const errors: string[] = [];
  const f = m.forbids;
  if (!(f.numericalCrosswalks && f.normalizedOutcomes && f.universalBaseStatistics && f.runtimeRuleGeneration)) {
    errors.push(`${m.id}: forbids invariants must all be true (no crosswalks/normalized/universal-stats/runtime-rules)`);
  }
  const ns = new Set<string>(FACT_NAMESPACES);
  for (const w of m.writesFacts) if (!ns.has(w)) errors.push(`${m.id}: writes unknown fact namespace "${w}"`);
  for (const r of m.readsFacts) if (!ns.has(r)) errors.push(`${m.id}: reads unknown fact namespace "${r}"`);
  if (!m.license.approvedForImplementation) errors.push(`${m.id}: license not approved for implementation`);
  if (m.license.tier === 'red' && m.license.provenance !== 'clean-room') {
    errors.push(`${m.id}: red-tier modules MUST be clean-room provenance (K11)`);
  }
  return errors;
}
