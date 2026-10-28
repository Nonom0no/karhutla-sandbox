import { useEffect } from "react";
import { useAppState, useAppDispatch } from "./state/context";
import { ControlPanel } from "./components/ControlPanel";
import { MapView } from "./components/MapView";
import { TimeControls } from "./components/TimeControls";
import { StatsPanel } from "./components/StatsPanel";

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // fetch regions on mount
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(baseUrl + "/api/regions")
      .then((res) => res.json())
      .then((data) => {
        dispatch({ type: "SET_REGIONS", payload: data.regions });
      })
      .catch((e) => console.error("Failed to load regions", e));
  }, [dispatch]);

  const currentRegion = state.regions.find((r) => r.id === state.regionId);

  const handleAddIgnitionPoint = (point: { lat: number; lon: number }) => {
    dispatch({ type: "ADD_IGNITION_POINT", payload: point });
  };

  const handleRemoveIgnitionPoint = (point: {
    lat: number;
    lon: number;
  }) => {
    dispatch({ type: "REMOVE_IGNITION_POINT", payload: point });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={{ padding: "1rem", background: "#f5f5f5", borderBottom: "1px solid #ddd" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Karhutla Sandbox</h1>
      </header>
      <main style={{ flex: 1, padding: "1rem", display: "flex", gap: "1rem", minHeight: 0 }}>
        <aside style={{ width: "340px", flexShrink: 0 }}>
          <ControlPanel />
          <TimeControls />
          <StatsPanel />
        </aside>
        <section style={{ flex: 1, position: "relative", minHeight: 0, height: "600px" }}>
          {currentRegion && (
            <MapView
              bbox={currentRegion.grid.bbox}
              ignitionPoints={state.ignitionPoints}
              onAddIgnitionPoint={handleAddIgnitionPoint}
              onRemoveIgnitionPoint={handleRemoveIgnitionPoint}
              ignition={state.ignition}
              t={state.t}
              gridWidth={currentRegion.grid.width}
              gridHeight={currentRegion.grid.height}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;