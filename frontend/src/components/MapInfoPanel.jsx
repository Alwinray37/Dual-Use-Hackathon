import { useState } from "react";
import ContactCheckPanel from "./ContactCheckPanel.jsx";
import { ManifestTable } from "./ManifestBoard.jsx";

const TABS = ["Contact Check", "Manifest"];

// ── Component ──────────────────────────────────────────────────────────────────

export default function MapInfoPanel({ sim, dispatch }) {
  const [active, setActive] = useState("Contact Check");

  const TAB_CONTENT = {
    "Contact Check":    <ContactCheckPanel sim={sim} dispatch={dispatch} />,
    "Manifest":         <ManifestTable sim={sim} />,
  };

  return (
    <div className="info-panel">
      <div className="info-panel-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`info-panel-tab${active === t ? " active" : ""}`}
            onClick={() => setActive(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="info-panel-body">
        {TAB_CONTENT[active]}
      </div>
    </div>
  );
}
