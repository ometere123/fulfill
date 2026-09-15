# Live evidence

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
