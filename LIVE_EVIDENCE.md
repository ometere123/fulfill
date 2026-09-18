# Live evidence`r`n`r`n## Retryable non-decision fix deployment

The prior fixed deployment below was superseded after the review identified that `SOURCE_UNAVAILABLE` and `MODEL_OUTPUT_INVALID` were rejected before assessment/contest records and attempt counters were persisted.

- Network: GenLayer Studionet
- Chain ID: 61999
- RPC: https://studio.genlayer.com/api
- Source commit: `c3eeb617a310eb9364ba73024d3506fadd40e5e4`
- Deployment transaction: `0x31ea74526e2453d3c902fb1f4eea434d8cbaeab29e9dfca8c0591200d79d51b1`
- Contract address: `0x6a5c526642F2bd61548427aDC753B35E5b1EFDcA`
- Deployment status: Accepted / SUCCESS / Finalized
- Deployer: active CLI account `praest-deployer` (`0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`)

Verified post-deployment reads through stable GenLayer CLI 0.39.1:

- `policy_version`: `FULFILL_SCORECARD_V2`
- `contest_bond_bps`: `500`
- `contest_window`: `172800`
- `assessment_grace`: `604800`
- `min_retry_interval`: `3600`
- `max_assessment_attempts`: `8`
- `max_contest_attempts`: `8`
- `max_sources`: `8`
- `max_checks`: `8`
- `max_page_size`: `25`
- `get_commitment_counter()`: `0`
- `get_contract_accounting()`: all totals `0`

Production frontend was updated to this address and redeployed at `https://the-fulfill.vercel.app`. The production JavaScript bundle contains the new address and no longer contains the superseded `0x0c850e64E5B6699735c9628507f8f82cDDb108e3` address.

This record contains only observed deployment and read evidence.

## Superseded deployment

- Network: GenLayer Studionet
- Chain ID: 61999
- RPC: https://studio.genlayer.com/api
- Deployment transaction: `0xe29e56802d4582eb71e10f01c165908f525988265b66aedda88e5e5d62bc24b9`
- Contract address: `0x0c850e64E5B6699735c9628507f8f82cDDb108e3`
- Deployment consensus: Accepted
- Execution: SUCCESS
- Final state: Finalized
- Status: Superseded after the first live create attempt exposed `AttributeError: 'str' object has no attribute 'as_bytes'` during commitment storage.

## Fixed canonical contract deployment

- Network: GenLayer Studionet
- Chain ID: 61999
- RPC: https://studio.genlayer.com/api
- Deployment transaction: `0x122b47ffe8507408ccd836157a405426b85c5da4fb06e5d7667ed578bbe42beb`
- Contract address: `0x6C20db2862538c5609d598DF31436bB9067488D0`
- Deployer: `praest-deployer` (`0x0d5540e0aD4B92Aa0ad4e5F1b8cD645ee1E363E7`)
- Deployment receipt: successful / finalized

## Post-deployment reads

Read through stable GenLayerJS on Studionet:

- `get_constants()`:
  - `policy_version`: `FULFILL_SCORECARD_V2`
  - `contest_bond_bps`: `500`
  - `contest_window`: `172800`
  - `assessment_grace`: `604800`
  - `min_retry_interval`: `3600`
  - `max_assessment_attempts`: `8`
  - `max_contest_attempts`: `8`
  - `max_sources`: `8`
  - `max_checks`: `8`
  - `max_page_size`: `25`
- `get_commitment_counter()`: `0` at deployment, later observed as `2` after smoke writes
- `get_contract_accounting()`:
  - Initial read: all accounting fields `0`
  - Later read: `funded`: `2000000000000000`, `remaining`: `2000000000000000`, all other fields `0`
  - `paid`: `0`
  - `remaining`: `0`
  - `returned`: `0`
  - `bonds_locked`: `0`
  - `bonds_received`: `0`
  - `bonds_returned`: `0`
  - `bonds_forfeited`: `0`

## Frontend deployment

- Production URL: https://the-fulfill.vercel.app
- Vercel deployment state: READY
- Verified production response: HTTP 200
- Verified shell: Fulfill title, description, and `/favicon.svg` present
- Production contract address: `0x6C20db2862538c5609d598DF31436bB9067488D0`

## Smoke commitment

Two smoke commitments were observed on the fixed deployment:

- Commitment `1`: `LOCKED`, `0.001 GEN`, recipient `0x81301DD9C3605a7DA743D87b803156d8445620B0`, three checks totaling `10,000 bps`.
- Commitment `2`: `LOCKED`, `0.001 GEN`, recipient `0x81301DD9C3605a7DA743D87b803156d8445620B0`, three checks totaling `10,000 bps`.
- Individual smoke transaction hashes were not exposed by the frontend or recovered from the available RPC log query; none is fabricated here.

## Later live lifecycle observations

- Commitment `6` was created through the production frontend with the funder and recipient wallets, using `0.0001 GEN`, two public HTTPS sources (`genlayer.com` and `docs.genlayer.com`), and three checks totaling `10,000 bps`. Its observed state was `LOCKED`.
- The recipient request window for commitment `6` expired at `2026-09-16 09:04` before an assessment request was submitted. The production detail page reported `Request window expired`; no assessment evidence is claimed.
- Commitment `7` was created through the production frontend with the same two wallets, `0.0001 GEN`, the same public HTTPS sources, and three checks totaling `10,000 bps`. Its observed state was `LOCKED`.
- The recipient successfully requested assessment for commitment `7`; the observed post-request state was `ASSESSMENT_REQUESTED`.
- The permissionless assessment for commitment `7` finalized and was read back from the production contract. Observed check results were `CHECK_1: SATISFIED`, `CHECK_2: UNRESOLVED`, and `CHECK_3: SATISFIED`, for `6,500 / 10,000 bps` (`65%`). Assessment attempts were `1 / 8` and the commitment remained `ASSESSMENT_REQUESTED`.
- No contest, finalization, recovery, payout, refund, or bond result is claimed for commitments `6` or `7`.
- The frontend did not expose the corresponding transaction hashes in the observed UI session, and no hashes are fabricated here.
