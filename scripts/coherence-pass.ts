/**
 * Run the coherence pass over the shipped world packs. Part of the gate.
 * Run: `npm run coherence`.
 */
import { coherencePass } from '../src/gates/coherence.js';
import { HUSH_PACK } from '../content/hush/index.js';

const packs = [HUSH_PACK];
let failed = 0;

for (const pack of packs) {
  const r = coherencePass(pack);
  console.log(`\n▸ coherence: ${pack.meta.title} (${r.checks.length} checks)`);
  const passed = r.checks.filter((c) => c.ok).length;
  console.log(`  ${passed}/${r.checks.length} checks pass`);
  if (r.warnings.length) for (const w of r.warnings) console.log(`  ⚠ ${w}`);
  if (!r.ok) {
    failed++;
    for (const e of r.errors) console.error(`  ✗ ${e}`);
  } else {
    const coupling = r.checks.find((c) => c.name === 'cross_law_coupling');
    console.log(
      `  ✓ learnability, delegated clamp, drift tells, matrix totality${coupling?.detail ? `, coupling: ${coupling.detail}` : ''}`,
    );
  }
}

if (failed) {
  console.error(`\n✗ coherence pass failed for ${failed} pack(s)`);
  process.exit(1);
}
console.log('\n✓ coherence pass clean');
