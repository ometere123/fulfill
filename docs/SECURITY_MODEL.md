# Security model

## Enforced properties

- exact escrow funding; underpayment and overpayment are rejected
- immutable beneficiary, terms, sources, timing and outcome matrix after creation
- at least one required `PRIMARY` public HTTPS source
- local/private host patterns, URL credentials, fragments and custom ports are rejected
- model output is restricted to frozen outcome codes or explicit non-decision states
- the model never selects an amount; deterministic basis-point arithmetic does
- one bounded challenge with an exact 5% bond
- primary and challenge review attempts are rate-limited and capped
- review and challenge liveness have explicit terminal recovery paths
- terminal states cannot settle twice
- escrow and challenge-bond accounting are tracked separately
- list reads are bounded to 25 records

## Trust assumptions

Public web evidence can change, disappear or contain hostile instructions. Validators independently retrieve it. A source being listed does not make it true; the frozen authority model only constrains which sources may be considered and how conflicts are treated. DNS rebinding and upstream compromise remain external risks, so production commitments should prefer stable HTTPS origins under known operators.

A contract result is a consensus classification under the frozen policy, not a legal judgement, identity proof, or guarantee that an external actor performed an off-chain action.
