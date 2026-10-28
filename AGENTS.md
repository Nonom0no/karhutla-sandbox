# AGENTS.md — Karhutla Sandbox

## Project
Educational, playful web sandbox for simulating surface wildfire (karhutla) spread, shown as a stylized low-poly 3D diorama (TABS-like toy look). The user picks a preset region, clicks the ground to place ignition points, sets fire intensity, wind (compass + speed) and fuel moisture, then watches the fire spread over instanced low-poly trees/grass. It is NOT an operational prediction tool. One developer, MVP target 6–8 weeks.

## Tech stack (pin ranges; VERIFIKASI exact versions at install time)
- Backend: Python 3.11+ (<3.13), FastAPI >=0.115,<1, Pydantic v2 (>=2.7,<3), Uvicorn >=0.30,<1, NumPy >=1.26,<3. Dev: pytest >=8,<9, httpx >=0.27, ruff >=0.6.
- Simulator: own stochastic cellular automaton, vectorized with `np.roll`. No per-cell Python loops. Numba only if profiling proves it necessary (ask first).
- Frontend: React ^18.3, Vite ^5.4, TypeScript ^5.5, three ^0.170, @react-three/fiber ^8.17 (v8 = React 18), @react-three/drei ^9.117, @types/three (match three). Vitest ^2, ESLint ^9. Node >=20.
- 3D is allowed ONLY through the packages above. Leaflet and any 2D map/tile layer are REMOVED (ROADMAP 3D-01).
- NOT used: DisSModel, PROPAGATOR, Streamlit, Leaflet, react-leaflet, any compass library, any state library, any physics/post-processing/UI-kit package.

## Repo layout
```
AGENTS.md  opencode.json  docs/  .opencode/{agents,commands}/
backend/   pyproject.toml  app/{main.py,config.py,store.py,api/,sim/,data/fuel/}  scripts/  tests/
frontend/  package.json  vite.config.ts  src/{api/,lib/,state/,components/,scene/}
```
Full tree: docs/ARCHITECTURE.md.

## Commands
Backend (from `backend/`):
- Setup: `python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"`
- Run: `uvicorn app.main:app --reload --port 8000`
- Test: `pytest -q` | Lint: `ruff check . && ruff format --check .`
Frontend (from `frontend/`):
- Setup: `npm ci` | Run: `npm run dev` (http://localhost:5173; API base `VITE_API_BASE_URL`, default `http://localhost:8000`)
- Test: `npm run test` | Lint: `npm run lint` | Types: `npm run typecheck` | Build: `npm run build`
Never invent flags you have not seen work.

## Code conventions
- Backend: type hints everywhere, `ruff` line length 100, pure functions in `app/sim/` (no FastAPI imports), RNG passed in as `np.random.Generator`.
- Frontend: TypeScript `strict`, no `any`, function components + hooks, `useReducer` state. API types in `src/api/types.ts` mirror docs/API_SPEC.md exactly (snake_case kept).
- API paths all live under `/api` (e.g. `/api/simulate`). All HTTP calls go through `src/api/client.ts`; no raw `fetch` in components.
- 3D code lives in `src/scene/`. Math/logic (coordinates, visual state, bucketing) lives in pure functions in `src/lib/` with unit tests. Scene components stay thin.
- 3D performance rules: use `InstancedMesh`; never create objects in `useFrame`; never mount one React element per grid cell; update instances only when `t` changes, incrementally when possible (docs/FRONTEND_SPEC.md §5).
- UI text: Bahasa Indonesia. Code, comments, commit messages: English.
- Small commits, one ROADMAP task per commit/session.

## Definition of Done (per task)
1. Acceptance criteria of the ROADMAP task are met and its "Uji" passes.
2. Backend: `pytest -q` + `ruff check .` pass. Frontend: `npm run test`, `npm run lint`, `npm run typecheck` pass.
3. No contract drift: API changes go in docs/API_SPEC.md FIRST, then code, types and contract test.
4. Domain limitation text is visible where specified (docs/FRONTEND_SPEC.md §9).
5. For visual tasks: run `npm run dev`, state what you checked by eye; if you cannot view it, say so explicitly.
6. The task checkbox in docs/ROADMAP.md is ticked; nothing else there is rewritten.

## DO NOT
- Do not run `/init` or anything that overwrites this file.
- Do not add dependencies beyond those listed above without explicit approval.
- Do not change the API contract or the `ignition_time` format without updating docs/API_SPEC.md in the same change.
- Do not return one frame per step from the API. The time slider only filters `ignition_time <= t`.
- Do not call external data/tile APIs at runtime. Fuel grids come from the repo (`.npy`) via `/api/regions/{id}/fuel`.
- Do not implement items listed under "Ditunda" (real data, DEM terrain, spotting, live weather, FIRMS, calibration, ML, accounts, firebreaks/suppression).
- Do not model or claim to model peat fires; do not present results as predictions.
- Do not invent library APIs or CLI flags. Write `VERIFIKASI: <what/where>`.
- Do not edit `.npy` grids by hand; use `backend/scripts/generate_fuel_grids.py`.

## Which docs to read (only what the task needs)
- Always: docs/ROADMAP.md (your task), this file.
- Simulator: docs/SIMULATION_SPEC.md. Endpoints/errors: docs/API_SPEC.md.
- Any UI/3D/scene/compass/time slider/mobile: docs/FRONTEND_SPEC.md.
- Layout/decisions: docs/ARCHITECTURE.md. Scope: docs/PRD.md. Data: docs/DATA_SOURCES.md. ML: docs/ML_PHASE.md (DITUNDA).

## Agents and commands (OpenCode)
- Subagents: `@sim-engineer` (backend/simulator), `@frontend-engineer` (React/three), `@reviewer` (read-only compliance).
- Commands: `/next-task`, `/verify`, `/review`.