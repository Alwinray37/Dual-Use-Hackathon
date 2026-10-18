import { useRef, useState } from "react";
import HarborMap from "./components/HarborMap.jsx";
import MapInfoPanel from "./components/MapInfoPanel.jsx";
import OfficerView from "./components/OfficerView.jsx";
import ManifestBoard from "./components/ManifestBoard.jsx";
import SimControls from "./components/SimControls.jsx";
import { handoffs, useSimulation } from "./sim/useSimulation.js";

const VIEWS = ["Operations", "Officer view", "Manifest board"];

const MIN_PANEL = 0;
const MIN_MAP = 320;

function clampPanel(w, boxW) {
  return Math.max(MIN_PANEL, Math.min(w, Math.max(MIN_PANEL, boxW - MIN_MAP)));
}

function SplitView({ sim, dispatch }) {
  const box = useRef(null);
  const [panelW, setPanelW] = useState(520);
  const boxW = () => (box.current ? box.current.clientWidth : 1400);
  const setW = (w) => setPanelW(clampPanel(w, boxW()));

  const onDown = (e) => {
    if (e.target.closest("button")) return;
    const startX = e.clientX;
    const startW = panelW;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => setW(startW + (startX - ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const w = clampPanel(panelW, boxW());

  return (
    <main className="split" ref={box}>
      <div className="split-map">
        <HarborMap sim={sim} onSelectContact={(id) => dispatch({ type: "SELECT", id })} />
      </div>
      <div className="split-handle" onPointerDown={onDown} title="Drag to resize">
        <span className="grip" />
      </div>
      <div className="split-panel" style={{ width: w }}>
        <div className="split-tools">
          <button onClick={() => setW(0)}>Map only</button>
          <button onClick={() => setW(520)}>Split</button>
          <button onClick={() => setW(9999)}>Panel only</button>
        </div>
        <MapInfoPanel sim={sim} dispatch={dispatch} />
      </div>
    </main>
  );
}

export default function App() {
  const [sim, dispatch] = useSimulation();
  const [view, setView] = useState("Operations");
  const open = handoffs(sim).length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Harbor Watch</h1>
        <span className="sub">Port of Los Angeles</span>
        <nav className="views">
          {VIEWS.map((v) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {v}
              {v === "Officer view" && open > 0 && <span className="pip">{open}</span>}
            </button>
          ))}
        </nav>
      </header>

      <SimControls sim={sim} dispatch={dispatch} />

      {view === "Operations" && <SplitView sim={sim} dispatch={dispatch} />}
      {view === "Officer view" && <div className="view-scroll"><OfficerView sim={sim} dispatch={dispatch} /></div>}
      {view === "Manifest board" && <div className="view-scroll"><ManifestBoard sim={sim} /></div>}
    </div>
  );
}
