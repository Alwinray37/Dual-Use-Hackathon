import { useState } from "react";
import { CLASS_LABEL, MANIFEST, OTHER_KNOWN, SOURCES } from "../sim/scenario.js";
import { activeStatus } from "../sim/useSimulation.js";

const STATUS_COLOR = { active: "#22c55e", upcoming: "#64748b", ended: "#475569", expired: "#f59e0b" };
const STATUS_LABEL = { active: "Active now", upcoming: "Upcoming", ended: "Ended", expired: "Permit expired" };

export function ManifestTable({ sim, highlight, onPick }) {
  return (
    <table className="panel-table mf-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Expected underwater activity</th>
          <th>Window</th>
          <th>Sonar should see</th>
          <th>Trust</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {MANIFEST.map((m) => {
          const st = activeStatus(m, sim.t);
          return (
            <tr
              key={m.id}
              className={highlight && highlight.includes(m.id) ? "hl" : ""}
              onClick={() => onPick && onPick(m)}
              style={onPick ? { cursor: "pointer" } : undefined}
            >
              <td><code>{m.id}</code></td>
              <td>
                {m.title}
                <div className="cc-win">{m.who} &middot; declared area</div>
              </td>
              <td>{m.window.start} to {m.window.end}</td>
              <td>
                {m.expect.classes.map((c) => CLASS_LABEL[c]).join(" / ")}
                <div className="cc-win">{m.expect.speedKt[0]} to {m.expect.speedKt[1]} kt</div>
              </td>
              <td>
                <span className={`trust t${m.trustLevel}`}>{m.trust}</span>
                {m.checkIn && <div className="cc-win">radio check-in {m.checkIn}</div>}
              </td>
              <td><span className="badge" style={{ background: STATUS_COLOR[st] }}>{STATUS_LABEL[st]}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ManifestBoard({ sim }) {
  const [sel, setSel] = useState(null);
  const highlight = sel ? MANIFEST.filter((m) => m.sources.includes(sel)).map((m) => m.id) : null;

  return (
    <div className="page">
      <div className="page-head">
        <h2>Today's manifest: what is supposed to be in the water</h2>
        <p className="panel-note">
          Harbors already receive this information, but it arrives as emails, permit PDFs, spreadsheets and radio calls.
          We assemble it into one board, keep the source text next to every entry, and check every sonar detection against it.
          Click a source to see which entries came from it.
        </p>
        <p className="sample-note">
          Sample sources, invented for the demo. Parsing here is pre-computed to show the idea: in production a language model
          proposes the entries and a person confirms them. An entry the system is unsure about stays unconfirmed, and a thin
          manifest still works because "no match" simply means "ask a person".
        </p>
      </div>

      <div className="mf-grid">
        <div className="mf-sources">
          <h3 className="panel-heading">Messy sources in</h3>
          {SOURCES.map((s) => (
            <div
              key={s.id}
              className={`mf-source${sel === s.id ? " sel" : ""}`}
              onClick={() => setSel(sel === s.id ? null : s.id)}
            >
              <div className="mf-source-head">
                <span className="kind">{s.kind}</span>
                <span className="title">{s.title}</span>
                <span className="feeds">
                  feeds {MANIFEST.filter((m) => m.sources.includes(s.id)).map((m) => m.id).join(", ") || "context only"}
                </span>
              </div>
              <pre>{s.raw}</pre>
            </div>
          ))}
        </div>

        <div className="mf-parsed">
          <h3 className="panel-heading">One clean board out</h3>
          <ManifestTable sim={sim} highlight={highlight} onPick={(m) => setSel(m.sources[0])} />
          <p className="panel-note" style={{ marginTop: "0.9rem" }}>
            <strong>Also in the manifest data, not sonar-checked in this demo:</strong> {OTHER_KNOWN.surfaceCraft} surface
            vessels and craft (tracked by AIS and VTS), {OTHER_KNOWN.fixedSensors} fixed sensors, and {OTHER_KNOWN.wildlife} wildlife
            species (used to explain animal contacts).
          </p>
          <p className="panel-note">
            <strong>Trust levels matter.</strong> A permit the Harbor Master approved counts for more than a shared
            spreadsheet. A match only clears routine behavior that fits the claimed job, every clearing is logged for
            review, and "expected" never means "safe". The manifest is context for a person, not an authority over one.
          </p>
          <p className="panel-note">
            <strong>It works in both directions.</strong> Something unexpected in the water is one signal. Something
            expected that never shows up, like a research vehicle that stops reporting, is another.
          </p>
        </div>
      </div>
    </div>
  );
}
