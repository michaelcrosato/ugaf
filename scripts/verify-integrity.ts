/**
 * Integrity gate — the AdventureForge `verify-integrity` ethos, hardened:
 *   - no `.skip` / `.only` smuggled into the test suite (silent coverage drop);
 *   - no non-determinism primitives (Date.now / Math.random / new Date) in the
 *     deterministic layers (sdk/kernel/modules/world) — game-time is the turn
 *     counter, entropy is the recorded tape;
 *   - a test-count baseline so coverage can't silently regress.
 *
 * Run: `npm run integrity`.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASELINE = resolve(ROOT, 'scripts/.integrity-baseline.json');
const DETERMINISTIC_DIRS = ['src/sdk', 'src/kernel', 'src/modules', 'src/world'];
const FORBIDDEN_NONDET = /\b(Math\.random|Date\.now|performance\.now)\b|\bnew Date\b/;
const FORBIDDEN_FOCUS = /\b(describe|it|test|bench)\.only\b|\.skip\b|\bxit\b|\bxdescribe\b/;

async function listFiles(pattern: string): Promise<string[]> {
  const out: string[] = [];
  for await (const f of glob(pattern, { cwd: ROOT })) out.push(resolve(ROOT, f));
  return out;
}

/** Mask comments with spaces (preserving line numbers) so scans ignore prose. */
function maskComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

function rel(p: string): string {
  return relative(ROOT, p).split(sep).join('/');
}

async function main() {
  const errors: string[] = [];

  // 1. focus/skip markers in tests
  let testCount = 0;
  for (const file of await listFiles('test/**/*.ts')) {
    const src = readFileSync(file, 'utf8');
    const masked = maskComments(src);
    masked.split('\n').forEach((line, i) => {
      if (FORBIDDEN_FOCUS.test(line)) errors.push(`${rel(file)}:${i + 1}  focus/skip marker`);
    });
    testCount += (masked.match(/\b(it|test)\s*\(/g) ?? []).length;
  }

  // 2. non-determinism primitives in deterministic layers
  for (const dir of DETERMINISTIC_DIRS) {
    for (const file of await listFiles(`${dir}/**/*.ts`)) {
      const masked = maskComments(readFileSync(file, 'utf8'));
      masked.split('\n').forEach((line, i) => {
        if (FORBIDDEN_NONDET.test(line)) errors.push(`${rel(file)}:${i + 1}  non-determinism primitive: ${line.trim()}`);
      });
    }
  }

  // 3. test-count baseline (no silent regression)
  const update = process.argv.includes('--update-baseline');
  if (update) {
    writeFileSync(BASELINE, JSON.stringify({ testCount }, null, 2) + '\n');
    console.log(`baseline updated: ${testCount} tests`);
  } else if (existsSync(BASELINE)) {
    const prev = JSON.parse(readFileSync(BASELINE, 'utf8')).testCount as number;
    if (testCount < prev) errors.push(`test-count regression: ${testCount} < baseline ${prev} (use --update-baseline if intentional)`);
  } else {
    writeFileSync(BASELINE, JSON.stringify({ testCount }, null, 2) + '\n');
    console.log(`baseline created: ${testCount} tests`);
  }

  if (errors.length) {
    console.error(`\n✗ integrity violations (${errors.length}):\n`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log(`✓ integrity clean (${testCount} tests; deterministic layers free of wall-clock/entropy)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
