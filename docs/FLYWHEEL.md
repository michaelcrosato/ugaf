# The flywheel — how LOOM improves itself

Two loops, coupled only through immutable artifacts (sealed builds, `feedback/NNNN.md`). Loop A can never
ship broken work; Loop B can never silently change state. The loop has turned **5 cycles** so far this build
(see `feedback/0001`–`0005`), each one taking real play-signal and consuming it into a gate-passing change.

```
            ┌──────────────────────── LOOP A: BUILD ────────────────────────┐
            │  explore → plan → code → `npm run gate` → commit (sealed build)│
            │  gate = typecheck + boundaries + integrity + tests + coherence │
            │         + golden-tape bit-identical replay. Red ⇒ not sealable.│
            └───────────────▲───────────────────────────────┬───────────────┘
                            │ feedback/NNNN.md               │ sealed build
                            │ (Loop A consumes)              ▼
            ┌───────────────┴───────────────────────────────────────────────┐
            │  LOOP B: PLAYTEST                                              │
            │  1. `npm run playtest`  → persona swarm plays through PROCTOR  │
            │     → transcripts in playtest-runs/, each realness-VERIFIED    │
            │     (nonce chain + wall-clock + bit-identical replay)          │
            │  2. a critique Workflow fans critics over the transcripts +    │
            │     the craft north-star (docs/craft) → structured findings    │
            │  3. synthesis (correlation-aware) → feedback/NNNN.md           │
            └───────────────────────────────────────────────────────────────┘
```

## Turn it yourself

```bash
npm run playtest          # 1. play: 6 personas through PROCTOR -> playtest-runs/*.md (all realness-verified)
                          # 2. critique: run a review Workflow over playtest-runs/ + docs/craft/IF-CRAFT-RESEARCH.md
                          #    -> write the synthesis to feedback/NNNN.md
                          # 3. implement the Top fixes
npm run gate              # 4. seal: every stage must be green (or it is not sealable)
git commit                # 5. commit the cycle (trace feedback -> change in the message)
```

The critique step is an LLM review panel: spin up N critics across design dimensions (fun/dwell, fairness,
parser, prose, balance, replay), each grounded in the transcripts, then synthesize de-duplicated, prioritized
findings. The transcripts are *proof of real play* — the realness oracle makes "I simulated it because I know
the rules" detectable, so the feedback is anchored to sessions that actually happened.

## The honesty bound (unchanged from the design)

- **Correctness** is engine-guaranteed (Tier 1): determinism, replay, non-regression, the named invariants
  K6–K11, the coherence checks. The gate enforces it; nothing ships red.
- **Quality / fun** is a *human-anchorable trajectory* (Tier 2), steered by Loop B — never an oracle. The
  critic swarm is a strong proxy; the design calls for periodic anchoring to **real human ratings** before the
  proxies are trusted to outrank opinion. "Greatest text world" is the direction the flywheel trends toward,
  kept honest by that anchor — not a dated promise.

## What has stopped the flywheel from drifting

- Every change passes the gate (Tier-1 floor) before it is sealed.
- Each cycle's feedback is committed alongside the change, so the audit trail is traceable.
- The critique is correlation-aware: cross-dimension agreement is weighed above single-critic outliers, and
  already-fixed findings are demoted, not re-worked.
