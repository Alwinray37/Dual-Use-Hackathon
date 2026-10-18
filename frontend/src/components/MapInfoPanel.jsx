import { useState } from "react";
import ContactCheckPanel from "./ContactCheckPanel.jsx";
import { ManifestTable } from "./ManifestBoard.jsx";
import { SONAR_NODES, SONAR_RANGE_M } from "../sim/scenario.js";

const TABS = ["Contact Check", "Manifest", "Sensors", "Coverage Notes", "Data Sources", "About"];

// ── Tab content ────────────────────────────────────────────────────────────────

function SensorsTab() {
  return (
    <div>
      <h3 className="panel-heading">Sensors & Infrastructure on Map</h3>
      <table className="panel-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Name</th>
            <th>Measures</th>
            <th>Detection Radius</th>
          </tr>
        </thead>
        <tbody>
          {[...SONAR_ROWS, ...SENSOR_ROWS].map((r, i) => (
            <tr key={i}>
              <td><code>{r.id}</code></td>
              <td><span className="badge" style={{ background: TYPE_COLORS[r.type] }}>{r.type}</span></td>
              <td>{r.name}</td>
              <td>{r.measures}</td>
              <td>{r.radius}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoverageTab() {
  return (
    <div>
      <h3 className="panel-heading">Coverage Notes</h3>
      <p className="panel-note">
        Detection radii shown on the map are <strong>estimates</strong> based on typical optical/camera
        coverage for each station type in a working harbor environment. They do not represent sonar,
        radar, or any underwater detection capability. The purple <strong>sonar nodes</strong> are
        different: they are simulated for this demo, placed at the entrance and channel chokepoints.
      </p>
      <table className="panel-table">
        <thead>
          <tr>
            <th>Station</th>
            <th>Est. Radius</th>
            <th>Basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LAHD Main Basin Security</td>
            <td>1.0 km</td>
            <td>Fixed PTZ camera coverage of inner basin</td>
          </tr>
          <tr>
            <td>Long Beach Harbor Patrol HQ</td>
            <td>1.5 km</td>
            <td>Patrol boat dispatch zone + camera coverage</td>
          </tr>
          <tr>
            <td>USCG Sector LA-LB</td>
            <td>2.0 km</td>
            <td>Surface radar + elevated camera position</td>
          </tr>
        </tbody>
      </table>
      <p className="panel-note" style={{ marginTop: "0.75rem" }}>
        <strong>NDBC buoys and NOAA tide gauges have no spatial detection range.</strong> They are
        point sensors — they measure conditions at their exact location only and do not observe
        surrounding water.
      </p>
      <p className="panel-note">
        The simulated sonar nodes use a conservative {(SONAR_RANGE_M / 1000).toFixed(1)} km range. Commercial harbor sonar
        vendors quote up to about 1.5 km for small vehicles in good conditions, and real performance
        depends on depth, turbidity and traffic noise. Detection is treated as a solved input here:
        the product is the decision layer on top of it.
      </p>
    </div>
  );
}

function DataSourcesTab() {
  return (
    <div>
      <h3 className="panel-heading">Data Source References</h3>
      <p className="panel-note">These endpoints are listed for future integration. This demo does not request live data from them.</p>
      {DATA_SOURCES.map((src, i) => (
        <div key={i} className="source-card">
          <div className="source-name">{src.name}</div>
          <div className="source-desc">{src.desc}</div>
          <div className="source-meta">
            <span><strong>Endpoint:</strong> <code>{src.endpoint}</code></span>
            <span><strong>Format:</strong> {src.format}</span>
            <span><strong>Auth:</strong> {src.auth}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AboutTab() {
  return (
    <div>
      <h3 className="panel-heading">About This Map</h3>
      <p className="panel-note">
        This map visualizes real-world sensor infrastructure and maritime features in San Pedro Bay,
        covering the Port of Los Angeles and Port of Long Beach — the busiest container port complex
        in the Western Hemisphere.
      </p>
      <p className="panel-note">
        Built for the <strong>Dual-Use Hackathon</strong> (InnovateLA at USC Viterbi, Oct 16–18, 2026)
        under the <strong>Crisis Mitigation</strong> track, vertical:{" "}
        <em>Under the Water</em> (with NULL Systems).
      </p>
      <p className="panel-note">
        The scenario: an unauthorized autonomous underwater vehicle (UUV) has entered a working harbor.
        This map supports the harbor watch officer — the human in the loop — by surfacing sensor
        coverage, known infrastructure, and shipping traffic context to inform a safe handoff decision.
      </p>
      <ul className="panel-list">
        <li>Buoy and tide gauge locations: NOAA NDBC / CO-OPS public records</li>
        <li>Breakwater geometry: US Army Corps of Engineers (approximate)</li>
        <li>Shipping channel centerline: NOAA nautical chart approximation</li>
        <li>Detection radii: estimated, not measured — see Coverage Notes tab</li>
      </ul>
    </div>
  );
}

// ── Static data ────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  "Wave Buoy":  "#0a84ff",
  "Tide Gauge": "#0891b2",
  "Watch Post": "#ea6a12",
  "Sonar Node": "#8b5cf6",
};

// Verified against NOAA NDBC live station list and CO-OPS API, Oct 2026.
// 46222 and 46253 removed — not active NDBC stations.
// 9410680 corrected to Terminal Island; Cabrillo Beach is 9410650.
const SENSOR_ROWS = [
  { id: "46025",    type: "Wave Buoy",  name: "NDBC 46025 — Santa Monica Basin",      measures: "Wave height, period, direction, wind, SST, pressure", radius: "None (point sensor)" },
  { id: "46086",    type: "Wave Buoy",  name: "NDBC 46086 — San Clemente Basin",      measures: "Wave height, period, wind, SST",                      radius: "None (point sensor)" },
  { id: "46047",    type: "Wave Buoy",  name: "NDBC 46047 — Tanner Bank",             measures: "Wave height, period, wind, SST",                      radius: "None (point sensor)" },
  { id: "46069",    type: "Wave Buoy",  name: "NDBC 46069 — South Santa Rosa Island", measures: "Wave height, period, wind, SST",                      radius: "None (point sensor)" },
  { id: "9410650",  type: "Tide Gauge", name: "CO-OPS 9410650 — Cabrillo Beach",      measures: "Water level, tidal predictions",                      radius: "None (point sensor)" },
  { id: "9410660",  type: "Tide Gauge", name: "CO-OPS 9410660 — LA Outer Harbor",     measures: "Water level, tidal height, sea temp",                 radius: "None (point sensor)" },
  { id: "9410678",  type: "Tide Gauge", name: "CO-OPS 9410678 — LB Fire Boat Pier",   measures: "Water level",                                         radius: "None (point sensor)" },
  { id: "9410680",  type: "Tide Gauge", name: "CO-OPS 9410680 — LB Terminal Island",  measures: "Water level, tidal predictions",                      radius: "None (point sensor)" },
  { id: "9410686",  type: "Tide Gauge", name: "CO-OPS 9410686 — LB Inner Harbor",     measures: "Water level",                                         radius: "None (point sensor)" },
  { id: "lahd-sec",   type: "Watch Post", name: "LAHD Main Basin Security",           measures: "Visual / camera surveillance",                        radius: "~1.0 km (est.)" },
  { id: "lb-patrol",  type: "Watch Post", name: "Long Beach Harbor Patrol HQ",        measures: "Visual / camera + patrol vessel",                     radius: "~1.5 km (est.)" },
  { id: "uscg-la-lb", type: "Watch Post", name: "USCG Sector LA-LB",                 measures: "Surface radar + elevated camera",                     radius: "~2.0 km (est.)" },
];

// Simulated sonar nodes used by the demo scenarios (see src/sim/scenario.js).
const SONAR_ROWS = SONAR_NODES.map((n) => ({
  id: n.id,
  type: "Sonar Node",
  name: `${n.name} (simulated)`,
  measures: "Active/passive sonar tracks: position, speed, heading, class",
  radius: `~${(SONAR_RANGE_M / 1000).toFixed(1)} km (est.)`,
}));

const DATA_SOURCES = [
  {
    name: "NOAA NDBC — Wave & Weather Buoys",
    desc: "Real-time buoy observations: wave height, period, direction, wind speed, SST, pressure.",
    endpoint: "ndbc.noaa.gov/station_page.php?station={id}",
    format: "Text / JSON",
    auth: "None (free)",
  },
  {
    name: "NOAA CO-OPS — Tide Gauges",
    desc: "Real-time water level, tidal predictions, and sea surface temperature at fixed pier stations.",
    endpoint: "api.tidesandcurrents.noaa.gov/api/prod/",
    format: "JSON",
    auth: "None (free)",
  },
  {
    name: "NWS Alerts API",
    desc: "Active weather watches, warnings, and advisories including marine and coastal hazards.",
    endpoint: "api.weather.gov/alerts/active",
    format: "GeoJSON",
    auth: "None (free) — poll max every 30s",
  },
  {
    name: "USGS Earthquake Feed",
    desc: "Real-time earthquake events with magnitude, depth, location, and tsunami flag.",
    endpoint: "earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    format: "GeoJSON",
    auth: "None (free)",
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function MapInfoPanel({ sim, dispatch }) {
  const [active, setActive] = useState("Contact Check");

  const TAB_CONTENT = {
    "Contact Check":    <ContactCheckPanel sim={sim} dispatch={dispatch} />,
    "Manifest":         <ManifestTable sim={sim} />,
    "Sensors":          <SensorsTab />,
    "Coverage Notes":   <CoverageTab />,
    "Data Sources":     <DataSourcesTab />,
    "About":            <AboutTab />,
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
