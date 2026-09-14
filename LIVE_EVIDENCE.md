# Live evidence

This record contains only observed deployment and read evidence.

## Canonical contract deployment

- Network: GenLayer Studionet
- Chain ID: 61999
- RPC: https://studio.genlayer.com/api
- Deployment transaction: `0xe29e56802d4582eb71e10f01c165908f525988265b66aedda88e5e5d62bc24b9`
- Contract address: `0x0c850e64E5B6699735c9628507f8f82cDDb108e3`
- Deployment consensus: Accepted
- Execution: SUCCESS
- Final state: Finalized

## Post-deployment reads

Read through the isolated stable GenLayer CLI 0.39.1 with the Studionet RPC:

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
- `get_commitment_counter()`: `0`
- `get_contract_accounting()`:
  - `funded`: `0`
  - `paid`: `0`
  - `remaining`: `0`
  - `returned`: `0`
  - `bonds_locked`: `0`
  - `bonds_received`: `0`
  - `bonds_returned`: `0`
  - `bonds_forfeited`: `0`

## Frontend deployment

- Production URL: https://web-three-pi-nr0xb6dnug.vercel.app
- Vercel deployment state: READY
- Verified production response: HTTP 200
- Verified shell: Fulfill title, description, and `/favicon.svg` present
- Production contract address: `0x0c850e64E5B6699735c9628507f8f82cDDb108e3`

## Smoke commitment

No smoke commitment transaction was recorded. No commitment was created on the canonical deployment during this verification, consistent with the observed counter and zero accounting totals above.
