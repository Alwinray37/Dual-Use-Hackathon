import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useState } from "react";
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

// --- Sensor / infrastructure data (verified against NOAA live systems, Oct 2026) ---

// NOAA NDBC wave & weather buoys — confirmed active stations only
// 46222 and 46253 do not exist as active NDBC stations — removed.
// Nearest real buoys to San Pedro Bay:
const BUOYS = [
  { id: "46025", pos: [33.749, -119.053], label: "NDBC 46025 — Santa Monica Basin\nWave height, period, direction, wind, SST, pressure (~33 nm W)" },
  { id: "46086", pos: [32.501, -118.017], label: "NDBC 46086 — San Clemente Basin\nWave height, period, wind, SST (~45 nm SSW)" },
  { id: "46047", pos: [32.433, -119.527], label: "NDBC 46047 — Tanner Bank\nWave height, period, wind, SST (~80 nm SW)" },
  { id: "46069", pos: [33.650, -120.215], label: "NDBC 46069 — South Santa Rosa Island\nWave height, period, wind, SST (~55 nm NW)" },
];

// NOAA CO-OPS tide gauges — verified station IDs and coordinates
// 9410680 corrected: that ID is Terminal Island, not Cabrillo Beach (9410650)
const TIDE_GAUGES = [
  { id: "9410650", pos: [33.7067, -118.273], label: "NOAA Tide Gauge 9410650 — Cabrillo Beach\nMeasures: water level, tidal predictions" },
  { id: "9410660", pos: [33.720,  -118.272], label: "NOAA Tide Gauge 9410660 — Los Angeles Outer Harbor\nMeasures: water level, tidal height, sea temp" },
  { id: "9410678", pos: [33.7478, -118.216], label: "NOAA Tide Gauge 9410678 — Long Beach Fire Boat Pier\nMeasures: water level" },
  { id: "9410680", pos: [33.7517, -118.227], label: "NOAA Tide Gauge 9410680 — Long Beach, Terminal Island\nMeasures: water level, tidal predictions" },
  { id: "9410686", pos: [33.7717, -118.210], label: "NOAA Tide Gauge 9410686 — Long Beach, Inner Harbor\nMeasures: water level" },
];

// Harbor patrol / watch posts
// detectionRadius: estimated optical/camera coverage in meters
// LAHD: ~1km fixed camera coverage of inner basin
// LB Patrol: ~1.5km patrol boat dispatch zone + cameras
// USCG: ~2km broader surface radar + elevated camera position
const WATCH_POSTS = [
  { id: "lahd-sec",      pos: [33.736, -118.263], detectionRadius: 1000, label: "LA Harbor Department — Main Basin Security Post\nHarbor watch officer station" },
  { id: "lb-patrol",     pos: [33.752, -118.213], detectionRadius: 1500, label: "Long Beach Harbor Patrol HQ\nCovers Long Beach port basin" },
  { id: "uscg-san-pedro",pos: [33.714, -118.293], detectionRadius: 2000, label: "USCG Sector LA-LB — San Pedro\nCoast Guard sector command" },
];

// San Pedro Breakwater (western and middle arm — approximate real coords)
const BREAKWATER = [
  [33.700, -118.255],
  [33.699, -118.275],
  [33.704, -118.300],
  [33.712, -118.312],
];

// LA/LB Main Shipping Channel — based on NOAA Chart 18751
// Inbound approach on ~045° heading, splits inside the breakwater

// Inbound approach to precautionary area
const CHANNEL_APPROACH = [
  [33.590, -118.360], // outer separation zone / traffic lane
  [33.640, -118.330], // precautionary area SW edge
  [33.685, -118.308], // precautionary area center
  [33.706, -118.291], // breakwater entrance gap (west–middle arm)
];

// LA fork — NW into Port of Los Angeles basin
const CHANNEL_LA = [
  [33.706, -118.291], // breakwater entrance (shared split point)
  [33.715, -118.281], // bends NW past Angel's Gate
  [33.724, -118.276], // main basin entry
  [33.732, -118.272], // LAHD inner harbor
];

// Long Beach fork — NE into Port of Long Beach
const CHANNEL_LB = [
  [33.706, -118.291], // breakwater entrance (shared split point)
  [33.720, -118.265], // bends NE
  [33.740, -118.240], // LB outer harbor
  [33.754, -118.220], // LB inner basin
];

// Custom icon factories
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

const LAYERS = ["buoys", "gauges", "watchPosts", "radii", "breakwater", "channel"];

export default function HarborMap() {
  const [tiles, setTiles] = useState("street");
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
    </div>
    </>
  );
}
