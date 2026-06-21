/**
 * Golden-tape CI — a canonical Hush session, recorded once and replayed
 * bit-for-bit on every gate run. If the engine or content changes such that the
 * tape no longer replays, the gate FAILS (the determinism guarantee). A
 * legitimate change is re-pinned deliberately with `npm run golden -- --update`
 * (the engine-fingerprint bump protocol — never a silent re-pin).
 *
 * Run: `npm run golden`   (check)   |   `npm run golden -- --update`  (re-pin)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUSH_PACK } from '../content/hush/index.js';
import { createGame } from '../src/game/assemble.js';
import { Session } from '../src/game/session.js';
import { replay } from '../src/kernel/replay.js';
import { fingerprintId, engineFingerprint, type GoldenTape } from '../src/kernel/eventlog.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = resolve(ROOT, 'test/golden/hush-canonical.json');

const SEED = 'golden-hush';
const COMMANDS = [
  'out',
  'road',
  'talk to lyle',
  'ask lyle about the mile road',
  'ask lyle about the greywater',
  'survey',
  'talk to eun',
  'out',
  'road',
  'examine the milepost',
  'look back',
  'on',
  'examine the walker',
  'deduce the mile road',
  'fork',
  'water',
  'examine the rust',
  'listen',
  'deduce the greywater',
  'in',
  'cache',
  'take core',
  'out',
  'back',
  'back',
  'mile',
  'back',
  'back',
  'gate',
  'ask holt about the gap',
  'hide',
  'back',
];

function record(): { golden: GoldenTape; status: string } {
  const game = createGame(HUSH_PACK, SEED);
  const s = new Session(game);
  let status = 'active';
  for (const c of COMMANDS) {
    const r = s.act(c);
    status = r.status;
    if (status !== 'active') break;
  }
  return { golden: s.log.toGolden(), status };
}

const update = process.argv.includes('--update');

if (update || !existsSync(FIXTURE)) {
  const { golden, status } = record();
  mkdirSync(resolve(FIXTURE, '..'), { recursive: true });
  writeFileSync(
    FIXTURE,
    JSON.stringify(
      { seed: SEED, commands: COMMANDS, fingerprintId: golden.fingerprintId, finalStatus: status, golden },
      null,
      2,
    ),
  );
  console.log(
    `✓ golden tape ${update ? 're-pinned' : 'created'}: ${golden.records.length} turns, final=${status}, fp=${golden.fingerprintId}`,
  );
  process.exit(0);
}

const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as {
  seed: string;
  fingerprintId: string;
  finalStatus: string;
  golden: GoldenTape;
};
const currentFp = fingerprintId(engineFingerprint(createGame(HUSH_PACK, fixture.seed).registry));
if (currentFp !== fixture.fingerprintId) {
  console.error(`✗ engine fingerprint changed (${fixture.fingerprintId} -> ${currentFp}).`);
  console.error(`  This is the deliberate re-pin point: review the change, then run \`npm run golden -- --update\`.`);
  process.exit(1);
}
const res = replay(createGame(HUSH_PACK, fixture.seed).driver(), fixture.golden);
if (!res.ok) {
  console.error(`✗ golden tape diverged at step ${res.divergedAt}: ${res.detail}`);
  process.exit(1);
}
console.log(
  `✓ golden tape replays bit-for-bit (${fixture.golden.records.length} turns, fp=${fixture.fingerprintId}, final=${fixture.finalStatus})`,
);
