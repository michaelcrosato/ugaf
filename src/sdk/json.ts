/**
 * Canonical JSON: the serialization substrate that makes hashing and replay
 * bit-stable. Everything the kernel hashes goes through `canonicalStringify`.
 *
 * Rules:
 *  - object keys are emitted in sorted (code-unit) order, recursively;
 *  - `undefined` is dropped (never serialized) — treat absence === undefined;
 *  - numbers must be finite (NaN/Infinity are rejected at the load gate, not here);
 *  - no prototype pollution: we read own enumerable keys only, and the kernel
 *    rejects `__proto__`/`constructor`/`prototype` keys at the load gate.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isPlainObject(v: unknown): v is JsonObject {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Deterministic, sorted-key serialization. Used as the input to hashing and as
 * the on-disk form for event logs and saves.
 */
export function canonicalStringify(value: JsonValue): string {
  return write(value);
}

function write(value: JsonValue): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error(`canonicalStringify: non-finite number ${String(value)}`);
    }
    // JSON number form is canonical for finite doubles in V8.
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(write).join(',') + ']';
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = (value as JsonObject)[k];
      if (v === undefined) continue;
      parts.push(JSON.stringify(k) + ':' + write(v as JsonValue));
    }
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`canonicalStringify: unsupported value of type ${t}`);
}

/** Structural deep clone via canonical round-trip. Safe (drops functions, freezes nothing). */
export function deepClone<T extends JsonValue>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

/** Recursively freeze a JSON value so accidental mutation throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[k]);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Reject dangerous keys anywhere in a parsed structure (the load/import gate).
 * Returns the value if clean; throws on the first dangerous key.
 */
export function assertNoPrototypePollution(value: JsonValue, path = '$'): JsonValue {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoPrototypePollution(v, `${path}[${i}]`));
  } else if (isPlainObject(value)) {
    for (const k of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(k)) {
        throw new Error(`prototype-pollution: dangerous key "${k}" at ${path}`);
      }
      assertNoPrototypePollution(value[k] as JsonValue, `${path}.${k}`);
    }
  }
  return value;
}

/** Assert every number in a structure is finite (load-gate finiteness check). */
export function assertFinite(value: JsonValue, path = '$'): JsonValue {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`finiteness: non-finite number at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertFinite(v, `${path}[${i}]`));
  } else if (isPlainObject(value)) {
    for (const k of Object.keys(value)) assertFinite(value[k] as JsonValue, `${path}.${k}`);
  }
  return value;
}
