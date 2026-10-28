---
description: Run backend + frontend tests, lint, type checks, and check API contract against docs/API_SPEC.md.
agent: build
---
Verify the project state. Extra instructions (optional): $ARGUMENTS

Run what exists (skip a side only if its scaffold task is unchecked in `docs/ROADMAP.md`, and say so):
1. Backend, from `backend/`: `pytest -q` and `ruff check . && ruff format --check .`.
2. Frontend, from `frontend/`: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
3. API contract check:
   - Run `backend/tests/test_api_contract.py` (part of `pytest`) and report its result.
   - Compare request/response field names, ranges and error codes in `docs/API_SPEC.md` against `backend/app/api/schemas.py` and `frontend/src/api/types.ts`. List every mismatch.
   - Confirm canonical values match across docs and code: grid 200x200, cell 30 m, steps 1-500, `fire_intensity` 1-100, `wind_speed` 0-20, `wind_from_deg` [0,360), `fuel_moisture` 0-1, TTL 1800 s, max 100 results, k = 0.1.
4. Do NOT modify any file. Report only.

Output: a table (check | result | details), then a list of mismatches with file paths, then `VERIFY: PASS` or `VERIFY: FAIL`.