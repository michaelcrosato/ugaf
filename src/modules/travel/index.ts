/**
 * travel.graph — the hottest state slice in a dwell world: current node,
 * heading/facing, route memory, and a light inventory. It owns `loc`/`facing`/
 * `route`/`possession`. The anomaly module DISTORTS travel (e.g. the Mile Road
 * law writes `route.*.behind_mult`, which travel reads when you double back); it
 * never writes travel's slice directly — one authority owns the state.
 */
import { evalPredicate } from '../../sdk/law.js';
import { makeManifest } from '../../sdk/define.js';

const RETURN_WORDS = new Set(['back', 'leave', 'return', 'exit', 'away', 'retreat']);

/** bespoke flavour for the demo's most important pickup (research rule 12). */
function bespokeTake(id: string, name: string): string {
  if (id === 'salvage_core')
    return 'You close your hand around the core. It is warmer than it should be, and it settles into your pack like it has decided to come with you.';
  return `You take the ${name}.`;
}
import type { JsonObject } from '../../sdk/json.js';
import type { Module, ModuleResult, WorldEvent } from '../../sdk/types.js';
import type { WorldPack, ExitDef, EdgeDef, ItemDef } from '../../sdk/worldpack.js';

interface TravelNative extends JsonObject {
  node: string;
  facing: string; // 'forward' | 'behind'
  previous: string | null;
  visited: string[];
  taken: string[]; // item ids removed from the world into inventory
}

export function createTravel(pack: WorldPack): Module {
  const exitsByNode = new Map<string, ExitDef[]>();
  for (const n of pack.nodes) exitsByNode.set(n.id, [...n.exits]);
  const edges = new Map<string, EdgeDef>(pack.edges.map((e) => [e.id, e]));
  const items = new Map<string, ItemDef>(pack.items.map((i) => [i.id, i]));
  const nodeItems = new Map<string, string[]>();
  for (const n of pack.nodes) nodeItems.set(n.id, [...(n.items ?? [])]);
  const start = pack.start.node;

  const manifest = makeManifest({
    id: 'travel.graph',
    content: { nodes: pack.nodes.map((n) => n.id), edges: pack.edges.map((e) => e.id), start },
    source: 'clean-room graph traversal + orientation (uncopyrightable mechanic)',
    license: {
      identifier: 'NONE',
      attribution: 'LOOM original',
      tier: 'green',
      provenance: 'clean-room',
    },
    domain: 'travel',
    priority: 10,
    intents: ['go', 'cross_threshold', 'look_back', 'flee', 'take', 'drop'],
    writesFacts: ['loc', 'facing', 'route', 'possession', 'flag', 'world'],
    readsFacts: ['loc', 'facing', 'route', 'possession', 'flag', 'phase', 'law', 'world'],
  });

  function resolveExit(node: string, target?: string, direction?: string, raw?: string): ExitDef | undefined {
    const exits = exitsByNode.get(node) ?? [];
    const cand = (s?: string) => (s ? s.toLowerCase().trim() : undefined);
    const t = cand(target);
    const d = cand(direction);
    const r = cand(raw);
    return exits.find((e) => {
      const dir = e.dir.toLowerCase();
      const to = e.to.toLowerCase();
      const lab = e.label.toLowerCase();
      return (
        (t && (e.to.toLowerCase() === t || lab.includes(t))) ||
        (d && dir === d) ||
        (r && (dir === r || lab.includes(r) || to.includes(r)))
      );
    });
  }

  return {
    manifest,
    init: (): TravelNative => ({
      node: start,
      facing: 'forward',
      previous: null,
      visited: [start],
      taken: [],
    }),
    claims: (intent) => ['go', 'cross_threshold', 'look_back', 'flee', 'take', 'drop'].includes(intent.class),
    validateLegality: (intent, native, facts) => {
      const n = native as TravelNative;
      const c = intent.class;
      if (c === 'look_back') return { legal: true };
      if (c === 'flee')
        return n.previous
          ? { legal: true, args: { to: n.previous } as JsonObject }
          : { legal: false, reason: 'nowhere to flee to' };
      if (c === 'take') {
        const id = intent.target?.id ?? matchItem(intent.target?.raw);
        const here = nodeItems.get(n.node) ?? [];
        const onGround = id ? facts.getBool(`world.ground.${n.node}.${id}`) === true : false;
        if (id && ((here.includes(id) && !n.taken.includes(id)) || onGround))
          return { legal: true, args: { item: id, ground: onGround } as JsonObject };
        return { legal: false, reason: `there is nothing like that here to take` };
      }
      if (c === 'drop') {
        const id = intent.target?.id ?? matchItem(intent.target?.raw);
        if (id && facts.getBool(`possession.pc.${id}`)) return { legal: true, args: { item: id } as JsonObject };
        return { legal: false, reason: `you are not carrying that` };
      }
      // go / cross_threshold
      const exit = resolveExit(n.node, intent.target?.id, intent.direction, intent.target?.raw ?? intent.raw);
      if (!exit) {
        // generic "back / out / leave / return" -> retrace your steps
        const word = (intent.direction ?? intent.target?.raw ?? intent.raw ?? '').toLowerCase().trim();
        if (RETURN_WORDS.has(word) && n.previous)
          return {
            legal: true,
            args: { to: n.previous, edge: null, label: 'back the way you came' } as JsonObject,
          };
        return {
          legal: false,
          reason: `there is no obvious way ${word ? `"${word}"` : 'like that'} from here — try one of: ${(exitsByNode.get(n.node) ?? []).map((e) => e.dir).join(', ')}`,
        };
      }
      if (exit.when && !evalPredicate(exit.when, facts)) {
        return { legal: false, reason: exit.blockedText ?? 'that way is not passable right now' };
      }
      return {
        legal: true,
        args: { to: exit.to, edge: exit.via ?? null, label: exit.label } as JsonObject,
      };

      function matchItem(raw?: string): string | undefined {
        if (!raw) return undefined;
        const q = raw.toLowerCase();
        for (const [id, it] of items) if (it.names.some((nm) => q.includes(nm.toLowerCase()))) return id;
        return undefined;
      }
    },
    execute: (args): ModuleResult => {
      const n = args.native as TravelNative;
      const c = args.action.intent.class;
      const a = args.action.args as {
        to?: string;
        edge?: string | null;
        label?: string;
        item?: string;
        ground?: boolean;
      };

      if (c === 'look_back') {
        return {
          nativeNext: { ...n, facing: 'behind' },
          events: [
            {
              tag: 'looked_back',
              mutations: [{ op: 'set', key: 'facing.pc', value: 'behind' }],
              summary: 'You stop, and turn, and look back the way you came.',
            },
          ],
          control: { kind: 'continue' },
          render: { labels: ['travel.look_back'] },
        };
      }
      if (c === 'take') {
        const id = a.item!;
        const it = items.get(id);
        const ev: WorldEvent[] = [
          {
            tag: 'took_item',
            mutations: [
              { op: 'set', key: `possession.pc.${id}`, value: true },
              ...(it?.itemClass
                ? ([{ op: 'set', key: `possession.pc.${id}.class`, value: it.itemClass }] as const)
                : []),
              ...(a.ground ? ([{ op: 'delete', key: `world.ground.${n.node}.${id}` }] as const) : []),
            ],
            summary: bespokeTake(id, it?.names[0] ?? id),
          },
        ];
        // taking the core marks you: the Cordon will watch the gate for it on your way out
        if (id === 'salvage_core') {
          ev.push({
            tag: 'core_intercept',
            mutations: [{ op: 'set', key: 'flag.intercepted', value: true }],
            summary:
              'Word of the core moves faster than you can. By the time you turn for home, the Cordon will be watching the gate for exactly what rides in your pack — and the Striders will be watching the Cordon.',
            data: { intercept: true },
          });
        }
        return {
          nativeNext: { ...n, taken: [...n.taken, id] },
          events: ev,
          control: { kind: 'continue' },
          render: { labels: ['travel.take'], entities: [`item.${id}`] },
        };
      }
      if (c === 'drop') {
        const id = a.item!;
        return {
          nativeNext: n,
          events: [
            {
              tag: 'dropped_item',
              mutations: [
                { op: 'delete', key: `possession.pc.${id}` },
                { op: 'delete', key: `possession.pc.${id}.class` },
                { op: 'set', key: `world.ground.${n.node}.${id}`, value: true },
              ],
              summary: `You set the ${items.get(id)?.names[0] ?? id} down. It is here if you want it again.`,
            },
          ],
          control: { kind: 'continue' },
        };
      }

      // movement (go / cross_threshold / flee)
      const to = a.to!;
      const edge = a.edge ? edges.get(a.edge) : undefined;
      // distance, distorted by any anomaly "behind you" multiplier when doubling back
      let cost = edge?.distance ?? 20;
      if (to === n.previous) {
        const mult = behindMult(args.facts, a.edge ?? null);
        if (mult > 1) cost = Math.round(cost * mult);
      }
      const visited = n.visited.includes(to) ? n.visited : [...n.visited, to];
      return {
        nativeNext: { ...n, node: to, previous: n.node, facing: 'forward', visited },
        events: [
          {
            tag: c === 'flee' ? 'fled' : 'moved',
            mutations: [
              { op: 'set', key: 'loc.pc', value: to },
              { op: 'set', key: 'route.last_from', value: n.node },
              { op: 'set', key: 'flag.time_cost', value: cost },
              { op: 'set', key: 'flag.time_cost_turn', value: args.ctx.turn },
            ],
            summary: c === 'flee' ? 'You break away, back the way you came.' : 'You set off.',
            data: { from: n.node, to },
          },
        ],
        control: { kind: 'continue' },
        render: { labels: [`travel.${c}`], hints: { to } },
      };
    },
  };
}

/** read the anomaly-written "behind you" distance multiplier (the Mile Road law). */
function behindMult(facts: { getNumber(k: string): number | undefined }, _edge: string | null): number {
  return facts.getNumber('law.behind_mult') ?? 1;
}
