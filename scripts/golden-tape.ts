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
// The canonical winning session — and it now TIMES the unavoidable Greywater ford (feedback/0014 #1):
// the salvage core is anomalous worked matter the dark water hungers for, so carrying it out across
// the ford after dark would slump it to ore (a lost run). The deduced player reads the law, then waits
// out the night at the ford and crosses the bottoms in the SAFE predawn window — core intact — before
// slipping the watched gate while it is still dark. Learn the iron-hungry water; time the crossing; win.
const COMMANDS = [
  'out',
  'ask holt about the gap', // learn the gate's blind spot on the way in (used on the dark return)
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
  'deduce the greywater', // now you KNOW the water wakes at dusk and sleeps by the grey predawn hour
  'rest', // wait out the hungry dark at the ford (the ford is safe to wait — not the Hollow Dark's scope)
  'rest',
  'rest',
  'rest',
  'in', // cross into the bottoms in the SAFE predawn window — the core rides out intact
  'cache',
  'take core',
  'out',
  'back',
  'back', // up to the fork, clear of the water, the core whole
  'wire', // the cut in the wire, straight to the watched checkpoint, still dark
  'hide', // slip the gate's blind spot under cover of the predawn dark
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
