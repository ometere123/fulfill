# Codex handoff

Finish Fulfill from this repository rather than redesigning its product scope.

## Non-negotiable product boundaries

- product name: **Fulfill**
- target network: **GenLayer Studionet, chain ID 61999**
- preserve the performance-assurance model: promisor funds escrow, beneficiary opens review, validators classify frozen public evidence, deterministic code settles
- keep payouts deterministic from the frozen outcome matrix
- do not add admin settlement authority, claimant-selected post-creation evidence, governance, tokens, NFTs, cross-chain settlement or custodial key handling
- retain the original light parchment / forest / orange visual system and current UX structure

## Work still expected from the deployment agent

Run the real dependency install, GenVM checks, Direct Mode tests, frontend lint/typecheck/tests/build, contract validation/schema generation, deployment, live transaction verification, evidence capture and web deployment. Fix any compatibility issue revealed by the current toolchain rather than bypassing a failing check.

A successful transaction must be reported only when the receipt is final/accepted and the expected committed state is observable afterward. Throttle hosted Studionet RPC polling and avoid tight receipt loops.
