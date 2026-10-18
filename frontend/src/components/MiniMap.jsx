import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { MANIFEST, SONAR_NODES } from "../sim/scenario.js";
import { activeStatus, predictAhead } from "../sim/useSimulation.js";

function Fit({ points, tick }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [34, 34], maxZoom: 15, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  return null;
}

export default function MiniMap({ sim, c, def }) {
  const pred = c.lost ? null : predictAhead(c, def.speedKt);
  const trail = c.trail.map((p) => p.pos);
  const pts = [...trail, c.pos, ...(pred ? [pred] : [])].filter(Boolean);
  const icon = L.divIcon({
    className: "",
    html: `<div class="contact-dot hot ${c.lost ? "lost" : ""}" style="--c:#ef4444;width:18px;height:18px"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  return (
    <div className="minimap">
      <MapContainer center={c.pos} zoom={14} scrollWheelZoom={false} className="minimap-map" attributionControl={false}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
        <Fit points={pts} tick={`${c.id}-${Math.floor(trail.length / 6)}`} />
        {MANIFEST.filter((m) => activeStatus(m, sim.t) === "active").map((m) => (
          <Circle key={m.id} center={m.zone.center} radius={m.zone.radiusM} pathOptions={{ color: "#22c55e", weight: 1, dashArray: "4 4", fillOpacity: 0.08 }} />
        ))}
        {SONAR_NODES.map((n) => (
          <Circle key={n.id} center={n.pos} radius={n.rangeM} pathOptions={{ color: "#a78bfa", weight: 1, fillOpacity: 0.03, opacity: sim.offline[n.id] ? 0.2 : 0.6 }} />
        ))}
        {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: "#ef4444", weight: 3 }} />}
        {pred && <Polyline positions={[c.pos, pred]} pathOptions={{ color: "#ef4444", weight: 2, dashArray: "3 7" }} />}
        <Marker position={c.pos} icon={icon} />
      </MapContainer>
      <div className="minimap-cap">Solid: track so far. Dotted: where it will be in about 3 min if it holds course (estimate).</div>
    </div>
  );
}
