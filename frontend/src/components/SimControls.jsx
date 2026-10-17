import { SCENARIOS, SONAR_NODES } from "../sim/scenario.js";
import { clockStr, getScenario } from "../sim/useSimulation.js";

export default function SimControls({ sim, dispatch }) {
  const sc = getScenario(sim.scenarioId);
  const started = sim.t > 0;
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
          <button className="primary" onClick={() => dispatch({ type: "TOGGLE" })}>
            {sim.running ? "Pause" : started ? "Resume" : "Play scenario"}
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

        <div className="nodes">
          <span className="nodes-label">Sonar nodes (sim)</span>
          {SONAR_NODES.map((n) => {
            const off = sim.offline[n.id];
            return (
              <button
                key={n.id}
                className={`nodechip${off ? " off" : ""}`}
                title={`${n.name}. Click to ${off ? "restore" : "take offline"}`}
                onClick={() => dispatch({ type: "NODE", id: n.id })}
              >
                {n.id} {off ? "offline" : "online"}
              </button>
            );
          })}
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
