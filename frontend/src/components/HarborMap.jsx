import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { BUOYS, TIDE_GAUGES, WATCH_POSTS, BREAKWATER, CHANNEL_APPROACH, CHANNEL_LA, CHANNEL_LB } from "../map/harborGeography.js";
import { Fragment, useState, useEffect } from "react";
import { DEMO_CENTER, DEMO_ZOOM, MANIFEST, SONAR_NODES } from "../sim/scenario.js";
import { activeStatus, contactDefs, predictAhead, STAGE_STYLE } from "../sim/useSimulation.js";
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
export const HARBOR_CENTER = DEMO_CENTER;
export const HARBOR_ZOOM = DEMO_ZOOM;

// Custom icon factories
function dotIcon(color, opacity = 1) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5);opacity:${opacity}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function sonarIcon(id, online) {
  const c = online ? "#a78bfa" : "#64748b";
  return L.divIcon({
    className: "",
    html: `<div class="sonar-pin" style="border-color:${c};color:${c}"><span>${id}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function contactIcon(c) {
  const st = STAGE_STYLE[c.stage] || STAGE_STYLE.pending;
  const hot = c.stage === "handoff";
  const busy = ["detected", "tracking", "checking"].includes(c.stage);
  const cls = ["contact-dot", hot ? "hot" : "", busy ? "busy" : "", c.lost ? "lost" : ""].join(" ");
  const size = c.stage === "discarded" ? 12 : 18;
  return L.divIcon({
    className: "",
    html: `<div class="${cls}" style="--c:${st.color};width:${size}px;height:${size}px"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function SizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
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

// Four layers. "reference" is buoys, tide gauges and watch posts, hidden by default.
const LAYERS = ["reference", "sonar", "zones", "contacts"];
const DEFAULT_OFF = ["reference"];

export default function HarborMap({ sim, onSelectContact }) {
  const [tiles, setTiles] = useState("street");
  const [visible, setVisible] = useState(
    Object.fromEntries(LAYERS.map((k) => [k, !DEFAULT_OFF.includes(k)]))
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
        <SizeWatcher />
        <TileLayer key={tiles} url={layer.url} attribution={layer.attribution} />

        {/* San Pedro Breakwater */}
        {(
          <Polyline positions={BREAKWATER} pathOptions={{ color: "#888", weight: 4, dashArray: "6 4" }}>
            <Popup>San Pedro Breakwater<br />3.1 miles, US Army Corps of Engineers</Popup>
          </Polyline>
        )}

        {/* Main shipping channel — approach + LA fork + LB fork */}
        {(<>
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
        {visible.reference && BUOYS.map((b) => (
          <Marker key={b.id} position={b.pos} icon={dotIcon("#0a84ff", 0.45)}>
            <Popup>
              <strong>NOAA NDBC Buoy {b.id}</strong><br />
              {b.label}
            </Popup>
          </Marker>
        ))}

        {/* NOAA tide gauges */}
        {visible.reference && TIDE_GAUGES.map((g) => (
          <Marker key={g.id} position={g.pos} icon={dotIcon("#06b6d4", 0.45)}>
            <Popup>
              <strong>NOAA Tide Gauge {g.id}</strong><br />
              {g.label}
            </Popup>
          </Marker>
        ))}

        {/* Harbor watch posts — markers */}
        {visible.reference && WATCH_POSTS.map((w) => (
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

        {/* Manifest zones: where expected underwater activity is */}
        {sim && visible.zones && MANIFEST.map((m) => {
          const st = activeStatus(m, sim.t);
          const col = st === "active" ? "#22c55e" : st === "expired" ? "#f59e0b" : "#64748b";
          return (
            <Polygon
              key={m.id}
              positions={m.zone.ring}
              pathOptions={{ color: col, weight: 1.5, fillOpacity: st === "active" ? 0.1 : 0.04, dashArray: "5 5", opacity: st === "active" ? 0.9 : 0.55 }}
            >
              <Tooltip direction="top" sticky>
                <strong>{m.id}</strong> {m.title}<br />
                {m.window.start} to {m.window.end} ({st})
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Simulated sonar nodes + range rings */}
        {sim && visible.sonar && SONAR_NODES.map((n) => {
          const online = !sim.offline[n.id];
          return (
            <Fragment key={n.id}>
              <Circle
                center={n.pos}
                radius={n.rangeM}
                pathOptions={{ color: online ? "#a78bfa" : "#64748b", weight: 1.5, fillOpacity: online ? 0.05 : 0.02, dashArray: online ? undefined : "2 6", opacity: online ? 0.8 : 0.5 }}
              />
              <Marker position={n.pos} icon={sonarIcon(n.id, online)}>
                <Popup>
                  <strong>Sonar node {n.id} (simulated)</strong><br />
                  {n.name}<br />
                  Est. range {(n.rangeM / 1000).toFixed(1)} km{online ? "" : " | OFFLINE"}
                </Popup>
              </Marker>
            </Fragment>
          );
        })}

        {/* Scripted contacts: trail, predicted path, marker */}
        {sim && visible.contacts && contactDefs(sim).map((def) => {
          const c = sim.contacts[def.id];
          if (!c || c.stage === "pending" || !c.pos) return null;
          const st = STAGE_STYLE[c.stage];
          const showPred = c.stage === "handoff" && !c.lost;
          const pred = showPred ? predictAhead(c, def.speedKt) : null;
          return (
            <Fragment key={def.id}>
              {c.trail.length > 1 && (
                <Polyline positions={c.trail.map((p) => p.pos)} pathOptions={{ color: st.color, weight: 3, opacity: 0.85 }} />
              )}
              {pred && (
                <Polyline positions={[c.pos, pred]} pathOptions={{ color: "#ef4444", weight: 2, dashArray: "3 7", opacity: 0.9 }} />
              )}
              <Marker position={c.pos} icon={contactIcon(c)} eventHandlers={{ click: () => onSelectContact && onSelectContact(def.id) }}>
                <Tooltip permanent={c.stage === "handoff" || c.stage === "checking"} direction="right" offset={[10, 0]}>
                  <strong>{def.id}</strong> {c.lost ? "track lost" : st.label}
                </Tooltip>
              </Marker>
            </Fragment>
          );
        })}

        <RecenterButton />
      </MapContainer>

      {/* Legend — rendered outside MapContainer, below the map shell */}
      <div className="layer-toggle">
        <button className={tiles === "street" ? "on" : ""} onClick={() => setTiles("street")}>Street</button>
        <button className={tiles === "satellite" ? "on" : ""} onClick={() => setTiles("satellite")}>Satellite</button>
      </div>
    </div>
    <div className="map-legend">
      <button className={`legend-item legend-toggle${visible.reference ? " on" : ""}`} onClick={() => toggle("reference")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block", flexShrink: 0 }} />
        Reference (buoys, tide gauges, watch posts)
      </button>
      <button className={`legend-item legend-toggle${visible.sonar ? " on" : ""}`} onClick={() => toggle("sonar")}>
        <span className="legend-sonar" />
        Sonar node (simulated)
      </button>
      <button className={`legend-item legend-toggle${visible.zones ? " on" : ""}`} onClick={() => toggle("zones")}>
        <svg width="20" height="14"><rect x="3" y="2" width="14" height="10" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
        Manifest zone
      </button>
      <button className={`legend-item legend-toggle${visible.contacts ? " on" : ""}`} onClick={() => toggle("contacts")}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
        Contacts: checking / cleared / needs decision
      </button>
    </div>
    </>
  );
}
