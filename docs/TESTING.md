# Testing

Run locally:

```bash
python -m py_compile contracts/fulfill.py
genvm-lint check contracts/fulfill.py --json
genvm-lint validate contracts/fulfill.py
genvm-lint schema contracts/fulfill.py --output /tmp/fulfill.schema.json
genvm-lint typecheck contracts/fulfill.py
pytest tests/direct -v
npm install --prefix apps/web
npm run lint --prefix apps/web
npm run typecheck --prefix apps/web
npm test --prefix apps/web
npm run build --prefix apps/web
```

Direct tests cover deployment, exact funding, immutable parties and accounting, role checks, bounded reads, expiry recovery and exposed safety constants. Nondeterministic web/model review needs a configured GenLayer runtime and should be demonstrated on the target network before submission.

Do not claim a live review-to-settlement proof until the corresponding transaction receipts are captured and linked in `LIVE_EVIDENCE.md`.
