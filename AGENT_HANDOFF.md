# Fulfill — Codex deployment handoff

Finish Fulfill from the repository exactly as it exists. Do not redesign the protocol again unless a real blocker is discovered.

## Network requirement

Fulfill is for:

```text
network: GenLayer Studionet
chain ID: 61999
RPC: https://studio.genlayer.com/api
```

Do **not** use 61997.
Do **not** use Studionet-dev.
Do **not** use Bradbury.

## Product model that must be preserved

Fulfill is a weighted performance escrow.

A funder locks GEN before performance starts. The frozen policy contains:

- one recipient;
- an overall obligation;
- a public evidence catalogue;
- weighted fulfilment checks;
- explicit evidence-source IDs for each check;
- timing and recovery bounds.

GenLayer validators assess each check as a fact. They do not choose financial outcomes.

The deterministic settlement formula is:

```text
recipient payout = escrow × satisfied_weight_bps / 10_000
funder return = remaining escrow
```

A contest selects specific check IDs. Only those checks are reassessed. The contest bond is based on the economic value of the disputed weight.

Do not reintroduce:

- whole-commitment outcome codes;
- PRIMARY/CORROBORATING source hierarchy;
- a global challenge-result mechanism;
- admin settlement authority;
- mutable evidence after funding;
- user-supplied evidence at assessment time;
- governance, tokens, NFTs or cross-chain settlement;
- custodial keys.

## Read first

Read in full:

```text
README.md
docs/ARCHITECTURE.md
docs/SECURITY_MODEL.md
docs/THREAT_MODEL.md
docs/TESTING.md
docs/DEPLOYMENT.md
contracts/fulfill.py
apps/web/src/main.tsx
apps/web/src/protocol.ts
```

## Required verification

Run the real repository checks, not a simulated checklist:

```bash
python -m py_compile contracts/fulfill.py
genvm-lint check contracts/fulfill.py --json
genvm-lint validate contracts/fulfill.py
genvm-lint schema contracts/fulfill.py --output /tmp/fulfill.schema.json
PYTHONIOENCODING=utf-8 genvm-lint typecheck contracts/fulfill.py
pytest tests/direct -v

cd apps/web
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Fix any genuine failures before deployment. Preserve unrelated working code.

## Deployment

Deploy `contracts/fulfill.py` to Studionet 61999 from the already-funded deployment wallet available to the owner.

If an owner signature/approval is required, stop only at that approval boundary; after approval, continue the deployment and verification workflow.

After finalised deployment:

1. record the actual contract address and transaction hash;
2. call `get_constants()` and verify `FULFILL_SCORECARD_V2`;
3. call `get_commitment_counter()` and `get_contract_accounting()`;
4. configure `VITE_FULFILL_CONTRACT_ADDRESS` with the real address;
5. build and deploy the frontend;
6. run a small real 61999 smoke flow;
7. record only real finalised evidence in `LIVE_EVIDENCE.md`.

## Smoke-flow expectations

Create a small commitment with at least two checks totalling exactly 10,000 bps and at least one public HTTPS source.

Verify that:

- funder and recipient are stored correctly;
- source catalogue and check scopes round-trip correctly;
- exact escrow remains locked initially;
- only the recipient can request assessment;
- assessment results are stored per check;
- incomplete/unresolved assessment does not silently settle;
- `quote_contest_bond()` prices a strict subset from its disputed weight;
- if a scoped contest is exercised, untouched check results remain unchanged;
- terminal accounting matches the actual payout and returned remainder.

## RPC discipline

Studionet has request-rate constraints. Throttle receipt/status polling and avoid tight loops.

## Evidence discipline

Do not write fake hashes, addresses, screenshots, states or deployment claims.

A submitted transaction is not enough. Treat success as real only after the receipt is finalised and the expected committed state can be read back.

## UI

Keep the existing Fulfill visual direction: parchment base, dark forest interface colour, orange emphasis and hard-edged bordered cards.

The UI must continue to communicate the distinctive scorecard model:

- weighted checks;
- scoped evidence per check;
- visible check results;
- selected-check contesting;
- proportional contest-bond quote;
- deterministic fulfilment percentage.

Do not copy another product's branding or interface.
