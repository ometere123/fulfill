# Fulfill Security Model

## Security objective

Fulfill must never let a non-deterministic model directly choose a transfer amount, mutate a frozen policy, or expand the evidence scope after funding.

## Frozen-before-performance invariants

Creation requires:

- a non-zero recipient different from the funder;
- exact positive escrow funding;
- a valid future performance timeline;
- 1–8 unique public HTTPS evidence sources;
- 1–8 unique weighted checks;
- every check to reference only known source IDs;
- every check to require at least one available scoped source;
- total check weight exactly `10_000` bps.

After creation, there is no method that edits the source catalogue, checks, weights, recipient, funder or timeline.

## Evidence scope

Every check carries `source_ids`. Validators are given only the pages corresponding to those IDs.

This prevents a page relevant to one requirement from silently becoming authority for another requirement and prevents a claimant from injecting a new source at assessment time.

Fetched page text is explicitly treated as untrusted data. The prompt tells validators not to follow links or instructions embedded in evidence and not to introduce external facts or sources.

## URL restrictions

Sources must use HTTPS and are rejected when they contain credentials, fragments, custom ports, localhost/internal hostnames, or common private IPv4 ranges.

This is a defence-in-depth filter, not a complete network-layer SSRF guarantee.

### Redirect limitation

GenLayer web rendering may follow redirects while contract code does not receive a trustworthy effective final URL. Fulfill therefore cannot prove on-chain that every redirect target remains inside the originally visible hostname.

This limitation is documented rather than hidden. Source selection should use stable public endpoints whose redirect behaviour is understood.

## Non-deterministic boundary

The semantic layer may return only check labels:

```text
SATISFIED
NOT_SATISFIED
UNRESOLVED
```

Operational failures become explicit non-decision states:

```text
SOURCE_UNAVAILABLE
MODEL_OUTPUT_INVALID
```

A check in any non-decision state prevents settlement of that assessment round.

## Financial boundary

Money is determined only by contract arithmetic:

```text
satisfied_bps = sum(weights of SATISFIED checks)
payout = escrow_total × satisfied_bps / 10_000
```

The model does not output basis points, GEN amounts, addresses or transfer instructions.

## Contest security

A contest must:

- occur during the contest window;
- come from the funder or recipient;
- name one or more valid frozen check IDs;
- contain no duplicate IDs;
- fund the exact bond quoted from the disputed weight.

The bond is proportional to disputed economic value rather than the whole escrow.

Only selected checks are reassessed. Untouched provisional check results cannot be changed by a scoped contest.

## Transfer ordering and accounting

Settlement and recovery update commitment/accounting state before calling `emit_transfer`.

Escrow and contest-bond accounting are maintained separately.

Terminal commitments cannot be settled again because settlement accepts only the provisional `ASSESSED` or `CONTESTED` states.

## Bounded liveness

Assessment and contest retries are bounded by both:

- a maximum number of attempts; and
- a grace period plus minimum retry interval.

If semantic resolution cannot complete, deterministic recovery paths prevent funds being trapped indefinitely.
