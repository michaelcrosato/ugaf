/**
 * Module registry — the injected set of intact modules the kernel reduces over.
 * The kernel imports this (a container of the SDK `Module` contract); it never
 * imports a concrete module. Composition wires concrete modules in at the app
 * layer and hands the registry to the kernel.
 */
import type { Module, ModuleId } from '../sdk/types.js';

export class ModuleRegistry {
  private readonly byId = new Map<ModuleId, Module>();
  private readonly ordered: Module[] = [];

  constructor(modules: readonly Module[]) {
    for (const m of modules) {
      if (this.byId.has(m.manifest.id)) {
        throw new Error(`duplicate module id: ${m.manifest.id}`);
      }
      this.byId.set(m.manifest.id, m);
    }
    // stable order: ascending priority (spine floor lowest), then id for determinism
    this.ordered = [...modules].sort(
      (a, b) => a.manifest.priority - b.manifest.priority || a.manifest.id.localeCompare(b.manifest.id),
    );
  }

  get(id: ModuleId): Module {
    const m = this.byId.get(id);
    if (!m) throw new Error(`module not registered: ${id}`);
    return m;
  }

  has(id: ModuleId): boolean {
    return this.byId.has(id);
  }

  all(): readonly Module[] {
    return this.ordered;
  }

  ids(): ModuleId[] {
    return this.ordered.map((m) => m.manifest.id);
  }

  /** A combined content fingerprint of all modules (for the replay/engine fingerprint). */
  contentFingerprint(): { module: ModuleId; version: string; contentHash: string }[] {
    return this.ordered.map((m) => ({
      module: m.manifest.id,
      version: m.manifest.version,
      contentHash: m.manifest.contentHash,
    }));
  }
}
