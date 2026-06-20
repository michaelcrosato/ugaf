/**
 * Transcript formatting — turns a masked Observation into the player-facing text
 * a blind agent (or a human) sees. This is the player's ENTIRE knowable universe;
 * it contains no hidden state, no rules, no code — only what a fair player sees.
 */
import type { Observation } from './protocol.js';

/** strip ANSI so an LLM player sees clean text. */
export function plain(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

export function formatObservation(o: Observation, opts: { withActions?: boolean } = {}): string {
  const lines: string[] = [];
  lines.push(plain(o.scene));
  lines.push('');
  lines.push(plain(o.status_line));
  const you = o.you as Record<string, unknown>;
  const bits: string[] = [];
  if (you.survival && you.survival !== 'alive') bits.push(`condition: ${String(you.survival)}`);
  if (typeof you.unsettled === 'number' && you.unsettled > 0) bits.push(`unsettled ${you.unsettled}`);
  if (typeof you.exposure === 'number' && you.exposure > 0) bits.push(`exposure ${you.exposure}`);
  if (bits.length) lines.push('You feel: ' + bits.join(', ') + '.');
  if (opts.withActions !== false && o.legal_actions.length) {
    lines.push('');
    lines.push('You can (among other things): ' + o.legal_actions.map((a) => a.label).join(' · '));
  }
  return lines.join('\n');
}

/** the blind-player briefing — the rules of engagement, never the rules of the world. */
export const PLAYER_BRIEFING = `You are playing a blind text adventure called THE HUSH. You can ONLY learn about the
world by playing it — you must not read any files, code, or content; rely solely on what the game shows you.

Respond with ONE short command in plain words (e.g. "go north", "examine the milepost", "look back",
"listen", "search", "take the knife", "drop the knife", "talk to lyle", "ask lyle about the greywater",
"deduce the mile road", "say maren", "hide", "wait", "rest", "look", "codex", "inventory").

The Hush is an anomaly zone with hidden but LAWFUL physics: its dangers obey consistent, discoverable
rules. Read the world's tells, work out the laws, and use them to reach the core and carry it out alive.
Reply with only your next command, nothing else.`;
