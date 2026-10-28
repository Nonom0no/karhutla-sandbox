import { useEffect } from "react";
import { useAppState, useAppDispatch } from "./state/context";
import { ControlPanel } from "./components/ControlPanel";
import { TimeControls } from "./components/TimeControls";
import { StatsPanel } from "./components/StatsPanel";
import { SceneView } from "./scene/SceneView";
import { getRegions } from "./api/client";

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // fetch regions on mount using API client
  useEffect(() => {
    getRegions()
      .then((data) => {
        dispatch({ type: "SET_REGIONS", payload: data.regions });
      })
      .catch((e) => console.error("Failed to load regions", e));
  }, [dispatch]);

  const currentRegion = state.regions.find((r) => r.id === state.regionId);

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
            <SceneView
              regionId={currentRegion.id}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;