# AGENTS.md — Karhutla Sandbox

## Project
Educational web sandbox for simulating surface wildfire (karhutla) spread. The user picks a preset region, clicks ignition points on a 2D map, sets fire intensity, wind (compass + speed) and fuel moisture, then watches a time-step animation. It is NOT an operational prediction tool. One developer, MVP target 6–8 weeks.

## Tech stack (pin ranges; VERIFIKASI exact versions at scaffold time)
- Backend: Python 3.11+ (<3.13), FastAPI >=0.115,<1, Pydantic v2 (>=2.7,<3), Uvicorn >=0.30,<1, NumPy >=1.26,<3. Dev: pytest >=8,<9, httpx >=0.27, ruff >=0.6.
- Simulator: own stochastic cellular automaton, vectorized with `np.roll`. No per-cell Python loops. Numba only if profiling proves it necessary (ask first).
- Frontend: React ^18.3, Vite ^5.4, TypeScript ^5.5, Leaflet ^1.9.4 (plain Leaflet, NO react-leaflet), Vitest ^2, ESLint ^9. Node >=20.
- NOT used: DisSModel, PROPAGATOR, Streamlit, any compass library. PyTorchFire/SimFire/ForeFire = comparison only (docs/ML_PHASE.md).

## Repo layout
```
AGENTS.md  opencode.json  docs/  .opencode/{agents,commands}/
backend/   pyproject.toml  app/{main.py,config.py,store.py,api/,sim/,data/fuel/}  scripts/  tests/
frontend/  package.json  vite.config.ts  src/{api/,lib/,state/,components/}
```
Full tree: docs/ARCHITECTURE.md.

## Commands
Backend (run from `backend/`; available after ROADMAP task P1-01):
- Setup: `python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"`
- Run: `uvicorn app.main:app --reload --port 8000`
- Test: `pytest -q`
- Lint: `ruff check . && ruff format --check .`
Frontend (run from `frontend/`; available after ROADMAP task P2-01):
- Setup: `npm ci`
- Run: `npm run dev` (http://localhost:5173, API base from `VITE_API_BASE_URL`, default `http://localhost:8000`)
- Test: `npm run test` (vitest run) | Lint: `npm run lint` | Types: `npm run typecheck` | Build: `npm run build`
If a script is missing, create it as part of the scaffold task; never invent flags you have not seen work.

## Code conventions
- Backend: type hints everywhere, `ruff` defaults + line length 100, pure functions in `app/sim/` (no FastAPI imports there), RNG passed in as `np.random.Generator` (never a global).
- Frontend: TypeScript `strict: true`, no `any`, function components + hooks, state via `useReducer` (no new state library), API types in `src/api/types.ts` mirror docs/API_SPEC.md exactly (snake_case field names are kept as-is).
- Field names, paths and numbers MUST match across docs and code. Canonical values live in docs/SIMULATION_SPEC.md (simulation) and docs/API_SPEC.md (API).
- User-facing UI text: Bahasa Indonesia. Code, comments, commit messages: English.
- Small commits, one ROADMAP task per commit/session.

## Definition of Done (per task)
1. Acceptance criteria of the ROADMAP task are met and its "Cara uji" passes.
2. Backend: `pytest -q` and `ruff check .` pass. Frontend: `npm run test`, `npm run lint`, `npm run typecheck` pass.
3. No API/contract drift: any change to request/response fields is made in docs/API_SPEC.md FIRST, then in code and types.
4. Domain limitation text is present wherever specified (docs/FRONTEND_SPEC.md §Batasan Domain).
5. Task checkbox in docs/ROADMAP.md is ticked (`- [x]`), nothing else in that file is rewritten.

## DO NOT
- Do not run `/init` or anything that overwrites this file.
- Do not add dependencies (especially large ones: Numba, torch, react-leaflet, state libs, UI kits) without explicit approval from the user.
- Do not change the API contract (docs/API_SPEC.md) or the `ignition_time` format without updating the doc in the same change.
- Do not return one frame per step from the API. The contract is ONE `ignition_time` array (int16 LE, base64).
- Do not call external data APIs at runtime in the MVP; fuel grids are `.npy` files in the repo.
- Do not implement items listed under "Ditunda" (real data, DEM slope, spotting, live weather, FIRMS, calibration, ML, accounts, firebreaks/suppression).
- Do not model or claim to model peat (gambut) fires; do not present results as predictions.
- Do not invent library APIs, CLI flags or OpenCode config keys. Write `VERIFIKASI: <what/where>` instead.
- Do not edit `.npy` fuel grids by hand; regenerate with `backend/scripts/generate_fuel_grids.py`.

## Which docs to read (read only what the task needs)
- Any task: docs/ROADMAP.md (find your task), this file.
- Simulator / sim tests: docs/SIMULATION_SPEC.md.
- Endpoints, schemas, errors, storage, CORS: docs/API_SPEC.md.
- UI, canvas/overlay, compass, time slider, mobile: docs/FRONTEND_SPEC.md.
- Folder layout / why a decision was made: docs/ARCHITECTURE.md.
- Scope questions: docs/PRD.md. Data sources: docs/DATA_SOURCES.md. ML: docs/ML_PHASE.md (DITUNDA, do not implement).

## Agents and commands (OpenCode)
- Subagents: `@sim-engineer` (backend/simulator), `@frontend-engineer` (React/Leaflet), `@reviewer` (read-only spec compliance).
- Commands: `/next-task`, `/verify`, `/review`.