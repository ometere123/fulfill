# Threat model

| Threat | Control | Residual risk |
|---|---|---|
| claimant supplies a new favourable source | source URLs are immutable after creation | a frozen source itself may later change |
| known outcome is backfilled after the fact | performance start must not precede contract creation time | users still control how precisely they define the performance window |
| prompt injection in evidence | evidence is explicitly data, linked authority is forbidden, output is label-only | sophisticated page content may still influence model judgement |
| source redirects to another host | original HTTPS URL is frozen | current runtime follows redirects and does not expose effective URL, so source-operator redirect behaviour is trusted |
| model invents compensation | payout basis points are frozen and applied deterministically | a wrong classification can still select the wrong frozen payout |
| required source outage | explicit retryable state with bounded retries | long outages can end in return of escrow without a decision |
| griefing challenge | exact 5% bond; losing direction forfeits bond to counterparty | wealthy parties can still delay within the fixed window |
| stuck funds | expiry, unresolved-review and stalled-challenge recovery methods | callers must still submit the recovery transaction |
| double settlement | terminal-state guards and accounting zeroed before transfer | implementation bugs remain possible and require audit |
| oversized reads | page limit of 25 | clients must paginate correctly |
