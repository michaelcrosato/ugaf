/**
 * The autonomous flywheel — ONE full self-driving cycle, headless.
 *
 *   Loop B (play)      : `npm run playtest` regenerates realness-verified transcripts (deterministic, no LLM).
 *   Loop B (critique)  +
 *   Loop A (implement) : a headless Claude Code agent (`claude -p`) reads the transcripts + the feedback
 *                        history, writes the next feedback/NNNN.md, implements the single highest-leverage
 *                        fix, runs the gate, and commits IF green / reverts if red.
 *   Loop A (seal)      : `npm run gate` is the hard correctness floor — nothing commits red.
 *
 * Run one cycle on demand:        npm run flywheel
 * Run unattended (scheduler/cron): FLYWHEEL_AUTONOMOUS=1 npm run flywheel
 *   (FLYWHEEL_AUTONOMOUS lets the agent accept its own edits + bash; the gate is the safety net.
 *    Without it, the agent runs in acceptEdits mode and may pause on a bash permission prompt.)
 *
 * This script is the body a scheduled cloud routine or an in-session /loop runs to keep the
 * flywheel turning on its own. See docs/FLYWHEEL.md.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
// win32 needs a shell to resolve the npm/git shims, but combining an args array
// with shell:true is deprecated (DEP0190); join into one command string there.
// Every call site passes fixed literal args with no spaces, so this is exact.
const sh = (cmd: string, args: string[], opts: { quiet?: boolean } = {}) => {
  const stdio = opts.quiet ? 'pipe' : 'inherit';
  return process.platform === 'win32'
    ? spawnSync([cmd, ...args].join(' '), { cwd: ROOT, stdio, shell: true, encoding: 'utf8' })
    : spawnSync(cmd, args, { cwd: ROOT, stdio, encoding: 'utf8' });
};

function nextFeedbackNumber(): string {
  const nums = readdirSync(resolve(ROOT, 'feedback'))
    .map((f) => /^(\d{4})\.md$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');
}

function gitClean(): boolean {
  return sh('git', ['status', '--porcelain'], { quiet: true }).stdout.trim() === '';
}

async function main() {
  console.log('▸ FLYWHEEL — one autonomous cycle\n');
  if (!gitClean()) {
    console.error('✗ working tree is dirty — commit or stash first (the cycle commits its own change).');
    process.exit(1);
  }

  // ---- Loop B: play (deterministic, realness-verified) ----------------------
  console.log('① Loop B — play: regenerating transcripts via PROCTOR …');
  if (sh('npm', ['run', 'playtest']).status !== 0) {
    console.error('✗ playtest failed');
    process.exit(1);
  }

  // ---- Loop B critique + Loop A implement (the agent step) ------------------
  const fb = nextFeedbackNumber();
  const autonomous = process.env.FLYWHEEL_AUTONOMOUS === '1';
  const prompt = [
    'You are one turn of the LOOM self-improvement flywheel for the text game "The Hush" (this repo).',
    'Do EXACTLY this, then stop:',
    '1. Read playtest-runs/*.md (the fresh realness-verified transcripts), docs/craft/IF-CRAFT-RESEARCH.md (the craft north-star),',
    '   and ALL of feedback/0001.md..the latest (do NOT re-file already-fixed items).',
    `2. Critique the CURRENT build for the highest-leverage remaining issue (fun/dwell, fairness, parser, prose, balance, replay).`,
    `   Write your prioritized findings to feedback/${fb}.md (executive summary + a ranked Top-fixes list + what is already great).`,
    '3. Implement ONLY the single highest-leverage fix (P0 first, else P1). Keep it surgical and in the established voice/architecture.',
    '4. Run `npm run gate`. If anything that changed state needs a golden re-pin, run `npm run golden -- --update` (a deliberate re-pin) and re-run the gate.',
    '5. If the gate is GREEN: `git add -A` and commit with a message that traces the feedback item -> the change',
    `   (end the message with the Co-Authored-By line). If the gate is RED after a reasonable attempt: \`git reset --hard HEAD\` and instead`,
    `   commit ONLY feedback/${fb}.md documenting the finding and that the fix needs another pass.`,
    'Be honest; if the game is already excellent and you can only find P2 polish, say so and make one small, safe improvement. One fix per cycle.',
  ].join('\n');

  console.log(`\n② Loop B critique + Loop A implement: invoking a headless agent (feedback/${fb}.md) …`);
  // The prompt goes via STDIN, never as a shell arg — a big multi-line prompt
  // concatenated into a win32 shell command gets mangled (quotes/newlines/parens).
  // autonomous = skip all permission prompts (the gate is the safety net); else auto-accept edits only.
  const claudeArgs = autonomous ? ['-p', '--dangerously-skip-permissions'] : ['-p', '--permission-mode', 'acceptEdits'];
  // Same DEP0190 avoidance: on win32 pass one shell command string (flags are
  // literal, no spaces). The multi-line prompt still rides stdin, never the args.
  const agent = process.platform === 'win32'
    ? spawnSync(['claude', ...claudeArgs].join(' '), {
        cwd: ROOT,
        shell: true,
        encoding: 'utf8',
        input: prompt,
        stdio: ['pipe', 'inherit', 'inherit'],
        maxBuffer: 64 * 1024 * 1024,
      })
    : spawnSync('claude', claudeArgs, {
        cwd: ROOT,
        encoding: 'utf8',
        input: prompt,
        stdio: ['pipe', 'inherit', 'inherit'],
        maxBuffer: 64 * 1024 * 1024,
      });
  if (agent.status !== 0) {
    console.error('\n✗ the agent step did not complete cleanly. If it stopped on a permission prompt, re-run with FLYWHEEL_AUTONOMOUS=1 (unattended) or drive it interactively.');
    process.exit(1);
  }

  // ---- report ---------------------------------------------------------------
  console.log('\n③ cycle complete. Latest commit:');
  sh('git', ['log', '--oneline', '-1']);
  console.log('\n✓ one flywheel turn done. Schedule this (cron / cloud routine / /loop) to keep it turning.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
