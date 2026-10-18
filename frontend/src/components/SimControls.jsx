import { SCENARIOS } from "../sim/scenario.js";
import { clockStr, getScenario } from "../sim/useSimulation.js";

export default function SimControls({ sim, dispatch }) {
  const sc = getScenario(sim.scenarioId);
  const started = sim.t > 0;
  const transportState = sim.running ? "pause" : started ? "resume" : "play";
  const transportLabel = { play: "Play scenario", pause: "Pause scenario", resume: "Resume scenario" }[transportState];
  return (
    <div className="simbar">
      <div className="simbar-row">
        <div className="seg">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={sim.scenarioId === s.id ? "on" : ""}
              onClick={() => dispatch({ type: "LOAD", id: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="simbar-actions">
          <button
            type="button"
            className={`transport-button ${transportState}`}
            aria-label={transportLabel}
            title={transportLabel}
            onClick={() => dispatch({ type: "TOGGLE" })}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              {sim.running ? (
                <><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></>
              ) : (
                <path d="M6 3.5a1 1 0 0 1 1.5-.86l13 8.5a1 1 0 0 1 0 1.72l-13 8.5A1 1 0 0 1 6 20.5z" />
              )}
            </svg>
          </button>
          <button onClick={() => dispatch({ type: "RESTART" })}>Restart</button>
          <label className="speed">
            Speed
            <select value={sim.speed} onChange={(e) => dispatch({ type: "SPEED", speed: Number(e.target.value) })}>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </label>
        </div>

        <div className="clock" title="Simulated harbor clock">
          <span className="clock-label">Harbor clock</span>
          {clockStr(sim.t)}
        </div>
      </div>
      <div className="simbar-blurb">
        <strong>{sc.label.slice(3)}.</strong> {sc.blurb}
        <span className="sample-tag">SAMPLE DATA, SIMULATED SONAR</span>
      </div>
    </div>
  );
}
