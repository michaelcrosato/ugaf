/**
 * The gate — the single command Loop A must pass before sealing a build. Runs,
 * in order: typecheck, import-boundary check, integrity gate, the full test
 * suite (determinism + golden tapes + acceptance), and the coherence pass.
 *
 * Each stage runs on the POST-merge tree. Any red stage fails the gate.
 * Run: `npm run gate`.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

interface Stage {
  name: string;
  cmd: string[];
  optional?: boolean; // skip if the entry script doesn't exist yet (early build phases)
  entry?: string;
}

const STAGES: Stage[] = [
  { name: 'typecheck', cmd: ['npx', 'tsc', '--noEmit'] },
  { name: 'boundaries', cmd: ['npx', 'tsx', 'scripts/check-boundaries.ts'] },
  { name: 'integrity', cmd: ['npx', 'tsx', 'scripts/verify-integrity.ts'] },
  { name: 'tests', cmd: ['npx', 'vitest', 'run'] },
  { name: 'coherence', cmd: ['npx', 'tsx', 'scripts/coherence-pass.ts'], optional: true, entry: 'scripts/coherence-pass.ts' },
  { name: 'golden', cmd: ['npx', 'tsx', 'scripts/golden-tape.ts'], optional: true, entry: 'scripts/golden-tape.ts' },
];

function run(stage: Stage): boolean {
  if (stage.optional && stage.entry && !existsSync(resolve(ROOT, stage.entry))) {
    console.log(`\n— ${stage.name}: (skipped, not present yet)`);
    return true;
  }
  console.log(`\n▶ ${stage.name}: ${stage.cmd.join(' ')}`);
  // win32 needs a shell to resolve the npx/npm shims, but passing an args array
  // together with shell:true is deprecated (DEP0190) — so join into one command
  // string there. Stage args are fixed literals with no spaces, so this is exact.
  const r = process.platform === 'win32'
    ? spawnSync(stage.cmd.join(' '), { cwd: ROOT, stdio: 'inherit', shell: true })
    : spawnSync(stage.cmd[0]!, stage.cmd.slice(1), { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

let failed = 0;
const results: { name: string; ok: boolean }[] = [];
for (const stage of STAGES) {
  const ok = run(stage);
  results.push({ name: stage.name, ok });
  if (!ok) failed++;
}

console.log('\n──────── GATE SUMMARY ────────');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
if (failed) {
  console.log(`\n✗ GATE FAILED (${failed} stage${failed > 1 ? 's' : ''})`);
  process.exit(1);
}
console.log('\n✓ GATE PASSED — build is sealable');
