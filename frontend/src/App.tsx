import { useEffect, useState } from "react";
import { useAppState, useAppDispatch } from "./state/context";
import { ControlPanel } from "./components/ControlPanel";
import { TimeControls } from "./components/TimeControls";
import { StatsPanel } from "./components/StatsPanel";
import { SceneView } from "./scene/SceneView";
import { FPSMonitor } from "./components/FPSMonitor";
import { LimitationsBanner } from "./components/LimitationsBanner";
import { getRegions, getFuel } from "./api/client";
import { decodeFuel } from "./lib/fuel";

function App() {
  const { regionId, regions, quality } = useAppState();
  const dispatch = useAppDispatch();
  const currentRegion = regions.find((r) => r.id === regionId);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-detect mobile/touch and set quality to 'low' on first load
  useEffect(() => {
    const checkMobile = () => {
      const mobile = typeof window !== 'undefined' &&
        (window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsMobile(mobile);
      if (mobile && quality === 'high') {
        dispatch({ type: "SET_QUALITY", payload: "low" });
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [dispatch, quality]);

  // fetch regions on mount using API client
  useEffect(() => {
    getRegions()
      .then((data) => {
        dispatch({ type: "SET_REGIONS", payload: data.regions });
      })
      .catch((e) => console.error("Failed to load regions", e));
  }, [dispatch]);

  // fetch fuel when regionId changes
  useEffect(() => {
    if (!regionId) return;
    let cancelled = false;
    getFuel(regionId)
      .then((data) => {
        if (!cancelled) {
          const arr = decodeFuel(data.data);
          dispatch({ type: "SET_FUEL", payload: arr });
        }
      })
      .catch((e) => console.error("Failed to load fuel", e));
    return () => {
      cancelled = true;
    };
  }, [regionId, dispatch]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={{ padding: "1rem", background: "#f5f5f5", borderBottom: "1px solid #ddd" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Karhutla Sandbox</h1>
      </header>
      <main style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: isMobile ? "column" : "row", gap: "1rem", minHeight: 0 }}>
        {!isMobile && (
          <aside style={{ width: "340px", flexShrink: 0 }}>
            <ControlPanel />
            <TimeControls />
            <StatsPanel />
          </aside>
        )}
        <section style={{ 
          flex: 1, 
          position: "relative", 
          minHeight: 0, 
          height: isMobile ? "60vh" : "600px",
          display: "flex",
          flexDirection: "column",
        }}>
          {currentRegion && (
            <>
              <LimitationsBanner />
              <SceneView regionId={currentRegion.id} />
            </>
          )}
          <FPSMonitor enabled={quality === 'low'} />
        </section>
        {isMobile && (
          <aside style={{ 
            width: "100%", 
            maxHeight: "40vh", 
            overflow: "auto",
            borderTop: "1px solid #ddd",
            background: "#fafafa",
            padding: "0.5rem",
          }}>
            <ControlPanel />
            <TimeControls />
            <StatsPanel />
          </aside>
        )}
      </main>
    </div>
  );
}
export default App;