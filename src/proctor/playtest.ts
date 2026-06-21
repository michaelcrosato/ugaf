/**
 * Playtest harness — runs a command script through a PROCTOR session and returns
 * a clean transcript + the verifiable manifest + the realness verdict. This is
 * the unit Loop B fans out: a session is played, proven real, and handed to the
 * synthesis as a transcript a critic (or the next build cycle) can read.
 */
import { createGame } from '../game/assemble.js';
import { ProctorSession } from './protocol.js';
import { formatObservation, plain } from './transcript.js';
import { verifyRealness, type RealnessVerdict } from './oracle.js';
import type { WorldPack } from '../sdk/worldpack.js';
import type { SessionManifest } from './protocol.js';

export interface PlayedTurn {
  readonly n: number;
  readonly command: string;
  readonly ok: boolean;
  readonly rejection?: string;
  readonly text: string;
  readonly statusLine: string;
}

export interface PlayResult {
  readonly seed: string;
  readonly opening: string;
  readonly turns: PlayedTurn[];
  readonly finalStatus: string;
  readonly manifest: SessionManifest;
  readonly verdict: RealnessVerdict;
}

export function playScript(pack: WorldPack, seed: string, commands: readonly string[]): PlayResult {
  const game = createGame(pack, seed);
  const p = new ProctorSession(game, { delayMs: 0 });
  const opening = plain(p.openingText());
  const turns: PlayedTurn[] = [];
  let n = 0;
  for (const cmd of commands) {
    const o = p.observe();
    if (o.ended) break;
    n++;
    const r = p.act(o.turn_nonce, cmd);
    if (r.ok) {
      turns.push({
        n,
        command: cmd,
        ok: true,
        text: plain(r.result_text),
        statusLine: plain(r.next.status_line),
      });
    } else {
      turns.push({
        n,
        command: cmd,
        ok: false,
        rejection: r.rejection,
        text: plain(r.detail ?? r.rejection),
        statusLine: plain(o.status_line),
      });
    }
  }
  const manifest = p.manifest();
  return {
    seed,
    opening,
    turns,
    finalStatus: manifest.final_status,
    manifest,
    verdict: verifyRealness(manifest, game),
  };
}

/** Render a PlayResult as a readable transcript (for a human or a critic agent). */
export function renderTranscript(r: PlayResult): string {
  const out: string[] = [];
  out.push(`# Transcript — The Hush (seed ${r.seed})`, '', r.opening, '');
  for (const t of r.turns) {
    out.push(`> ${t.command}`);
    // a NOT_UNDERSTOOD carries an in-world line; don't label it with the protocol enum (feedback/0015 #2)
    if (!t.ok) out.push(t.rejection === 'NOT_UNDERSTOOD' ? `  ${t.text}` : `  [${t.rejection}] ${t.text}`);
    else
      out.push(
        t.text
          .split('\n')
          .map((l) => '  ' + l)
          .join('\n'),
      );
    out.push('  ' + t.statusLine, '');
  }
  out.push(
    `final: ${r.finalStatus}   ·   realness: ${r.verdict.real ? 'VERIFIED' : 'FAILED'} (${r.verdict.checks.map((c) => `${c.name}:${c.ok ? 'ok' : 'FAIL'}`).join(', ')})`,
  );
  return out.join('\n');
}

/** The "last observation" — for a turn-by-turn driver feeding a live agent. */
export function observeAfter(
  pack: WorldPack,
  seed: string,
  commands: readonly string[],
): { text: string; ended: boolean; status: string; legal: string[] } {
  const game = createGame(pack, seed);
  const p = new ProctorSession(game, { delayMs: 0 });
  for (const cmd of commands) {
    const o = p.observe();
    if (o.ended) break;
    p.act(o.turn_nonce, cmd);
  }
  const o = p.observe();
  return {
    text: formatObservation(o),
    ended: o.ended,
    status: o.outcome ?? 'active',
    legal: o.legal_actions.map((a) => a.label),
  };
}
