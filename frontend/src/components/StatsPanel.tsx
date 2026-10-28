import { useAppState } from "../state/context";

export function StatsPanel() {
  const { result, status } = useAppState();

  if (!result || status !== "done") {
    return (
      <div style={{ padding: "1rem", borderTop: "1px solid #ddd", color: "#666" }}>
        <div>Belum ada hasil simulasi</div>
      </div>
    );
  }

  const { stats, steps_run, seed } = result;

  return (
    <div style={{ padding: "1rem", borderTop: "1px solid #ddd" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Statistik</h3>
      <dl style={{ margin: 0, fontSize: "0.875rem", lineHeight: "1.8" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>Sel terbakar</dt>
          <dd style={{ margin: 0 }}>{stats.burned_cells.toLocaleString()}</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>Fraksi terbakar</dt>
          <dd style={{ margin: 0 }}>{(stats.burned_fraction * 100).toFixed(2)}%</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>Luas terbakar</dt>
          <dd style={{ margin: 0 }}>{stats.burned_area_ha.toLocaleString()} ha</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>Langkah dijalankan</dt>
          <dd style={{ margin: 0 }}>{steps_run}</dd>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <dt>Seed</dt>
          <dd style={{ margin: 0 }}>{seed}</dd>
        </div>
      </dl>
    </div>
  );
}