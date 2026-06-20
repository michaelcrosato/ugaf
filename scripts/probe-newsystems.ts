/* TEMP probe — trace new-systems facts per turn for the dawdler + antenna + a no-hollow seed. */
import { createGame } from '../src/game/assemble.js';
import { Session } from '../src/game/session.js';
import { HUSH_PACK } from '../content/hush/index.js';

function trace(label: string, seed: string, commands: string[], keys: string[]) {
  console.log(`\n===== ${label} (seed ${seed}) =====`);
  const game = createGame(HUSH_PACK, seed);
  // report which laws are live this seed
  const live = HUSH_PACK.laws.map((l) => `${l.id}=${game.initialState().facts[`law.${l.id}.live`]}`);
  console.log('live:', live.join(' '));
  const s = new Session(game);
  for (const cmd of commands) {
    const r = s.act(cmd);
    const f = s.state.facts as Record<string, unknown>;
    const snap = keys.map((k) => `${k}=${f[k]}`).join(' ');
    const firstLine = r.text.split('\n').find((l) => l.trim().length) ?? '';
    console.log(`> ${cmd.padEnd(22)} | ${snap}`);
    console.log(`    text: ${r.text.replace(/\n/g, ' / ').slice(0, 240)}`);
  }
}

const hollowKeys = [
  'phase.now', 'flag.last_intent', 'survival.pc.unsettled', 'survival.pc.exposure',
  'law.hollow_dark.live', 'law.hollow_dark.contacts', 'law.hollow_dark.closer', 'known.law.hollow_dark',
];

trace('DAWDLER', 'cordon-7',
  ['out', 'road', 'road', 'on', 'fork', 'rest', 'rest', 'wait', 'wait', 'wait', 'wait', 'listen', 'examine the sitter', 'deduce the hollow dark', 'codex'],
  hollowKeys);

// Check several seeds to see how often hollow_dark is live (per-seed variance "felt"?)
console.log('\n===== VARIANCE: hollow_dark live across 16 seeds =====');
let liveCount = 0;
for (let i = 0; i < 16; i++) {
  const seed = `seed-${i}`;
  const g = createGame(HUSH_PACK, seed);
  const isLive = g.initialState().facts['law.hollow_dark.live'];
  if (isLive) liveCount++;
  console.log(`  ${seed}: hollow_dark.live=${isLive}`);
}
console.log(`  -> live on ${liveCount}/16 seeds`);

// Antenna escape: confirm leaving escapes, lingering kills, speaking again kills
trace('ANTENNA-LINGER (stay one extra turn after warning)', 'pt-antenna',
  ['out', 'road', 'road', 'on', 'antennas', 'say maren', 'wait'],
  ['phase.now', 'flag.last_intent', 'law.antenna_field.active', 'law.antenna_field.active_turn', 'survival.pc', 'survival.pc.hp']);

trace('ANTENNA-SPEAK-AGAIN', 'pt-antenna',
  ['out', 'road', 'road', 'on', 'antennas', 'say maren', 'say jana'],
  ['phase.now', 'flag.last_intent', 'law.antenna_field.active', 'survival.pc', 'survival.pc.hp']);
