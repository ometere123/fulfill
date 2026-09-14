# Fulfill Testing

Fulfill verification is intentionally split between contract shape/policy tests, GenVM Direct Mode behaviour tests, and frontend tests.

## Contract verification

Run from the repository root:

```bash
python -m py_compile contracts/fulfill.py
genvm-lint check contracts/fulfill.py --json
genvm-lint validate contracts/fulfill.py
genvm-lint schema contracts/fulfill.py --output /tmp/fulfill.schema.json
PYTHONIOENCODING=utf-8 genvm-lint typecheck contracts/fulfill.py
pytest tests/direct -v
```

The Direct Mode suite covers, at minimum:

- zero initial counter;
- exact escrow funding;
- funder and recipient must differ;
- no backfilling already-started performance;
- persistence of source catalogue and weighted checks;
- check weights must total exactly `10_000` bps;
- checks cannot reference unknown source IDs;
- proportional contest-bond calculation;
- bounded registry reads;
- time-gated unclaimed recovery;
- exposed scorecard constants.

Static contract-shape tests also verify that the previous whole-verdict architecture is absent: no outcome matrix, no PRIMARY/CORROBORATING hierarchy, no global `challenge_result`, and no provisional outcome code.

## Frontend verification

```bash
cd apps/web
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Frontend unit tests verify:

- chain ID is pinned to Studionet `61999`;
- GEN parsing/formatting avoids floating-point money arithmetic;
- proportional contest bonds are based on disputed weight;
- scorecard status mapping;
- satisfied-weight scoring;
- unresolved checks are counted separately.

## CI

`.github/workflows/ci.yml` runs contract, web and hygiene jobs on every push and pull request.

Do not treat a locally successful build as sufficient when the branch CI is red.

## Live verification after deployment

Once Codex deploys to Studionet 61999, capture real evidence for:

1. deployment transaction and finalised receipt;
2. deployed contract address;
3. `get_constants()` showing `FULFILL_SCORECARD_V2`;
4. one funded commitment with multiple weighted checks;
5. scorecard and source-catalogue reads;
6. recipient assessment request;
7. assessment transaction reaching a complete or explicit unresolved state;
8. exact `quote_contest_bond()` for a subset of checks;
9. if practical, a scoped contest demonstrating untouched checks remain unchanged;
10. final settlement/recovery accounting reads.

Only real transaction hashes and read results belong in `LIVE_EVIDENCE.md`.
