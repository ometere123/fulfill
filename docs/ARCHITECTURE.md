# Architecture

Fulfill is a two-layer settlement system: GenLayer validators classify frozen public evidence, while deterministic contract code handles permissions, time windows, accounting, challenge bonds, and transfers.

## State machine

`ACTIVE → REVIEW_OPEN → PROVISIONAL → SETTLED_*`

Failure or uncertainty takes `REVIEW_OPEN → RETRYABLE → PROVISIONAL` or `RETRYABLE → INCONCLUSIVE_RETURNED` after the bounded review window or attempt limit. A provisional decision may take `PROVISIONAL → CHALLENGED → SETTLED_*`; a stalled challenge falls back to the provisional code and returns the challenge bond.

## Authority boundaries

The promisor chooses a named beneficiary and pre-funds the maximum liability. Sources and outcome rules are frozen at creation. At least one required `PRIMARY` HTTPS source is mandatory. `CORROBORATING` sources cannot override clear primary evidence. The review prompt can output only a frozen outcome code or an explicit non-decision state.

The beneficiary controls only whether review is opened. Evaluation, finalisation, retries and recovery paths are permissionless where practical. No admin can choose an outcome or payout.

## Settlement

For a decided outcome:

`beneficiary payout = escrow_total × payout_bps / 10,000`

The unused escrow returns to the promisor. Storage and accounting are updated before external value transfer.
