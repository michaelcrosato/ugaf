/* TEMP probe — dawdler script on a seed where hollow_dark IS live (seed-0), plus push it to closer=5. */
import { createGame } from '../src/game/assemble.js';
import { Session } from '../src/game/session.js';
import { HUSH_PACK } from '../content/hush/index.js';

const keys = [
  'phase.now', 'flag.last_intent', 'survival.pc', 'survival.pc.hp',
  'survival.pc.unsettled', 'survival.pc.exposure',
  'law.hollow_dark.live', 'law.hollow_dark.contacts', 'law.hollow_dark.closer', 'known.law.hollow_dark',
];

function run(seed: string, commands: string[]) {
  console.log(`\n===== seed ${seed} =====`);
  const game = createGame(HUSH_PACK, seed);
  console.log('hollow_dark.live =', game.initialState().facts['law.hollow_dark.live']);
  const s = new Session(game);
  for (const cmd of commands) {
    const r = s.act(cmd);
    const f = s.state.facts as Record<string, unknown>;
    const snap = keys.map((k) => `${k}=${f[k]}`).join(' ');
    console.log(`> ${cmd.padEnd(8)} | ${snap}`);
    const t = r.text.split('\n').map((l) => l.replace(/\x1b\[[0-9;]*m/g, '')).filter((l) => l.trim());
    // only print non-scene lines (skip room dumps)
    const interesting = t.filter((l) => /dark|still|Unsettled|nerve|closer|step|hum|leans|press|sitter|Hollow|wait|rest/i.test(l));
    if (interesting.length) console.log('    >>', interesting.join(' / ').slice(0, 300));
  }
}

// seed-0 has hollow_dark live. Dawdle hard at the fork after dark, many rests/waits.
run('seed-0', ['out', 'road', 'road', 'on', 'fork', 'rest', 'rest', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait']);
