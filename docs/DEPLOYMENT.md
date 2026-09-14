# Fulfill Deployment

## Required network

Deploy Fulfill to **GenLayer Studionet**, chain ID **61999**.

```text
RPC: https://studio.genlayer.com/api
Explorer: https://explorer-studio.genlayer.com
```

Do not use Studionet-dev / chain `61997` and do not use Bradbury for this project.

## Pre-deployment gate

Do not deploy until the repository's `main` branch CI is green for:

- Python compile;
- `genvm-lint check`;
- `genvm-lint validate`;
- schema generation;
- GenVM typecheck;
- Direct Mode pytest;
- frontend lint;
- frontend TypeScript check;
- frontend Vitest;
- production frontend build;
- hygiene checks.

## Contract to deploy

```text
contracts/fulfill.py
```

Expected policy version:

```text
FULFILL_SCORECARD_V2
```

## Post-deployment reads

Immediately verify:

```text
get_constants()
get_commitment_counter()
get_contract_accounting()
```

`get_constants()` must report the scorecard policy version, contest-bond basis points, retry bounds, and maximum checks/sources.

## Frontend configuration

After the deployment is finalised, set:

```text
VITE_FULFILL_CONTRACT_ADDRESS=<real 61999 contract address>
```

Then rebuild the web app and deploy it.

Do not hard-code an address before the deployment receipt is finalised.

## Smoke path

Use a small real test commitment on 61999 with at least two weighted checks whose weights total `10_000`.

Recommended smoke sequence:

1. create commitment with exact escrow;
2. read back the funder, recipient, source catalogue and checks;
3. confirm `status_label` is `LOCKED`;
4. when the configured time allows, recipient calls `request_assessment`;
5. run `assess_commitment` and inspect the stored per-check result JSON;
6. if the result is complete, call `quote_contest_bond` for a strict subset of checks;
7. either exercise a scoped contest or allow the contest window to expire;
8. finalise and verify payout/return accounting.

## Receipt discipline

The frontend and deployment agent must not equate transaction submission with success.

Wait for a finalised receipt and confirm successful execution before recording a deployment or state transition as successful.

Throttle Studionet RPC receipt polling. Do not use tight polling loops that risk the request-rate limit.

## Evidence

Update `LIVE_EVIDENCE.md` only with facts observed from the live deployment:

- network and chain ID;
- contract address;
- deployment transaction hash;
- deployment receipt status;
- selected interaction transaction hashes;
- relevant committed-state reads;
- deployed frontend URL.

If any item was not actually observed, leave it unclaimed.
