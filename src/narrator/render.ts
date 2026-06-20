/**
 * The renderer — reactive variant prose over committed facts. It NEVER mutates
 * state and never asserts a fact the engine didn't commit (the fiction
 * firewall, render.ts -> firewall.ts). Depth comes from the craft model
 * (research rules 12/14): a `base` of a few very particular details + `when`-
 * gated variants that shift with world/law state + `ambient` lines that cycle
 * deterministically so revisits never read identically + once-only firstReveals.
 *
 * The authored prose is fully deterministic and offline — no live LLM needed to
 * play. An LLM renderer can later sit behind the same firewall as an enhancement.
 */
import { evalPredicate } from '../sdk/law.js';
import { makeFactView, type FactView } from '../sdk/facts.js';
import type { GameState, RoleObservation, WorldEvent, RenderPayload } from '../sdk/types.js';
import type { WorldPack, DescriptionBlock, NodeDef, RegionDef, TellProse } from '../sdk/worldpack.js';

export interface Renderer {
  renderScene(state: GameState, obs: RoleObservation, opts: { firstVisit: boolean }): string;
  renderEvents(events: readonly WorldEvent[], renders: readonly RenderPayload[], obs: RoleObservation): string;
  describeExamine(targetId: string | undefined, state: GameState): string | undefined;
}

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRenderer(pack: WorldPack): Renderer {
  const nodes = new Map<string, NodeDef>(pack.nodes.map((n) => [n.id, n]));
  const regions = new Map<string, RegionDef>(pack.regions.map((r) => [r.id, r]));
  const tellProse = new Map<string, TellProse>(pack.tellLibrary.map((t) => [t.id, t]));
  const examinables = new Map<string, DescriptionBlock>();
  for (const n of pack.nodes) for (const ex of n.examinables ?? []) examinables.set(`${n.id}:${ex.id}`, ex.look);
  const exByGlobal = new Map<string, DescriptionBlock>();
  for (const n of pack.nodes) for (const ex of n.examinables ?? []) exByGlobal.set(ex.id, ex.look);

  function compose(block: DescriptionBlock, facts: FactView, turn: number, nodeId: string, firstVisit: boolean): string {
    const parts: string[] = [];
    let base = block.base;
    for (const v of block.variants ?? []) {
      if (evalPredicate(v.when, facts)) {
        if (v.replace) base = v.text;
        else parts.push(v.text);
      }
    }
    const out = [base, ...parts];
    if (firstVisit && block.firstReveal) out.push(block.firstReveal);
    if (block.ambient && block.ambient.length) {
      const pick = strHash(`${nodeId}#${turn}`) % block.ambient.length;
      out.push(block.ambient[pick]!);
    }
    return out.join(' ');
  }

  function renderScene(state: GameState, obs: RoleObservation, optsArg: { firstVisit: boolean }): string {
    const node = nodes.get(obs.location);
    const facts = makeFactView(obs.facts);
    if (!node) return obs.location;
    const region = regions.get(node.regionId);
    const lines: string[] = [];

    // title + (occasional) region sensory baseline
    lines.push(bold(node.title.toUpperCase()));
    if (optsArg.firstVisit && region) lines.push(dim(region.palette.sight));

    lines.push(compose(node.look, facts, state.turn, node.id, optsArg.firstVisit));

    // entities present
    const ents = obs.scene.entities;
    const npcs = ents.filter((e) => e.kind === 'npc');
    const items = ents.filter((e) => e.kind === 'item');
    if (npcs.length) lines.push(`You can see ${list(npcs.map((n) => n.label))} here.`);
    if (items.length) lines.push(`There is ${list(items.map((i) => i.label))} here.`);

    // exits
    const exits = obs.scene.exits;
    if (exits.length) {
      lines.push(dim('Ways from here: ' + exits.map((e) => `${e.label}`).join('; ') + '.'));
    }

    // affordance surfacing (rule 20): nameable things worth a closer look
    const exNames = (node.examinables ?? []).map((e) => e.names[0]).filter(Boolean);
    if (exNames.length) lines.push(dim('You could look closer at: ' + exNames.join(', ') + '.'));

    return lines.join('\n');
  }

  function renderEvents(events: readonly WorldEvent[], _renders: readonly RenderPayload[], _obs: RoleObservation): string {
    const out: string[] = [];
    for (const ev of events) {
      if (ev.visibility === 'private') continue;
      if (ev.summary && ev.summary.trim()) out.push(ev.summary.trim());
    }
    return out.join('\n');
  }

  function describeExamine(targetId: string | undefined, state: GameState): string | undefined {
    if (!targetId) return undefined;
    const facts = makeFactView(state.facts);
    const node = nodes.get((state.facts['loc.pc'] as string) ?? '');
    const scoped = node ? examinables.get(`${node.id}:${targetId}`) : undefined;
    const block = scoped ?? exByGlobal.get(targetId);
    if (!block) {
      const t = tellProse.get(targetId);
      return t ? `${t.cue} ${t.note}` : undefined;
    }
    return compose(block, facts, state.turn, node?.id ?? '', false);
  }

  return { renderScene, renderEvents, describeExamine };
}

// ---- minimal ANSI (presentation only; never affects state) ----------------
const useColor = process.env.NO_COLOR === undefined && process.env.LOOM_NOCOLOR === undefined;
export function bold(s: string): string {
  return useColor ? `\x1b[1m${s}\x1b[0m` : s;
}
export function dim(s: string): string {
  return useColor ? `\x1b[2m${s}\x1b[0m` : s;
}
function list(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')}, and ${xs.at(-1)}`;
}
