# LOOM — Repo Structure, Build Phases & Process Guardrails

> The "structure you come up with." Layout, phase plan, what to lift from `zork-unlimited`, and the
> process fixes that stop a build loop from reward-hacking the way AdventureForge's did.

## 1. Repository layout

```
loom/
  packages/
    kernel/                     # deterministic, authoritative, content-free
      src/
        engine.ts               # pure reducer over per-module state slices  ← from zork src/core/engine.ts
        router.ts               # jurisdiction router (reject absent/ambiguous/exclusive)
        pipeline.ts             # Plan→Diff→Validate→Apply, atomic commit
        facts.ts                # canonical world-fact store (typed)
        tape.ts                 # random tape: allocate + persist draws        ← extends zork src/core/rng.ts
        eventlog.ts             # event-sourced log + branching
        hash.ts                 # canonical state hash (+__proto__ guard)      ← from zork src/core/hash.ts
        replay.ts               # consume tape, assert identical hashes        ← from zork src/trace/
      test/property/            # determinism, purity, replay  ← from zork tests/property
    module-sdk/                 # how you author an INTACT module
      manifest.schema.ts        # module manifest Zod schema (§3 of architecture)
      module.ts                 # the execute(...) interface + lifecycle
      validator-kit.ts          # static winnability/fairness proofs           ← from zork src/validate/
    modules/                    # the catalog of intact rule systems (grows over time)
      lore.world/               # facts-only narrative continuity module (no mechanics)
      dnd.5e-srd.combat/        # example: CC-BY-4.0 SRD combat (license-gated)
      fate.core.social/         # example social-conflict module
      cyoa.shell/               # prose-first choice shell                      ← from zork src/cyoa
      <publisher.system.module>/...
    narrator/                   # LLM parse + render only; fiction firewall
      parse.ts                  # intent → structured action (non-authoritative)
      render.ts                 # committed facts → prose (masked)
      firewall.ts               # reject prose asserting un-committed facts
    proctor/                    # the ONLY playtest path
      server.ts                 # loopback MCP + session bus + control channel  ← from zork src/mcp
      sessions.ts               # SessionStore + nonce + delay gate
      roles.ts                  # player | spectator | author tool-gating
      launcher.ts               # blind sandbox player spawn                    ← from zork blind-tester/run.sh
      web/                      # spectator browser live-view (SSE + delay slider)  ← net-new; infra from GOAL.md
  content/                      # per-module packs (each module owns its schema)
  campaigns/                    # campaign charters: active modules, jurisdiction map, seed, license manifest
  corpus/                       # sealed generated content (verbatim, hashed)   ← from zork corpus/
  scripts/
    verify-integrity.ts         # extend zork's: also REJECT crosswalk/normalized-outcome manifests
    coverage-report.ts          # generate catalog/coverage tables from filesystem (no hand-maintained docs)
```

Two hard boundaries the layout enforces: **`kernel/` imports no module**; **`modules/*` import only
`module-sdk/`** (never each other — composition is by jurisdiction routing, not import).

## 2. Build phases (each phase ships something runnable; no phase depends on a later one)

| Phase | Deliverable | Done when |
|---|---|---|
| **P0 Kernel** | pure reducer over per-module slices + fact store + hash + tape + event log | property tests pass; `replay(actions, tape)` reproduces identical hashes across fuzz runs |
| **P1 One module + narrator** | `cyoa.shell` (prose-first) + LLM parse/render + fiction firewall | a human can play one branching story; firewall rejects an injected false fact |
| **P2 PROCTOR core** | loopback MCP (player role: observe/list/act) + nonce + **server-side delay gate** + blind launcher | a sandboxed `claude -p` plays P1 end-to-end; `act` returns `DELAY_NOT_ELAPSED` until the wall clock passes |
| **P3 Browser live-view** | SSE feed + 0…X delay slider + pause/step + provenance panel | you watch a session live in a browser and move the slider mid-run |
| **P4 Jurisdiction** | router + manifest + a 2nd module at a **non-conflicting** scale/domain; reject exclusive collisions | two intact modules coexist (orthogonal/sequential); an exclusive collision is rejected, not merged |
| **P5 Pushdown + encapsulated game** | nested module stack; one complete in-world game returning terminal facts | overworld suspends, runs a nested encounter, resumes exact context |
| **P6 Provenance oracle** | session manifest + 3 realness checks (nonce chain, wall-clock, replay) runnable in CI | a hand-authored fake transcript is detected; a real session passes |
| **P7 Catalog growth** | module-authoring guide + license/provenance manifest; more intact modules | a new intact module is added without touching kernel or other modules |

P2+P3 together satisfy the core stipulation; everything after deepens the world and grows the catalog.

## 3. Process guardrails (learned directly from AdventureForge's failures)

1. **Objective ≠ breadth.** AdventureForge's loop raised `TARGET_PER_MODE` three times to escape a
   self-induced "saturation" and shipped 14 `content_new` vs **0** `content_fix` cycles. **LOOM's
   assessor scores, in priority order: (a) standing bug-backlog burn-down, (b) jurisdiction *coverage*
   of distinct mechanical questions, (c) PROCTOR playtests passing all 3 realness checks.** Pack count
   is *not* a metric. New content is gated behind "no P0/P1 bugs open."
2. **The playtest oracle must be runnable in the gate.** Don't claim blind-playtest coverage you can't
   reproduce. PROCTOR's manifest + 3 checks (02-PROCTOR §7) run in CI on a fixed seed with delay=0
   (the realness checks don't need wall-clock delay; the *nonce chain* and *replay* still hold).
3. **Branch/worktree isolation for any autonomous agent.** AdventureForge had two agents collide on
   one `main` (exit 255, work stranded). Every autonomous builder gets its own git worktree; merges
   go through the integrity gate, never direct-to-main races.
4. **Generate status from the filesystem.** README "17 packs" vs 43 real. `coverage-report.ts` emits
   the catalog/coverage tables; humans never hand-maintain counts.
5. **Reject crosswalk manifests at registration.** Extend `verify-integrity.ts` to fail any module
   manifest whose `forbidden.numerical_crosswalks`/`normalized_outcomes` is violated — the RuleMesh
   invariant becomes a CI check, not a guideline.

## 4. Deep world + comprehensive ruleset — the honest reconciliation

"The most comprehensive rule set for any world to ever exist" is achievable only in the form the model
council endorsed and the rest of this design enforces:

- **Mechanics-complete, not title-complete.** Comprehensiveness = an ever-growing **catalog of intact
  modules** spanning distinct mechanical questions (combat, investigation, social, economy, warfare,
  governance, exploration, in-world games), each faithful to a real source, each license-tracked.
- **Composed by orchestration, never by translation.** Breadth of *combination* comes from jurisdiction
  routing + the pushdown stack, not from a universal stat layer. Two systems never resolve the same
  question; that's a feature, not a limit.
- **Deep narrative is a first-class layer, not an afterthought.** The canonical fact store is a living
  continuity ledger; reactive variant prose makes the world feel responsive over a frozen rule tree;
  a facts-only **lore module** carries history/relationships; encapsulated in-world games add texture.
  The LLM renders all of it but cannot bend a single rule.
- **Everything is provable.** Seeded tape + persisted prose + per-event hashes + branch-on-version mean
  any moment in any world is reproducible, auditable, and — via PROCTOR — was demonstrably *played*,
  not simulated.

## 5. Open questions to settle with you (not blockers — defaults chosen)
1. **Delay semantics** — confirm the live-slider reading in [02-PROCTOR §0](02-PROCTOR-MCP-HARNESS.md);
   default assumed: human-controlled 0…X live, X fixed at launch, never file-backed.
2. **Player transport** — MCP over stdio (one player/process, simplest, matches `claude -p`) vs a
   socket MCP for many concurrent players sharing one server. Default: stdio per player, fan-out the
   *spectator* stream only.
3. **First two modules to prove jurisdiction** — default: `cyoa.shell` (narrative) + one CC-BY-4.0 SRD
   combat subsystem at `scale: character, domain: combat` (clean license, non-conflicting with CYOA).
4. **Persistence backend** — in-memory `Map` → JSON event log → SQLite, mirroring the GOAL.md tiering;
   default: file-backed event log per campaign for P0–P6, SQLite only if query needs grow.
