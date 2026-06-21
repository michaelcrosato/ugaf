/**
 * Architecture boundary checker — enforces the hard import layering the design
 * mandates: the kernel imports no concrete module; modules import only the SDK
 * (never each other, never the kernel internals); composition happens by
 * jurisdiction routing, not by import.
 *
 * Run: `npm run boundaries`. Exits non-zero on the first violation set.
 */
import { readFileSync } from 'node:fs';
import { relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

type Layer =
  | 'sdk'
  | 'kernel'
  | 'modules'
  | 'world'
  | 'narrator'
  | 'game'
  | 'proctor'
  | 'cli'
  | 'gates'
  | 'content'
  | 'unknown';

// which layers each layer may import from
const ALLOWED: Record<Layer, Layer[]> = {
  sdk: ['sdk'],
  kernel: ['kernel', 'sdk'],
  modules: ['sdk', 'modules'], // 'modules' only its OWN subdir (checked separately)
  world: ['sdk', 'world'],
  narrator: ['sdk', 'kernel', 'world', 'narrator'],
  game: ['sdk', 'kernel', 'modules', 'world', 'narrator', 'game'],
  proctor: ['sdk', 'kernel', 'modules', 'world', 'narrator', 'game', 'proctor'],
  cli: ['sdk', 'kernel', 'modules', 'world', 'narrator', 'game', 'proctor', 'cli', 'gates', 'content'],
  gates: ['sdk', 'kernel', 'modules', 'world', 'narrator', 'game', 'proctor', 'gates', 'content'],
  content: ['sdk', 'world', 'content'],
  unknown: [],
};

function layerOf(absPath: string): { layer: Layer; moduleDir?: string } {
  const rel = relative(ROOT, absPath).split(sep).join('/');
  if (rel.startsWith('src/')) {
    const parts = rel.split('/');
    const layer = parts[1] as Layer;
    if (layer === 'modules') return { layer, moduleDir: parts[2] };
    return { layer };
  }
  if (rel.startsWith('content/')) return { layer: 'content' };
  return { layer: 'unknown' };
}

const IMPORT_RE = /(?:import|export)\b[^'"`]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function importsOf(src: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(src))) out.push((m[1] ?? m[2])!);
  return out;
}

function isRelative(spec: string): boolean {
  return spec.startsWith('.') || spec.startsWith('/');
}

async function main() {
  const files: string[] = [];
  for await (const f of glob('src/**/*.ts', { cwd: ROOT })) files.push(resolve(ROOT, f));
  for await (const f of glob('content/**/*.ts', { cwd: ROOT })) files.push(resolve(ROOT, f));

  const violations: string[] = [];
  for (const file of files) {
    const from = layerOf(file);
    const src = readFileSync(file, 'utf8');
    for (const spec of importsOf(src)) {
      if (!isRelative(spec)) continue; // external (node:, zod, vitest) — always allowed
      const target = resolve(dirname(file), spec);
      const to = layerOf(target);
      const relFrom = relative(ROOT, file).split(sep).join('/');
      if (to.layer === 'unknown') continue;
      if (!ALLOWED[from.layer].includes(to.layer)) {
        violations.push(`${relFrom}\n    imports ${spec}  [${from.layer} -> ${to.layer} FORBIDDEN]`);
        continue;
      }
      // module isolation: a module may import only its OWN subdir among modules
      if (from.layer === 'modules' && to.layer === 'modules' && from.moduleDir !== to.moduleDir) {
        violations.push(
          `${relFrom}\n    imports ${spec}  [module ${from.moduleDir} -> module ${to.moduleDir} FORBIDDEN: compose by routing, not import]`,
        );
      }
    }
  }

  if (violations.length) {
    console.error(`\n✗ boundary violations (${violations.length}):\n`);
    for (const v of violations) console.error('  ' + v + '\n');
    process.exit(1);
  }
  console.log(`✓ boundaries clean (${files.length} files scanned)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
