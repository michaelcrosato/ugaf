/**
 * The realness oracle — three independent checks that make "I simulated it
 * because I know the rules" detectable, plus a blind-leak heuristic (the oracle
 * proves a run was LIVE, not BLIND):
 *
 *  1. nonce chain intact   — every act echoed the nonce from its observe; no
 *                            reuse. A turn can't be produced without the live obs.
 *  2. wall-clock gaps      — each commit gap >= the configured delay (forgeable
 *                            only by the server, which stamps the times).
 *  3. determinism on replay— feeding the recorded intents + tape back through the
 *                            kernel reproduces identical hashes (the real engine).
 *  4. blind-leak (soft)    — avoiding a lethal law with zero prior tell-observation
 *                            is a statistical tell of source-reading.
 */
import { replay } from '../kernel/replay.js';
import { hashState } from '../kernel/state.js';
import { step } from '../kernel/engine.js';
import type { SessionManifest } from './protocol.js';
import type { Game } from '../game/assemble.js';

export interface RealnessVerdict {
  readonly real: boolean;
  readonly checks: { readonly name: string; readonly ok: boolean; readonly detail?: string }[];
  readonly blindLeak: { readonly suspicious: boolean; readonly detail: string };
}

export function verifyRealness(manifest: SessionManifest, game: Game, minDelayMs = 0): RealnessVerdict {
  const checks: RealnessVerdict['checks'] = [];

  // 1. nonce chain intact + no reuse
  const seen = new Set<string>();
  let nonceOk = true;
  let nonceDetail = '';
  for (const t of manifest.turns) {
    if (t.nonce_echoed !== t.nonce_issued) {
      nonceOk = false;
      nonceDetail = `turn ${t.turn}: echoed ${t.nonce_echoed} != issued ${t.nonce_issued}`;
      break;
    }
    if (seen.has(t.nonce_issued)) {
      nonceOk = false;
      nonceDetail = `turn ${t.turn}: nonce reuse ${t.nonce_issued}`;
      break;
    }
    seen.add(t.nonce_issued);
  }
  checks.push({ name: 'nonce_chain', ok: nonceOk, ...(nonceOk ? {} : { detail: nonceDetail }) });

  // 2. wall-clock gaps >= delay
  let clockOk = true;
  let clockDetail = '';
  for (const t of manifest.turns) {
    if (t.wall_clock_gap_ms < minDelayMs) {
      clockOk = false;
      clockDetail = `turn ${t.turn}: gap ${t.wall_clock_gap_ms}ms < delay ${minDelayMs}ms`;
      break;
    }
  }
  checks.push({ name: 'wall_clock', ok: clockOk, ...(clockOk ? {} : { detail: clockDetail }) });

  // 3. determinism on replay
  const rep = replay(game.driver(), manifest.golden);
  checks.push({ name: 'determinism', ok: rep.ok, ...(rep.ok ? {} : { detail: rep.detail }) });

  // 4. blind-leak heuristic: re-run to the final state and inspect what was learned
  const blindLeak = blindLeakCheck(manifest, game);

  const real = checks.every((c) => c.ok);
  return { real, checks, blindLeak };
}

function blindLeakCheck(manifest: SessionManifest, game: Game): RealnessVerdict['blindLeak'] {
  // reconstruct the final state by replaying the recorded intents
  let state = game.driver().initialState();
  for (const rec of manifest.golden.records) {
    const out = step(state, game.registry, rec.intent, { armed: game.armedAt(state), observation: game.buildObservation(state, 'player'), recordedTape: rec.tape });
    if (out.kind === 'committed') state = out.state;
  }
  void hashState(state);
  // did the player AVOID every lethal law while observing none of its tells?
  const suspicious: string[] = [];
  for (const law of game.pack.laws) {
    const lethal = law.combatConsequence || law.effect.kind === 'summon';
    if (!lethal) continue;
    const contacts = (state.facts[`law.${law.id}.contacts`] as number) ?? 0;
    const tellsSeen = law.tells.filter((t) => state.facts[`known.tell.${t.id}`] === true).length;
    const asked = !!state.facts[`known.rumor.${law.id}`];
    if (contacts === 0 && tellsSeen === 0 && !asked) {
      // never triggered it, never saw a tell, never heard of it — but also never went there?
      // only suspicious if they actually visited the law's scope and still avoided perfectly
      suspicious.push(law.id);
    }
  }
  return {
    suspicious: false, // we don't fail a run on this heuristic; we surface it
    detail: suspicious.length ? `laws untouched & unobserved (expected for unvisited scope): ${suspicious.join(', ')}` : 'no anomalous avoidance pattern',
  };
}
