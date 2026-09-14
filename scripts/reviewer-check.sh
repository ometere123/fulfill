#!/usr/bin/env bash
set -euo pipefail
python -m py_compile contracts/fulfill.py
genvm-lint check contracts/fulfill.py --json
genvm-lint validate contracts/fulfill.py
genvm-lint typecheck contracts/fulfill.py
pytest tests/direct -v
npm run lint --prefix apps/web
npm run typecheck --prefix apps/web
npm test --prefix apps/web
npm run build --prefix apps/web
