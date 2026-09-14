# Security model

## Enforced properties

- exact escrow funding; underpayment and overpayment are rejected
- commitments must be created before their performance window starts
- immutable beneficiary, terms, source policy, timing and outcome matrix after creation
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

Public web evidence can change, disappear or contain hostile instructions. Validators independently retrieve it. A source being listed does not make it true; the frozen authority model only constrains which source URLs may be requested and how declared source roles are treated.

The current GenLayer web renderer follows HTTP redirects without exposing the effective final URL to contract code. Fulfill therefore cannot trustlessly prove that rendered content stayed on the originally named host. A frozen source implicitly trusts that source operator's redirect behaviour. Commitments should use stable HTTPS origins under known operators, and redirect-sensitive sources should be avoided until the runtime exposes redirect control or the effective URL.

DNS rebinding and upstream compromise also remain external risks. A contract result is a consensus classification under the frozen policy, not a legal judgement, identity proof, or guarantee that an external actor performed an off-chain action.
