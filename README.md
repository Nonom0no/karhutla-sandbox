# Karhutla Sandbox

Educational web sandbox for simulating surface wildfire (karhutla) spread as a stylized low-poly 3D diorama.

**Not an operational prediction tool.** Results are qualitative and educational only.

## Quickstart

### Prerequisites
- Python 3.11+ (<3.14)
- Node.js 20+
- uv (recommended) or pip + venv

### Backend Setup
```bash
cd backend
# Using uv (recommended)
uv venv && uv pip install -e ".[dev]"
# Or using pip
python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"
```

### Frontend Setup
```bash
cd frontend
npm ci
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
API available at http://localhost:8000
- Docs: http://localhost:8000/docs
- Regions: http://localhost:8000/api/regions

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
App available at http://localhost:5173 (proxies API to localhost:8000)

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL (frontend) |

## Usage

1. **Select Region**: Choose from Hutan Hujan Tropis, Hutan Mengering, or Padang Rumput
2. **Set Parameters**: Adjust fire intensity, wind speed/direction, fuel moisture, steps
3. **Place Ignition**: Click on the ground (green areas) to place 1-5 ignition points (red markers)
4. **Run Simulation**: Click "Jalankan Simulasi"
5. **View Results**: Use time slider (▶/⏸, speed 0.5×–4×) to scrub through fire spread
6. **Stats**: See burned cells, fraction, area (hectares), steps run, seed

## Controls

| Control | Keyboard / Touch |
|---------|------------------|
| Orbit camera | Left drag / one finger drag |
| Zoom | Scroll / pinch |
| Pan | Right drag / two finger drag |
| Reset camera | "Reset kamera" button |
| Compass (wind from) | Drag handle / Arrow keys (±1°), Shift+Arrow (±15°) |
| Time slider | Drag / Arrow keys (±1 step), Home/End |
| Play/Pause | Button / Space (when slider focused) |
| Speed | Dropdown (0.5×, 1×, 2×, 4×) |

## Accessibility
- All controls keyboard-operable (Tab, Arrow keys, Space, Enter)
- ARIA labels on sliders, compass, buttons
- `prefers-reduced-motion`: disables auto-play, animations
- Focus visible outlines
- Minimum 44×44px touch targets

## Limitations (Domain)
> Model ini hanya menyimulasikan penyebaran api permukaan. Kebakaran gambut (membara di bawah tanah) tidak dimodelkan. Hasil bersifat kualitatif dan edukatif, bukan prediksi operasional.

## Development

### Run Tests
```bash
# Backend
cd backend && pytest -q

# Frontend
cd frontend && npm run test
cd frontend && npm run lint
cd frontend && npm run typecheck
```

### Build Production
```bash
cd frontend && npm run build
```

### Regenerate Fuel Grids
```bash
cd backend && python scripts/generate_fuel_grids.py
```

## Smoke Test Checklist (Manual)

Run after any change or fresh clone. All items must pass.

### Environment
- [ ] Python 3.11+ installed
- [ ] Node.js 20+ installed
- [ ] Backend starts: `uvicorn app.main:app --port 8000` → no errors, serves `/api/regions`
- [ ] Frontend starts: `npm run dev` → no errors, opens at `http://localhost:5173`

### API Contract
- [ ] `GET /api/regions` returns 3 regions with correct IDs
- [ ] `GET /api/regions/{id}/fuel` returns base64 fuel grid for each region
- [ ] `POST /api/simulate` with valid params returns `ignition_time` (base64), `steps_run`, `stats`, `seed`
- [ ] Error codes: `VALIDATION_ERROR`, `IGNITION_ON_NON_FUEL`, `IGNITION_OUT_OF_BOUNDS`, `REGION_NOT_FOUND`, `INTERNAL_ERROR`
- [ ] Determinism: same request + same seed → identical `ignition_time` bytes

### UI - Region & Parameters
- [ ] Region dropdown shows 3 options with Indonesian names
- [ ] Changing region updates default fuel_moisture
- [ ] All sliders (fire intensity, wind speed, fuel moisture, steps) work
- [ ] Wind direction input accepts 0-359
- [ ] Seed input accepts integer or empty (random)
- [ ] Quality toggle switches between "high"/"low"

### UI - Ignition & Camera
- [ ] Click ground (green) → places red marker (max 5)
- [ ] Click water (blue) / border → shows "Tidak bisa menyulut api di sini"
- [ ] Click marker → removes it
- [ ] OrbitControls: rotate, zoom, pan work
- [ ] "Reset kamera" returns to default view
- [ ] Compass: drag handle, Arrow keys, Shift+Arrow work
- [ ] Compass shows "Angin dari {deg}° ({direction})"

### UI - Simulation & Time
- [ ] "Jalankan Simulasi" disabled when no ignition points
- [ ] Loading spinner during simulation
- [ ] Error banner shows Indonesian message on failure
- [ ] After success: time slider appears, stats panel shows results
- [ ] Play (▶) advances time, pauses at end (button → "Ulang")
- [ ] Pause (⏸) stops animation
- [ ] Speed dropdown changes playback rate
- [ ] Slider drag/scrub works, pauses playback
- [ ] Keyboard: ←/→ step ±1, Home/End jump to start/end
- [ ] `prefers-reduced-motion`: auto-play disabled, animations off

### UI - Visuals
- [ ] 3D scene renders (trees/grass instanced, ground, water)
- [ ] Fire particles appear on burning cells
- [ ] Burned cells turn dark/charred
- [ ] Limitations banner visible above canvas and in stats panel
- [ ] Mobile (≤768px): single column, scene ~60vh, controls below, no horizontal scroll at 360px
- [ ] Desktop (>768px): left panel ~340px, scene fills rest
- [ ] FPS monitor shows in dev mode (bottom-right)

### Performance
- [ ] Low quality: no shadows, capped DPR, no antialias
- [ ] High quality: shadows, full DPR, antialias
- [ ] 200×200 grid runs at ≥30 FPS on typical laptop (low quality)
- [ ] Memory stable during long runs (no leaks)

### Determinism
- [ ] Same region + same ignition points + same params + same seed → identical fire pattern
- [ ] Different seeds → different patterns (usually)

### Accessibility
- [ ] Tab order: region → sliders → inputs → compass → buttons → time controls
- [ ] All interactive elements have visible focus ring
- [ ] Screen reader announces slider values, compass direction
- [ ] `prefers-reduced-motion` respected (no auto-play, CSS transitions off)

## Project Structure
```
karhutla-sandbox/
├── AGENTS.md              # Agent instructions
├── docs/
│   ├── ARCHITECTURE.md    # Repo layout, decisions
│   ├── API_SPEC.md        # API contract (source of truth)
│   ├── SIMULATION_SPEC.md # CA algorithm, parameters
│   ├── FRONTEND_SPEC.md   # UI/3D/scene specs
│   ├── ROADMAP.md         # Task tracking
│   ├── PRD.md             # Product requirements
│   └── DATA_SOURCES.md    # Data provenance
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py        # FastAPI app
│   │   ├── config.py
│   │   ├── store.py
│   │   ├── api/           # Routes, errors, types
│   │   ├── sim/           # CA engine, regions
│   │   └── data/fuel/     # .npy fuel grids
│   ├── scripts/
│   │   └── generate_fuel_grids.py
│   └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── api/           # Client, types
        ├── lib/           # Pure functions (geo, angle, fuel, etc.)
        ├── state/         # React context + reducer
        ├── components/    # UI components
        └── scene/         # 3D scene (Canvas, InstancedMesh, etc.)
```

## License
MIT (educational project)