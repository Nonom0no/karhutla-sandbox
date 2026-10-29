import { useAppState, useAppDispatch } from "../state/context";
import { useEffect, useRef } from "react";

export function TimeControls() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { t, playing, speed, result, params, ignition } = state;
  const stepsRun = result?.steps_run ?? params.steps;
  const animationRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  const prefersReducedMotion = useRef(false);

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Keep playingRef in sync
  playingRef.current = playing;

  const maxT = stepsRun;

  // Animation loop - uses ref for playing to avoid dependency on state.playing
  // Respects prefers-reduced-motion: no auto-play
  useEffect(() => {
    if (!playing || t >= maxT || prefersReducedMotion.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (t >= maxT) {
        dispatch({ type: "SET_PLAYING", payload: false });
      }
      return;
    }

    const baseStepsPerSecond = 10;
    const stepDelay = 1000 / (baseStepsPerSecond * speed);
    let lastTime = performance.now();

    function animate(now: number) {
      if (now - lastTime >= stepDelay) {
        dispatch({ type: "SET_T", payload: Math.min(t + 1, maxT) });
        lastTime = now;
      }
      if (playingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playing, t, speed, maxT, dispatch]);

  const handlePlayPause = () => {
    if (t >= maxT) {
      dispatch({ type: "SET_T", payload: 0 });
    }
    dispatch({ type: "SET_PLAYING", payload: !playing });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: "SET_SPEED", payload: Number(e.target.value) as 0.5 | 1 | 2 | 4 });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(maxT, Number(e.target.value)));
    dispatch({ type: "SET_T", payload: value });
    if (playing) {
      dispatch({ type: "SET_PLAYING", payload: false });
    }
  };

  const handleSliderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      dispatch({ type: "SET_T", payload: Math.max(0, t - 1) });
      if (playing) dispatch({ type: "SET_PLAYING", payload: false });
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      dispatch({ type: "SET_T", payload: Math.min(maxT, t + 1) });
      if (playing) dispatch({ type: "SET_PLAYING", payload: false });
    } else if (e.key === "Home") {
      e.preventDefault();
      dispatch({ type: "SET_T", payload: 0 });
      if (playing) dispatch({ type: "SET_PLAYING", payload: false });
    } else if (e.key === "End") {
      e.preventDefault();
      dispatch({ type: "SET_T", payload: maxT });
      if (playing) dispatch({ type: "SET_PLAYING", payload: false });
    }
  };

  const playPauseLabel = playing ? "Jeda" : t >= maxT ? "Ulang" : "Putar";
  const playPauseAriaLabel = playing ? "Jeda animasi" : t >= maxT ? "Ulang dari awal" : "Putar animasi";

  if (!ignition) {
    return null;
  }

  return (
    <div style={{ padding: "1rem", borderTop: "1px solid #ddd" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button
          onClick={handlePlayPause}
          disabled={maxT === 0}
          aria-label={playPauseAriaLabel}
          style={{
            padding: "0.75rem 1rem",
            background: playing ? "#ff9800" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: maxT === 0 ? "not-allowed" : "pointer",
            minWidth: "80px",
            minHeight: "44px",
          }}
        >
          {playPauseLabel}
        </button>
        <label style={{ fontSize: "0.875rem" }}>
          Kecepatan:
          <select
            value={speed}
            onChange={handleSpeedChange}
            aria-label="Kecepatan animasi"
            style={{ marginLeft: "0.5rem", padding: "0.5rem", minHeight: "44px" }}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span id="time-slider-value" style={{ fontSize: "0.875rem", minWidth: "40px" }}>{t}</span>
        <input
          type="range"
          min="0"
          max={maxT}
          value={t}
          onChange={handleSliderChange}
          onKeyDown={handleSliderKeyDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={maxT}
          aria-valuenow={t}
          aria-valuetext={`Langkah ${t} dari ${maxT}`}
          aria-label="Langkah waktu"
          aria-labelledby="time-slider-value"
          style={{ flex: 1, height: "44px" }}
        />
        <span style={{ fontSize: "0.875rem", minWidth: "40px", textAlign: "right" }}>{maxT}</span>
      </div>
    </div>
  );
}