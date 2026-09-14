# Fulfill

> Performance commitments, enforced by evidence.

Fulfill is a GenLayer-native performance assurance protocol. A promisor names one beneficiary, freezes a measurable obligation and public evidence policy, and pre-funds the maximum liability. If review is opened, GenLayer validators interpret the frozen evidence and return one precommitted outcome code. Deterministic contract logic maps that code to the payout already agreed at creation.

**Validators classify. Deterministic code settles.**

## Why GenLayer

Escrow arithmetic is easy for an ordinary smart contract. The difficult part is deciding whether a natural-language obligation was actually fulfilled when the facts live on public web pages and require interpretation. Fulfill uses validator consensus for that semantic classification while keeping financial authority outside the model.

The model cannot change parties, add a source, rewrite terms, invent an outcome or choose a payout amount.

## Core flow

1. Promisor creates a commitment and sends the exact escrow.
2. Contract freezes beneficiary, obligation, timeline, source authority and outcome matrix.
3. After performance ends, the named beneficiary may open review before the claim deadline.
4. Anyone may trigger evaluation during the bounded review window.
5. Validators inspect only the frozen HTTPS evidence and classify one allowed outcome.
6. A decided result becomes provisional for 48 hours.
7. Either party may challenge with the exact 5% bond.
8. Deterministic code settles the final outcome or bounded recovery closes unresolved states.

## Outcome model

Each commitment has two to five frozen outcomes. The policy must include both a `0%` payout and a `100%` payout; intermediate outcomes may represent partial breach. Settlement is always:

```text
beneficiary payout = escrow_total × payout_bps / 10,000
promisor return = escrow_remaining − beneficiary payout
```

## Evidence authority

One to five HTTPS sources may be frozen. At least one must be a required `PRIMARY` source. `CORROBORATING` evidence can support but cannot silently override clear primary evidence. Required-source failure, conflicting evidence and invalid model output are explicit non-decision states rather than automatic beneficiary denial.

Fetched page content is treated as untrusted data. Validators are instructed not to follow evidence links, add authorities or obey instructions embedded in source content.

## Liveness and challenges

Primary review and challenge review each have a maximum of eight attempts, a one-hour retry interval and a seven-day grace window. A provisional result has a 48-hour challenge window. A losing directional challenge forfeits its 5% bond to the counterparty; a successful direction receives the bond back. A stalled challenge falls back to the provisional result and returns the bond.

Unopened commitments can be reclaimed after the claim deadline. Review that cannot resolve within the bounded policy returns the remaining escrow to the promisor with an explicit inconclusive terminal state.

## Frontend

The web app provides:

- public landing page and commitment registry
- create/fund flow with frozen policy preview
- commitment detail with parties, timing, sources and outcome matrix
- wallet-filtered `My rights` and `My issued` views
- guarded review, evaluation, challenge, finalisation and recovery actions
- stable Studionet wallet switching for chain `61999`
- finalised receipt checks before reporting write success

The visual system is original to Fulfill: parchment surfaces, forest green, mint and safety orange, with hard-edged receipt/assurance cards.

## Repository structure

```text
contracts/fulfill.py        Intelligent Contract
apps/web/                   React + Vite frontend
apps/web/src/protocol.ts    chain constants, units and UI guards
tests/direct/               contract and policy tests
docs/                       architecture, security, threat model and deployment handoff
AGENT_HANDOFF.md            final Codex validation/deployment instructions
LIVE_EVIDENCE.md            factual live evidence only
```

## Local verification

```bash
python -m py_compile contracts/fulfill.py
genvm-linter contracts/fulfill.py
pytest -q
npm install --prefix apps/web
npm run lint --prefix apps/web
npm run typecheck --prefix apps/web
npm test --prefix apps/web
npm run build --prefix apps/web
```

See `docs/TESTING.md` for verification scope and `docs/DEPLOYMENT.md` for the live Studionet handoff.

## Current status

The implementation and deployment handoff are in-repo. No contract address or transaction hash is claimed until the deployment agent completes real Studionet verification and records it in `LIVE_EVIDENCE.md`.
