import { useRef, useState } from "react";
import HarborMap from "./components/HarborMap.jsx";
import MapInfoPanel from "./components/MapInfoPanel.jsx";
import OfficerView from "./components/OfficerView.jsx";
import ManifestBoard from "./components/ManifestBoard.jsx";
import SimControls from "./components/SimControls.jsx";
import { handoffs, useSimulation } from "./sim/useSimulation.js";

const VIEWS = ["Operations", "Officer view", "Manifest board"];

const MIN_PANEL = 46;   // just the tab row
const MIN_MAP = 180;

function clampPanel(h, boxH) {
  return Math.max(MIN_PANEL, Math.min(h, Math.max(MIN_PANEL, boxH - MIN_MAP)));
}

function SplitView({ sim, dispatch }) {
  const box = useRef(null);
  const [panelH, setPanelH] = useState(330);
  const [scale, setScale] = useState(1.4);
  const boxH = () => (box.current ? box.current.clientHeight : 800);
  const setH = (h) => setPanelH(clampPanel(h, boxH()));

  const onDown = (e) => {
    if (e.target.closest("button")) return;
    const startY = e.clientY;
    const startH = panelH;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => setH(startH + (startY - ev.clientY));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const bump = (d) => setScale((v) => Math.max(0.9, Math.min(2.2, +(v + d).toFixed(2))));
  const h = clampPanel(panelH, boxH());

  return (
    <main className="split" ref={box}>
      <div className="split-map">
        <HarborMap sim={sim} onSelectContact={(id) => dispatch({ type: "SELECT", id })} />
      </div>
      <div className="split-handle" onPointerDown={onDown} title="Drag to resize">
        <span className="grip" />
        <div className="split-tools">
          <button onClick={() => setH(MIN_PANEL)}>Map only</button>
          <button onClick={() => setH(330)}>Split</button>
          <button onClick={() => setH(9999)}>Panel only</button>
          <span className="sep" />
          <button onClick={() => bump(-0.1)} aria-label="Smaller text">A−</button>
          <button onClick={() => bump(0.1)} aria-label="Larger text">A+</button>
        </div>
      </div>
      <div className="split-panel" style={{ height: h }}>
        <div className="split-panel-inner" style={{ zoom: scale, height: h / scale }}>
          <MapInfoPanel sim={sim} dispatch={dispatch} />
        </div>
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
