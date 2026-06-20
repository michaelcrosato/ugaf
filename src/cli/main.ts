/**
 * The playable CLI — the thing you drop into. A forgiving REPL over a Session:
 * free-text commands, plus meta verbs (codex, inventory, map, save, help). The
 * game is fully deterministic and offline; the same seed always tells the same
 * Hush.
 *
 *   npm run play            -- default seed
 *   npm run play -- --seed cordon-7
 *   npm run play -- --load saves/run.json
 */
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { HUSH_PACK } from '../../content/hush/index.js';
import { createGame } from '../game/assemble.js';
import { Session } from '../game/session.js';
import { bold, dim } from '../narrator/render.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const HELP = `${bold('How to play')}
  Type what you want to do in plain words: ${dim('go north · look · examine the milepost · listen ·')}
  ${dim('search · take the knife · drop the knife · talk to lyle · ask lyle about the greywater ·')}
  ${dim('bribe mox · say maren · look back · cross the ford · deduce the greywater · hide · wait · rest')}

  The Hush is lawful. Its anomalies have hidden but consistent rules. Read the world's
  tells, deduce the laws into your codex, and use them. A misread law is costly — but the
  first brush with any law warns you; it never kills you outright.

${bold('Meta commands')}
  ${dim('codex')}      what you have learned of the laws (and how far to trust it)
  ${dim('inventory / i')}  what you are carrying
  ${dim('look / l')}   re-read the scene        ${dim('map')}   the ways from here
  ${dim('save [file]')} write the run           ${dim('seed')}  show the world seed
  ${dim('help')}       this text                ${dim('quit')}  leave`;

function makeSession(): Session {
  const loadPath = arg('load');
  if (loadPath) {
    const data = JSON.parse(readFileSync(loadPath, 'utf8')) as { seed: string };
    const game = createGame(HUSH_PACK, data.seed);
    const s = new Session(game);
    // (replaying the saved golden tape to restore state is wired in M8; for now re-seed fresh)
    return s;
  }
  const seed = arg('seed') ?? 'cordon-1';
  return new Session(createGame(HUSH_PACK, seed));
}

async function main() {
  const session = makeSession();
  const out = (s: string) => process.stdout.write(s + '\n');

  out('');
  out(bold('  T H E   H U S H'));
  out(dim('  an anomaly zone where survival means learning the world\'s hidden, lawful physics'));
  out(dim(`  seed: ${session.game.seed}   ·   type "help" for how to play`));
  out('');
  out(session.opening());
  out('');
  out(session.statusLine());

  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: bold('> ') });
  rl.prompt();

  rl.on('line', (raw) => {
    const line = raw.trim();
    const lower = line.toLowerCase();
    if (!line) return rl.prompt();

    if (lower === 'quit' || lower === 'exit' || lower === 'q') {
      out(dim('The wire gate bangs shut behind you. The Hush keeps its laws without you.'));
      rl.close();
      return;
    }
    if (lower === 'help' || lower === '?') {
      out(HELP);
      return rl.prompt();
    }
    if (lower === 'codex') {
      out(session.codex());
      return rl.prompt();
    }
    if (lower === 'inventory' || lower === 'i' || lower === 'inv') {
      out(session.inventory());
      return rl.prompt();
    }
    if (lower === 'map') {
      const obs = session.obs();
      out(bold('Ways from here:'));
      for (const e of obs.scene.exits) out('  • ' + e.label);
      return rl.prompt();
    }
    if (lower === 'seed') {
      out(dim('world seed: ' + session.game.seed));
      return rl.prompt();
    }
    if (lower.startsWith('save')) {
      const file = line.split(/\s+/)[1] ?? 'saves/run.json';
      const dir = resolve(file, '..');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(file, session.save());
      out(dim(`saved to ${file}`));
      return rl.prompt();
    }

    const res = session.act(line);
    out('');
    out(res.text);
    if (res.status === 'active') {
      out('');
      out(session.statusLine());
      rl.prompt();
    } else {
      out('');
      out(dim('— the end —  (type `quit` to leave)'));
      rl.prompt();
    }
  });

  rl.on('close', () => process.exit(0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
