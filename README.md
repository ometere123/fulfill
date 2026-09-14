# Fulfill

Fulfill is a GenLayer-native **weighted performance escrow**.

A funder locks GEN before performance begins and freezes a scorecard describing what successful performance means. Each scorecard check has:

- a measurable natural-language requirement,
- a weight in basis points,
- an explicit set of allowed public evidence-source IDs, and
- a minimum number of those sources that must be available.

After performance, the recipient requests assessment. GenLayer validators assess each check independently as `SATISFIED`, `NOT_SATISFIED`, or `UNRESOLVED`. The intelligent-contract layer interprets evidence; it does **not** choose money.

The settlement rule is deterministic:

```text
recipient payout = escrow × satisfied_weight_bps / 10_000
funder return    = remaining escrow
```

If a party disagrees, it contests specific check IDs rather than reopening the entire commitment. The contest bond is calculated from the value represented by those disputed checks.

## Why Fulfill needs GenLayer

Escrow arithmetic is easy for an ordinary smart contract. The difficult part is determining whether a real-world requirement such as delivery timing, service quality, an SLA threshold, or another natural-language performance condition was actually met by the frozen evidence.

Fulfill narrows that non-deterministic authority:

1. the evidence catalogue is frozen before performance;
2. every check declares exactly which source IDs validators may use;
3. validators return only fact labels for each check;
4. unresolved or unavailable evidence never silently becomes a financial decision;
5. deterministic contract code sums satisfied weights and calculates settlement.

## Protocol model

Lifecycle:

```text
LOCKED
  -> ASSESSMENT_REQUESTED
  -> ASSESSED
      -> FINALIZED
      -> CONTESTED -> FINALIZED

LOCKED -> RECOVERED                 (no assessment requested in time)
ASSESSMENT_REQUESTED -> RECOVERED   (bounded unresolved assessment)
```

An assessment that still contains unresolved checks remains `ASSESSMENT_REQUESTED` and may be retried subject to the retry interval and attempt cap.

### Scorecard example

```json
[
  {
    "id": "DELIVERY_TIME",
    "requirement": "delivery completed before the agreed deadline",
    "weight_bps": 4000,
    "source_ids": ["TRACKING"],
    "min_available": 1
  },
  {
    "id": "QUANTITY",
    "requirement": "delivered quantity meets the agreed minimum",
    "weight_bps": 3500,
    "source_ids": ["TRACKING", "WAREHOUSE_RECORD"],
    "min_available": 1
  },
  {
    "id": "QUALITY",
    "requirement": "the inspection threshold is met",
    "weight_bps": 2500,
    "source_ids": ["INSPECTION"],
    "min_available": 1
  }
]
```

All check weights must total exactly `10_000` basis points.

## Check-level contesting

After a complete assessment, either party may select one or more check IDs to contest during the contest window.

```text
disputed value = escrow × disputed_weight_bps / 10_000
contest bond   = disputed value × 5%
```

Only the selected checks are reassessed. Their replacement results are merged into the original scorecard before deterministic settlement.

## Liveness and safety

Fulfill includes:

- exact escrow funding;
- funder/recipient separation;
- no post-creation mutation of the scorecard or evidence catalogue;
- no backfilling commitments after performance has started;
- bounded assessment and contest attempts;
- minimum retry intervals;
- explicit unavailable/invalid/unresolved states;
- scoped contests;
- proportional contest bonds;
- bounded registry reads;
- separate escrow and bond accounting;
- state/accounting updates before external transfers;
- recovery paths when assessment cannot complete.

See `docs/SECURITY_MODEL.md` and `docs/THREAT_MODEL.md` for the full trust model.

## Network

Fulfill targets **GenLayer Studionet**:

```text
chain id: 61999
rpc: https://studio.genlayer.com/api
explorer: https://explorer-studio.genlayer.com
```

Do not substitute Studionet-dev / chain `61997`.

## Repository

```text
contracts/fulfill.py           intelligent contract
apps/web/                      React + Vite frontend
tests/direct/                  GenVM Direct Mode tests
docs/ARCHITECTURE.md           protocol architecture
docs/SECURITY_MODEL.md         security and trust boundaries
docs/THREAT_MODEL.md           adversarial analysis
docs/TESTING.md                verification procedure
docs/DEPLOYMENT.md             61999 deployment handoff
LIVE_EVIDENCE.md               deployment evidence only when real
AGENT_HANDOFF.md               final Codex deployment handoff
```

## Verification

Contract checks:

```bash
python -m py_compile contracts/fulfill.py
genvm-lint check contracts/fulfill.py --json
genvm-lint validate contracts/fulfill.py
genvm-lint schema contracts/fulfill.py --output /tmp/fulfill.schema.json
PYTHONIOENCODING=utf-8 genvm-lint typecheck contracts/fulfill.py
pytest tests/direct -v
```

Frontend checks:

```bash
cd apps/web
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the same verification on every push and pull request.

## Deployment status

The repository does not invent deployment evidence. Until `LIVE_EVIDENCE.md` contains real finalised transaction hashes, a real contract address and successful post-deployment reads, treat Fulfill as **built and verified but not yet deployed**.
