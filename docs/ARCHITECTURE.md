# Fulfill Architecture

## Product boundary

Fulfill is a funded performance scorecard, not a generic oracle, adjudication court, or administrator-controlled escrow.

The protocol separates three layers:

1. **Frozen policy layer** — parties, timing, evidence catalogue and weighted checks are committed before performance begins.
2. **Semantic assessment layer** — GenLayer validators assess each check only against its declared evidence scope.
3. **Deterministic financial layer** — satisfied check weights are summed and converted to payout by fixed arithmetic.

## Core data model

Each `Commitment` stores:

- funder and recipient;
- title and overall obligation;
- frozen public evidence catalogue;
- frozen weighted check scorecard;
- escrow/accounting state;
- assessment and contest state;
- final score, payout and terminal reason.

Each evidence source contains only:

```text
id
label
url
```

Each scorecard check contains:

```text
id
requirement
weight_bps
source_ids[]
min_available
```

The check weights must total `10_000` bps.

## Assessment flow

The recipient may request assessment only after `assessment_after` and before `request_deadline`.

`assess_commitment` is permissionless once assessment has been requested.

For every check, the contract:

1. loads only the source IDs frozen into that check;
2. renders those public HTTPS pages;
3. counts available scoped sources;
4. returns `SOURCE_UNAVAILABLE` if availability is below `min_available`;
5. asks validators for exactly one of `SATISFIED`, `NOT_SATISFIED`, or `UNRESOLVED`;
6. treats malformed model output as `MODEL_OUTPUT_INVALID`.

Any result other than `SATISFIED` or `NOT_SATISFIED` keeps the assessment unresolved and retryable within bounded limits.

## Deterministic scoring

For a complete assessment:

```text
satisfied_bps = sum(weight_bps for SATISFIED checks)
recipient payout = escrow_total × satisfied_bps / 10_000
funder return = escrow_remaining - recipient payout
```

No model output contains a payment amount or percentage.

## Check-level contest flow

A complete assessment becomes provisional for the contest window.

Either party may submit a JSON array of check IDs. The contract validates that every selected ID is part of the frozen scorecard.

```text
disputed_weight_bps = sum(selected check weights)
disputed_value = escrow_total × disputed_weight_bps / 10_000
bond = disputed_value × CONTEST_BOND_BPS / 10_000
```

Only selected checks are reassessed. If the contest completes, the new check results replace the corresponding provisional results and all untouched checks remain unchanged.

The contester wins the bond directionally:

- recipient contest succeeds if the merged score increases recipient payout;
- funder contest succeeds if the merged score decreases recipient payout.

If a bounded contest stalls, the original provisional score settles and the contest bond is returned.

## Recovery

Fulfill provides deterministic liveness exits:

- `recover_unclaimed`: assessment was never requested by the deadline;
- `recover_unresolved`: requested assessment cannot reach a complete score within attempt/time bounds;
- `finalize_stalled_contest`: contest cannot reach a complete scoped reassessment within attempt/time bounds.

## Storage strategy

The contract keeps commitments in a `TreeMap` keyed by commitment ID and assessment records in a separate `TreeMap` keyed by commitment, phase and round.

Registry views use bounded pagination with a maximum page size of 25.

## Frontend

The frontend mirrors the contract semantics:

- create a source catalogue and weighted scorecard;
- show funder/recipient roles;
- display each check, weight, evidence scope and result;
- allow check selection only while a contest is available;
- query the contract for the exact proportional contest bond before submitting;
- report writes as successful only after a finalised successful receipt.
