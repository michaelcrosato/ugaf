# LOOM — Executable Invariants Addendum (post-`c.md` council + repo-verified market intel)

> **Status:** The council's central recommendation was *"approve the architecture; issue a short Executable
> Invariants Addendum, not another redesign."* This is that addendum. It adds **named, falsifiable invariants
> K6–K11**, the **first milestone** (a hostile kernel vertical slice), and the **repo-verified market reality**
> that re-bases the local-vs-frontier and tooling decisions.
> **Date:** 2026-06-19
> **Inputs:** the 5-model council + Codex + Gemini reviews in `c.md` (weighted by consensus; lone claims
> verified), and a repo-grounded fact-check (run `w4btmq1fi`) of every current-AI claim.
> **Verdict it encodes:** *conditional GO* — focused platform hardening, no product redesign.

---

## 0. Terminology canon (replaces the liability language)
"Irrefutably sound" is **retired as an acceptance criterion** (unfalsifiable). Use instead:
- **"Mechanically verifiable where deterministic."** Reserve the word **"oracle"** for **exact replay /
  regression only.**
- Everything else is a **named, falsifiable invariant** (below) or a **bounded test claim** with a stated
  pass condition. No global "soundness" claims.

## 1. Executable invariants (typed canon — gate-blocking)

| # | Invariant | What it forbids / requires | Why (council consensus) |
|---|---|---|---|
| **K6** | **Deterministic *n*-law composition** | When ≥2 effects interact (primary + ≤2 secondary), resolution must use a **canonical fold order OR an n-ary resolver** that is associative over its domain. The "quantitative-coupling check" is non-executable until **units, domains, ordering, clamping, overflow, and failure behavior** are defined. | A pairwise category matrix does not resolve 3-way interaction; different fold orders → different states. (Model 5, high; Model 2 corroborates.) |
| **K7** | **Transactional scheduler + canonical event order** | Define **phase order, staged writes, atomic transaction boundaries, rollback, same-beat tie-break, and complete scheduler/RNG capture.** Specify what happens when travel-completes + night-begins + a law-triggers + a summon-acts + drift-changes-a-law + a nested-fuse-expires **on the same beat.** | Seeds+hashes+tapes are not determinism without execution semantics; two conforming impls otherwise diverge. (Model 5, high — "foundational, not polish.") |
| **K8** | **No irreversible/lethal outcome from uncertain intent** | Uncertainty is **monotonic**: as parser confidence falls, the **maximum permissible consequence severity falls, never rises.** An `UNCLASSIFIED` / low-confidence / disagreeing / out-of-domain parse may produce reversible friction, extra tells, lost tempo, or a safety hold — **never** death, permanent disability, or irreversible state loss. A **clarification circuit breaker** bounds clarify loops; its fallback is reversible + non-lethal. | The highest-priority safety fix — precision gating is meaningless if an exhausted clarify budget authorizes a lethal *guess*. (Model 5 K8 + Model 4 circuit-breaker; high.) |
| **K9** | **Complete run-identity & sandbox manifest** | Every recorded run captures **model id+version, exact prompt, tool/runtime versions, container image, binary, policy, plugins, MCP identities** — not merely the resolved intent token. | Replay and leak investigations need full identity; the intent token alone is insufficient. (Model 5, high.) |
| **K10** | **Bounded declarative arming-guard language** | Static arming guards (`{condition → specialist}`) must be expressed in a **bounded, declarative, analyzable** guard language — **no arbitrary scripts as predicates** — so the boot-time collision audit can quantify over a finite, decidable set. | "Author-declared" is not analyzable if arbitrary code is permitted. (Model 5, high.) |
| **K11** | **Split licensed-source fidelity from clean-room conformance** | Two **different** provenance + acceptance gates: (a) *licensed-source fidelity* (e.g. reproduce open SRD text/behavior) and (b) *clean-room behavioral conformance* (mechanic reimplemented in our own words). A bit-for-bit `source_fidelity` test on a clean-room module would be **evidence the expressive source was copied** — never run it there. | Conflating them can undermine the clean-room defense for a commercial product. (Model 5, high.) |

These join the existing acceptance set (deterministic_replay, no_llm_state_mutation, jurisdiction_collision,
hidden_information, no_crosswalks, frozen_module_versions, source_fidelity, fixed_role_preservation [deferred —
single-player]).

## 2. The FIRST milestone — a hostile kernel vertical slice (build this before any Cordon's Edge content)
The dominant failure mode the reviewers flagged: *"a 12-doc control system for a thing that hasn't shipped a
vertical slice."* So the first executable target is a **deliberately hostile kernel slice**, not content:

> **one ambiguous lethal command · three interacting effects · multiple same-beat events · one nested frame ·
> one failed-invariant rollback · exact replay.**

**Acceptance:** the slice exercises K6 (3-way compose), K7 (same-beat order + rollback), K8 (the ambiguous
lethal command resolves to a reversible non-lethal outcome), and golden-tape exact replay — and passes. **Only
then** build the 3 Cordon's Edge anchor laws and turn on agent swarms. Also ship the minimal end-to-end loop:
*deterministic kernel + 3 laws + 1 parser stub + ~20 golden tapes + 1 PROCTOR run + 1 human playtest + 1
feedback file consumed into a passing change* — everything else is second-order until that exists.

## 3. Loop A throughput model + the smoke player goes ASYNC
Frontier agents now generate work faster than a synchronous gate can validate, and an **in-gate smoke player on
every commit decimates throughput** (MTTR in hours). Therefore:
- **Move the smoke player OFF the synchronous merge critical path** — run it **async / bounded-horizon**; a
  fast deterministic legality+invariant check stays synchronous, the full play-session is post-merge.
- **Define the throughput math:** max parallel speculative branches, queue depth limits, per-task token budget,
  measured average gate time, and explicit **abort criteria**. The serialized merge-regate remains the
  single-writer correctness point and the true throughput ceiling.

## 4. PROCTOR: internal typed protocol is the contract; MCP is an adapter
LOOM's stable interface is the **internal typed player protocol** (`observe / list_legal_actions / act` +
`turn_nonce` + server-side delay). **MCP is a thin transport adapter behind it**, because MCP is mid-rewrite:
the **2026-07-28 spec Release Candidate is "the largest revision since launch"** (session model removed, error
code change, JSON Schema 2020-12, OAuth/OIDC), and Codex/Claude Code ship near-daily MCP auth/routing fixes.
**Pin the MCP version**; add an **adapter-conformance canary** to the gate; re-pin deliberately when the RC lands.

## 5. Tell-sufficiency that scales + parser robustness
- **Tell-sufficiency must not gate every new law on a human** (that kills autonomy). Use a **programmatic
  deducibility heuristic** as the autonomous gate (e.g., a held-out *tells-only* panel reaching the law
  above-chance, plus a semantic tell↔law-mechanic similarity check); **humans validate the anchor laws + a
  rolling sample and *calibrate the heuristic*** — they are not in the loop for every law.
- **Parser (Tier-1.5, on the lethality path) needs frontier-tier quality + robustness:** a precision-AND-recall
  ground-truth set (adversarial near-misses that must NOT fire a lethal trigger), **inter-run variance testing**
  (repeat identical input+seed — aggregate accuracy can hide run-to-run instability), and a **semantic-drift
  detector** (a static ground-truth set drifts OOD as Loop A authors novel laws/vocabulary).

## 6. Sandbox hardening (repo-verified tool reality)
- **OS-enforced allow-list** (container/namespace/seccomp or locked-down user): **no repo filesystem read,
  network deny-by-default** except the loopback player socket. Capability denied by construction, independent
  of agent-CLI tool names.
- **Mount MCP config read-only; disable dynamic plugin/MCP discovery** inside blind-player envs (a loopback
  socket isn't enough if the agent can rewrite server config or load plugins).
- **Per-run canary secrets + filesystem-egress tests + a blind-leak detector** (the realness oracle proves a run
  was LIVE, not BLIND); **per-runtime permission regression tests**; a **replayable sandbox manifest** (K9).
- **Tool-surface change ⇒ re-audit trigger:** version pinning is insufficient unless an upgrade *invalidates*
  prior sandbox + tool-taxonomy certification (treat like a golden-tape fingerprint bump).
- **Persistent agent memory invalidates "blind"** across sessions → fresh identities, isolated storage,
  memory-disabled runs, OR an explicit *retained-memory* test cohort kept separate.
- **Op note:** Claude Code 2.1.183 **blocks destructive git** (`reset --hard`, `checkout -- .`, `clean -fd`,
  `stash drop`) unless explicitly requested — Loop A worktree-discard / merge-rollback automation must opt in.
  Nested subagent fan-out is capped at **5 levels** — design the play-swarm orchestration within that bound.

## 7. Market reality (repo-grounded, mid-2026) — re-bases local-vs-frontier & tooling
*All structural/existence/spec claims confirmed against primary sources; benchmark %s treated as marketing-grade
and NOT load-bearing.*
- **Loop A (build/architect/parser) → a current FRONTIER capability-class coder.** GPT-5.5 (400K Codex / 1M API),
  Claude Opus 4.8 (1M ctx, 128K out, long-horizon agentic), and Gemini 3.5 Flash (1M ctx) all exist and target
  long-horizon agentic coding. On the hard, uncontaminated bench (SWE-Bench Pro) even the best is ~low — i.e. the
  **"C+ ceiling" is real**, which is *exactly why* the complex compositional kernel needs the strongest available
  coder + the periodic architect pass. **Select by capability class (1M-context + top agentic-coding tier),
  swappable across all three vendors; never hard-code a model or a benchmark %.**
- **Loop B (player swarm) → "cheap/open-weight, self- OR cloud-hosted," NOT literally "local."** The single
  load-bearing factual correction: a useful-quality open-weight swarm (**DeepSeek-V4-class**, MIT, real) needs
  **rented multi-GPU** (~multi-80GB VRAM; no single-consumer-GPU config). **Truly-local small models are a
  *degraded fallback*** whose tool-use competence on the constrained `observe/list/act` interface is weakest —
  **pilot it (score against the §4.4 human anchor + §4.5 affordance-poverty) before trusting their feedback.**
  Do **not** name Llama 4 as the swarm engine (its gap-closing numbers were an unreleased experimental variant).
- **"No API keys / loopback-only" stays the DEFAULT, not an absolute** — capable models (frontier *or*
  DeepSeek-V4-class) need egress or rented hardware; the sandbox's deny-by-default egress applies to *players*,
  while *build-agents* may need provider egress.
- **Orchestration AROUND LOOM** (running agents, not LOOM's in-engine scheduler, which stays self-implemented):
  prefer **CrewAI or LangGraph**; **do NOT pick `microsoft/autogen`** (declared maintenance mode since ~Apr 2026)
  — use Microsoft Agent Framework if a MS-stack orchestrator is wanted.
- **Citation hygiene (don't depend on these):** "Antigravity CLI 2.1.4" (real CLI is 1.0.x; 2.x is the desktop
  app), the "June-2026 PDVA/POMDP preprint" (resolves to nothing — already purged), a Codex "token-based credit
  system" (it's rate-limit reset banking), "GA Goal mode," and general "Computer Use on Windows" (Enterprise-
  gated) are unverified/embellished. **Google Antigravity is real** (a Claude-supporting agent IDE) — Model 1 was
  wrong to say it doesn't exist. Add a **source-at-write-time provenance gate** (primary link required) so a
  fabricated citation can't enter the spec again.

## 8. Stage-specific gates (not "everything is P0")
- **K6–K8** block a kernel claiming deterministic, trustworthy lethal-law execution.
- **Sandbox + complete run manifest (K9)** block admitting blind agents as evidence.
- **Tell-sufficiency** blocks sealing an anchor law as fair/learnable.
- **Longitudinal human testing** blocks dwell/retention/mastery claims — **not** building the mechanical demo.
- **Licensing provenance (K11)** is a commercial-release blocker, established early so content isn't built on
  unusable material.
