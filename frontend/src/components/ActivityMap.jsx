import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { BUOYS, TIDE_GAUGES, WATCH_POSTS, BREAKWATER, CHANNEL_APPROACH, CHANNEL_LA, CHANNEL_LB } from "../map/harborGeography.js";
import { useState } from "react";
import { VesselMarkers, ResearchMarkers, MammalMarkers, UuvMarker } from "./SimulatedObjects.jsx";
import useActivitySimulation from "../hooks/useActivitySimulation.js";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite needs the default marker icon paths set explicitly.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Harbor center (Port of Los Angeles, San Pedro Bay). Edit these to re-center.
export const HARBOR_CENTER = [33.7361, -118.263];
export const HARBOR_ZOOM = 13;

// Custom icon factories
function sonarIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:10px;height:10px;border-radius:50%;
      background:#22d3ee;
      border:2px solid #0891b2;
      box-shadow:0 0 5px rgba(34,211,238,0.6);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function dotIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function RecenterButton() {
  const map = useMap();
  return (
    <button
      className="recenter"
      onClick={() => map.flyTo(HARBOR_CENTER, HARBOR_ZOOM, { duration: 0.8 })}
    >
      Recenter on harbor
    </button>
  );
}

// ── Sonar detection nodes ─────────────────────────────────────────────────────
// 20 fixed underwater/seabed sonar nodes covering all critical harbor water areas.
// rangeM: estimated detection radius in meters (passive sonar in harbor conditions).
// Grouped by zone for readability.
const SONAR_NODES = [
  // Zone A — Outer approach / traffic separation (3 nodes, large range)
  { id: "SN-01", pos: [33.612, -118.338], rangeM: 3500, label: "Outer Approach North\nOuter separation zone, inbound lane" },
  { id: "SN-02", pos: [33.595, -118.310], rangeM: 3500, label: "Outer Approach South\nOuter separation zone, inbound lane" },
  { id: "SN-03", pos: [33.648, -118.318], rangeM: 3000, label: "Precautionary Area West\nTraffic separation scheme edge" },

  // Zone B — Precautionary area / channel approach (3 nodes)
  { id: "SN-04", pos: [33.668, -118.305], rangeM: 2500, label: "Precautionary Area Center\nMain channel approach, high traffic" },
  { id: "SN-05", pos: [33.685, -118.295], rangeM: 2000, label: "Precautionary Area East\nInner approach, pilot boarding area" },
  { id: "SN-06", pos: [33.658, -118.285], rangeM: 2500, label: "South Approach Flank\nSouthern approach lane" },

  // Zone C — Breakwater entrance / Angel's Gate (3 nodes — critical chokepoint)
  { id: "SN-07", pos: [33.700, -118.292], rangeM: 1500, label: "Angel's Gate North\nBreakwater entrance, west–middle gap" },
  { id: "SN-08", pos: [33.695, -118.280], rangeM: 1500, label: "Angel's Gate South\nBreakwater entrance, inner side" },
  { id: "SN-09", pos: [33.710, -118.303], rangeM: 1800, label: "West Breakwater Flank\nOutside west arm, shallow shelf" },

  // Zone D — LA Harbor main basin (3 nodes)
  { id: "SN-10", pos: [33.718, -118.282], rangeM: 1200, label: "LA Channel Entry\nMain channel, LA fork entry" },
  { id: "SN-11", pos: [33.727, -118.274], rangeM: 1000, label: "LA Main Basin West\nLAHD terminal approaches" },
  { id: "SN-12", pos: [33.735, -118.265], rangeM: 1000, label: "LA Main Basin East\nInner harbor, berth row" },

  // Zone E — Long Beach channel / outer basin (3 nodes)
  { id: "SN-13", pos: [33.715, -118.265], rangeM: 1500, label: "LB Channel Entry\nMain channel, LB fork entry" },
  { id: "SN-14", pos: [33.730, -118.248], rangeM: 1200, label: "LB Outer Basin\nLong Beach outer harbor" },
  { id: "SN-15", pos: [33.748, -118.230], rangeM: 1000, label: "LB Inner Basin\nLong Beach terminal zone" },

  // Zone F — Inner harbor / marina / pier areas (3 nodes)
  { id: "SN-16", pos: [33.742, -118.260], rangeM: 800,  label: "Inner Harbor North\nMarina del Rey approach, quiet water" },
  { id: "SN-17", pos: [33.750, -118.272], rangeM: 800,  label: "Research Berth Area\nR/V berth and ROV operations zone" },
  { id: "SN-18", pos: [33.760, -118.250], rangeM: 800,  label: "LB Ferry Terminal\nPassenger terminal pier zone" },

  // Zone G — Cabrillo Beach / south anchorage (2 nodes)
  { id: "SN-19", pos: [33.705, -118.268], rangeM: 1200, label: "Cabrillo Beach Flank\nSouth inner harbor, anchorage" },
  { id: "SN-20", pos: [33.690, -118.258], rangeM: 1500, label: "South Anchorage\nAnchorage area, east of channel" },
];

const LAYERS = ["buoys", "gauges", "watchPosts", "radii", "breakwater", "channel", "vessels", "research", "missionAreas", "mammals", "uuv", "sonar", "sonarRanges"];

export default function ActivityMap() {
  const [tiles, setTiles] = useState("street");
  const positions = useActivitySimulation();
  const [visible, setVisible] = useState(
    Object.fromEntries(LAYERS.map((k) => [k, true]))
  );

  function toggle(key) {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  }

  const layers = {
    street: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri",
    },
  };
  const layer = layers[tiles];

  return (
    <>
    <div className="map-shell">
      <MapContainer center={HARBOR_CENTER} zoom={HARBOR_ZOOM} scrollWheelZoom className="map">
        <TileLayer key={tiles} url={layer.url} attribution={layer.attribution} />

        {/* San Pedro Breakwater */}
        {visible.breakwater && (
          <Polyline positions={BREAKWATER} pathOptions={{ color: "#888", weight: 4, dashArray: "6 4" }}>
            <Popup>San Pedro Breakwater<br />3.1 miles, US Army Corps of Engineers</Popup>
          </Polyline>
        )}

        {/* Main shipping channel — approach + LA fork + LB fork */}
        {visible.channel && (<>
          <Polyline positions={CHANNEL_APPROACH} pathOptions={{ color: "#f59e0b", weight: 3, dashArray: "10 6", opacity: 0.9 }}>
            <Popup>Main Channel — Inbound Approach<br />Traffic separation zone to breakwater entrance</Popup>
          </Polyline>
          <Polyline positions={CHANNEL_LA} pathOptions={{ color: "#f59e0b", weight: 2.5, dashArray: "10 6", opacity: 0.9 }}>
            <Popup>LA Fork — Port of Los Angeles<br />NW into LAHD main basin</Popup>
          </Polyline>
          <Polyline positions={CHANNEL_LB} pathOptions={{ color: "#fbbf24", weight: 2.5, dashArray: "10 6", opacity: 0.9 }}>
            <Popup>LB Fork — Port of Long Beach<br />NE into Long Beach inner basin</Popup>
          </Polyline>
        </>)}

        {/* NDBC wave/weather buoys */}
        {visible.buoys && BUOYS.map((b) => (
          <Marker key={b.id} position={b.pos} icon={dotIcon("#0a84ff")}>
            <Popup>
              <strong>NOAA NDBC Buoy {b.id}</strong><br />
              {b.label}
            </Popup>
          </Marker>
        ))}

        {/* NOAA tide gauges */}
        {visible.gauges && TIDE_GAUGES.map((g) => (
          <Marker key={g.id} position={g.pos} icon={dotIcon("#06b6d4")}>
            <Popup>
              <strong>NOAA Tide Gauge {g.id}</strong><br />
              {g.label}
            </Popup>
          </Marker>
        ))}

        {/* Harbor watch posts — detection radius rings */}
        {visible.radii && WATCH_POSTS.map((w) => (
          <Circle
            key={`${w.id}-radius`}
            center={w.pos}
            radius={w.detectionRadius}
            pathOptions={{ color: "#f97316", weight: 1.5, fillOpacity: 0.06, dashArray: "4 4" }}
          />
        ))}

        {/* Harbor watch posts — markers */}
        {visible.watchPosts && WATCH_POSTS.map((w) => (
          <Marker key={w.id} position={w.pos} icon={dotIcon("#f97316")}>
            <Popup>
              <strong>{w.label.split("\n")[0]}</strong><br />
              {w.label.split("\n")[1]}<br />
              <span style={{ fontSize: "0.75em", color: "#888" }}>
                Est. detection radius: {(w.detectionRadius / 1000).toFixed(1)} km
              </span>
            </Popup>
          </Marker>
        ))}

        {/* Simulated vessels */}
        <VesselMarkers visible={visible.vessels} positions={positions} />

        {/* Simulated research tech + mission areas */}
        <ResearchMarkers visible={visible.research} missionVisible={visible.missionAreas} positions={positions} />

        {/* Marine mammal sightings */}
        <MammalMarkers visible={visible.mammals} positions={positions} />

        {/* Sonar detection nodes — range circles */}
        {visible.sonarRanges && SONAR_NODES.map((s) => (
          <Circle
            key={`${s.id}-range`}
            center={s.pos}
            radius={s.rangeM}
            pathOptions={{ color: "#22d3ee", weight: 1, fillOpacity: 0.04, dashArray: "3 5", opacity: 0.5 }}
          />
        ))}

        {/* Sonar detection nodes — markers */}
        {visible.sonar && SONAR_NODES.map((s) => (
          <Marker key={s.id} position={s.pos} icon={sonarIcon()}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
              <strong>{s.label.split("\n")[0]}</strong>
            </Tooltip>
            <Popup>
              <strong>{s.label.split("\n")[0]}</strong><br />
              {s.label.split("\n")[1]}<br />
              <span style={{ fontSize: "0.75em", color: "#888" }}>
                Demo range estimate: {(s.rangeM / 1000).toFixed(1)} km &nbsp;·&nbsp; {s.id}
              </span>
            </Popup>
          </Marker>
        ))}

        {/* Unauthorized UUV */}
        <UuvMarker visible={visible.uuv} positions={positions} />

        <RecenterButton />
      </MapContainer>

      {/* Legend — rendered outside MapContainer, below the map shell */}
      <div className="layer-toggle">
        <button className={tiles === "street" ? "on" : ""} onClick={() => setTiles("street")}>Street</button>
        <button className={tiles === "satellite" ? "on" : ""} onClick={() => setTiles("satellite")}>Satellite</button>
      </div>
    </div>
    <div className="map-legend">
      <button className={`legend-item legend-toggle${visible.buoys ? " on" : ""}`} onClick={() => toggle("buoys")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0a84ff", display: "inline-block", flexShrink: 0 }} />
        NDBC Wave Buoy
      </button>
      <button className={`legend-item legend-toggle${visible.gauges ? " on" : ""}`} onClick={() => toggle("gauges")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#06b6d4", display: "inline-block", flexShrink: 0 }} />
        NOAA Tide Gauge
      </button>
      <button className={`legend-item legend-toggle${visible.watchPosts ? " on" : ""}`} onClick={() => toggle("watchPosts")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block", flexShrink: 0 }} />
        Harbor Watch / Patrol
      </button>
      <button className={`legend-item legend-toggle${visible.radii ? " on" : ""}`} onClick={() => toggle("radii")}>
        <svg width="20" height="14"><circle cx="10" cy="7" r="6" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
        Detection Radius
      </button>
      <button className={`legend-item legend-toggle${visible.breakwater ? " on" : ""}`} onClick={() => toggle("breakwater")}>
        <span style={{ width: 24, height: 3, background: "#888", display: "inline-block", flexShrink: 0 }} />
        Breakwater
      </button>
      <button className={`legend-item legend-toggle${visible.channel ? " on" : ""}`} onClick={() => toggle("channel")}>
        <span style={{ width: 24, height: 3, background: "#f59e0b", display: "inline-block", flexShrink: 0 }} />
        Shipping Channel
      </button>
      <span style={{ width: 1, background: "#1e3a52", alignSelf: "stretch", margin: "0 4px" }} />
      <button className={`legend-item legend-toggle${visible.vessels ? " on" : ""}`} onClick={() => toggle("vessels")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e2e8f0", border: "1.5px solid #888", display: "inline-block", flexShrink: 0 }} />
        Vessels
      </button>
      <button className={`legend-item legend-toggle${visible.research ? " on" : ""}`} onClick={() => toggle("research")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#a855f7", display: "inline-block", flexShrink: 0 }} />
        Research Tech
      </button>
      <button className={`legend-item legend-toggle${visible.missionAreas ? " on" : ""}`} onClick={() => toggle("missionAreas")}>
        <svg width="20" height="14"><rect x="2" y="3" width="16" height="8" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
        Mission Areas
      </button>
      <button className={`legend-item legend-toggle${visible.mammals ? " on" : ""}`} onClick={() => toggle("mammals")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#14b8a6", display: "inline-block", flexShrink: 0 }} />
        Marine Mammals
      </button>
      <button className={`legend-item legend-toggle${visible.sonar ? " on" : ""}`} onClick={() => toggle("sonar")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22d3ee", border: "1.5px solid #0891b2", display: "inline-block", flexShrink: 0 }} />
        Sonar Nodes (simulated)
      </button>
      <button className={`legend-item legend-toggle${visible.sonarRanges ? " on" : ""}`} onClick={() => toggle("sonarRanges")}>
        <svg width="20" height="14"><circle cx="10" cy="7" r="6" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.8" /></svg>
        Sonar Range
      </button>
      <button className={`legend-item legend-toggle${visible.uuv ? " on" : ""}`} onClick={() => toggle("uuv")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
        Unknown UUV
      </button>
    </div>
    </>
  );
}
