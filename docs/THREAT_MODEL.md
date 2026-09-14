# Fulfill Threat Model

## Assets

- escrowed GEN;
- contest bonds;
- frozen performance policy;
- scorecard integrity;
- evidence-scope integrity;
- liveness of assessment, contest and recovery;
- truthful frontend transaction reporting.

## Adversaries

Fulfill assumes either party may act strategically and public evidence pages may contain misleading or adversarial text.

### Malicious funder

A funder may try to define vague checks, choose weak sources, over-scope a source, or contest a result merely to delay payment.

Mitigations:

- policy is visible and frozen before performance;
- check weights must total exactly 100%;
- every check must name explicit evidence sources;
- contests require a proportional bond;
- contest attempts and time are bounded.

Residual risk: a poorly drafted scorecard is still a poor commercial agreement. Fulfill enforces the frozen policy; it does not guarantee that the policy was wise.

### Malicious recipient

A recipient may try to add favourable evidence after performance, request assessment outside the permitted window, or contest checks that already support the maximum payout.

Mitigations:

- no post-creation evidence mutation;
- request time is contract-enforced;
- contest scope is restricted to frozen check IDs;
- exact contest bond is required.

### Malicious evidence page

A public page may contain prompt injection such as instructions to ignore the contract requirement or fetch another URL.

Mitigations:

- page content is labelled untrusted evidence;
- validators are instructed not to follow links or instructions in evidence;
- each check is assessed only from frozen source IDs;
- the model can emit only fact labels, never settlement amounts.

Residual risk: semantic interpretation is intentionally non-deterministic and depends on validator consensus.

### Source outage or ambiguity

A source may be unavailable, contradictory or insufficient.

Mitigations:

- each check declares `min_available`;
- unavailable sources can produce `SOURCE_UNAVAILABLE`;
- ambiguous evidence produces `UNRESOLVED`;
- malformed model output produces `MODEL_OUTPUT_INVALID`;
- non-decision checks block settlement for that round;
- bounded retries eventually expose a deterministic recovery path.

### Overbroad dispute

A party may try to reopen the whole transaction when only one fact is disputed.

Mitigations:

- contests accept explicit check IDs;
- only selected checks are reassessed;
- untouched results are merged unchanged;
- bond size tracks disputed weight.

### Double settlement / accounting drift

A party may attempt to trigger multiple terminal transfers.

Mitigations:

- settlement requires `ASSESSED` or `CONTESTED`;
- recovery requires a corresponding non-terminal state;
- state/accounting is written before external transfer;
- escrow remaining is zeroed on terminal paths;
- contract-wide totals track funded, remaining, paid and returned amounts separately from bonds.

### Unbounded reads / storage scans

Mitigation: registry reads enforce a maximum page size of 25.

### Frontend false success

Mitigation: the web client waits for a finalised receipt and rejects non-successful execution/consensus results before reporting success.

## Trust assumptions

Fulfill assumes:

- GenLayer validator consensus and execution behave according to the network protocol;
- the frozen public URLs are meaningful evidence locations chosen by the parties;
- web-render redirect handling is an infrastructure limitation and the effective final URL is not available for a fully trustless redirect allowlist;
- users review scorecard language and source scope before funding.
