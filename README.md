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

Fulfill is deployed on **GenLayer Studionet (chain 61999)**. The canonical contract is
`0x6C20db2862538c5609d598DF31436bB9067488D0`, deployed in transaction
`0x122b47ffe8507408ccd836157a405426b85c5da4fb06e5d7667ed578bbe42beb`.

The production frontend is available at https://the-fulfill.vercel.app. See
[`LIVE_EVIDENCE.md`](LIVE_EVIDENCE.md) for the observed deployment result and post-deployment reads.

## What Fulfill is

Fulfill is a weighted performance escrow for agreements where success is made up of several independently measurable facts. A funder locks GEN before performance begins, defines the recipient and freezes a scorecard, and the recipient earns the portion represented by the checks that are satisfied.

Fulfill is deliberately not a single-verdict guarantee. Each check has its own requirement, weight, authorised evidence sources, and minimum source-availability rule. Scorecard weights must total exactly `10,000` basis points.

## User journey

### For a funder

1. Connect an injected wallet on Studionet.
2. Define the recipient, title, obligation, timeline, evidence catalogue, and weighted checks.
3. Review the scorecard total and fund the exact escrow amount.
4. Monitor the commitment and its assessment state from the registry or detail page.
5. Contest only the check IDs in dispute during the contest window, with a bond proportional to their economic value.
6. Receive the remaining escrow when deterministic settlement or a recovery path completes.

### For a recipient

1. Review the frozen obligation, scorecard, and evidence scope.
2. Perform the obligation during the agreed performance window.
3. Request assessment after the assessment opening time.
4. Inspect each independent result and the provisional fulfilment percentage.
5. Contest selected checks when necessary, or receive the deterministic payout after finalisation.

## Scorecard model

| Field | Purpose |
| --- | --- |
| Check ID | Stable identifier for one performance fact |
| Requirement | Natural-language condition validators evaluate |
| Weight | Economic importance in basis points |
| Source IDs | Frozen evidence sources authorised for this check |
| Minimum availability | Number of scoped sources that must be available |

The contract freezes both the evidence catalogue and every check's source scope at creation. A source authorised for one check does not automatically authorise another check.

## Assessment and settlement

GenLayer validators interpret the frozen public evidence for each check independently. The semantic outcomes are `SATISFIED`, `NOT_SATISFIED`, and `UNRESOLVED`; unavailable evidence and invalid model output remain explicit technical states.

The intelligent-contract layer does not choose money. Settlement is deterministic:

```text
satisfied weight = sum of SATISFIED check weights
recipient payout = escrow × satisfied weight / 10,000
funder return    = remaining escrow
```

Assessments are bounded and respect the configured grace period and retry interval. If an assessment cannot reach a usable result, the contract exposes explicit unresolved recovery paths rather than silently converting uncertainty into a payout.

## Check-level contests

Either party may contest selected check IDs during the contest window. Only those checks are reassessed; untouched results remain unchanged.

```text
disputed value = escrow × disputed weight / 10,000
contest bond   = disputed value × contest_bond_bps / 10,000
```

The frontend shows the selected scope, disputed weight, disputed value, and authoritative bond quote before submission. Contest attempts are bounded, and stalled contests have an explicit finalisation path.

## Contract interface

The deployed contract exposes reads for constants, commitments, checks, sources, assessment records, accounting, and contest-bond quotes. State-changing methods include `create_commitment`, `request_assessment`, `assess_commitment`, `contest_checks`, `resolve_contest`, `finalize_assessment`, `recover_unresolved`, `recover_unclaimed`, and `finalize_stalled_contest`.

There is no privileged admin settlement override. Role checks, timing, scope validation, arithmetic, accounting, and transfers remain deterministic contract logic.

## Wallet and network

The web app uses the injected EIP-1193 provider at `window.ethereum` for connection, account changes, chain changes, network switching, and transaction signing. It does not use MetaMask Snaps, WalletConnect, an embedded wallet, or a separate transaction provider.

| Setting | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com` |
| Contract | `0x6C20db2862538c5609d598DF31436bB9067488D0` |

## Local development

```bash
cd apps/web
npm install
npm run dev
```

For local reads and writes, set the real address in an ignored `.env.local`:

```text
VITE_FULFILL_CONTRACT_ADDRESS=0x6C20db2862538c5609d598DF31436bB9067488D0
```

Never commit environment files, keystores, private keys, or wallet credentials. The stable Fulfill GenLayer CLI is kept separately from any global release-candidate CLI and must always use the explicit Studionet RPC.

## Verification

Contract verification:

```bash
python -m py_compile contracts/fulfill.py
genvm-lint check contracts/fulfill.py --json
genvm-lint validate contracts/fulfill.py
genvm-lint schema contracts/fulfill.py --output /tmp/fulfill.schema.json
PYTHONIOENCODING=utf-8 genvm-lint typecheck contracts/fulfill.py
pytest tests/direct -v
```

Frontend verification:

```bash
cd apps/web
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the contract, web, and hygiene jobs on pushes and pull requests. Live deployment reads and factual deployment records are maintained in [`LIVE_EVIDENCE.md`](LIVE_EVIDENCE.md).

## Repository map

| Path | Purpose |
| --- | --- |
| `contracts/fulfill.py` | Intelligent contract and deterministic settlement |
| `apps/web/src/main.tsx` | React application and wallet-integrated flows |
| `apps/web/src/protocol.ts` | Lifecycle, validation, scoring, and payout helpers |
| `apps/web/src/style.css` | Fulfill visual identity and responsive layout |
| `tests/direct/` | GenVM Direct Mode contract tests |
| `docs/` | Architecture, security, threat, testing, and deployment documentation |
| `LIVE_EVIDENCE.md` | Observed deployment evidence only |
