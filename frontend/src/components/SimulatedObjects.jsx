import React from "react";
import { Marker, Popup, Polygon, Tooltip } from "react-leaflet";
import L from "leaflet";
import vesselsData from "../../../test-data/vessels.json";
import researchData from "../../../test-data/research_tech.json";
import mammalsData from "../../../test-data/marine_mammals.json";
import { researchStartPosition } from "../activity/researchPosition.js";

// ── Status colour logic ────────────────────────────────────────────────────────

// Research tech status → dot colour
function researchStatusColor(entry) {
  if (entry.status === "overdue")         return "#ef4444"; // red
  if (entry.status === "permit_expired")  return "#f59e0b"; // amber
  if (entry.status === "on_mission")      return "#22c55e"; // green
  if (entry.status === "active")          return "#22c55e"; // green
  return "#94a3b8";                                         // grey — fixed/inactive
}

// Vessel status → dot colour
function vesselStatusColor(entry) {
  const st = entry.ais.status;
  const dq = entry.data_quality;
  if (dq && dq.ais_signal === "lost")     return "#ef4444"; // red — went silent
  if (st === 5)  return "#94a3b8"; // grey  — moored
  if (st === 3)  return "#f59e0b"; // amber — restricted manoeuvrability
  if (st === 0 || (st == null && entry.ais.speed > 0)) return "#22c55e"; // green — underway
  return "#94a3b8";
}

// Marine mammal sighting — always teal, no status
const MAMMAL_COLOR = "#14b8a6";

// ── Icon builders ──────────────────────────────────────────────────────────────

/**
 * Dot with a small status indicator in the top-right corner (vessels only).
 */
function statusDotIcon(bodyColor, statusColor) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:14px;height:14px;">
        <div style="
          width:14px;height:14px;border-radius:50%;
          background:${bodyColor};
          box-shadow:0 0 4px rgba(0,0,0,.5);
        "></div>
        <div style="
          position:absolute;top:-2px;right:-2px;
          width:6px;height:6px;border-radius:50%;
          background:${statusColor};
          border:1px solid #fff;
        "></div>
      </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Plain dot for research tech — no status indicator on the icon.
 */
function researchDotIcon(dashed = false) {
  const style = dashed
    ? `border: 2px dashed #a855f7; background: rgba(0,0,0,0.45);`
    : `background: #a855f7;`;
  return L.divIcon({
    className: "",
    html: `<div style="width:13px;height:13px;border-radius:50%;${style}box-shadow:0 0 4px rgba(0,0,0,.5);"></div>`,
    iconSize: [13, 13],
    iconAnchor: [6, 6],
  });
}

function mammalIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:${MAMMAL_COLOR};
      border:2px solid #fff;
      box-shadow:0 0 4px rgba(0,0,0,.5);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// ── Submerged platform types ───────────────────────────────────────────────────
const SUBMERGED_TYPES = new Set(["auv", "rov", "dive_operation"]);

// ── Mission area polygon coords ───────────────────────────────────────────────
// GeoJSON coords are [lon, lat]; Leaflet needs [lat, lon]
function toLatLng(coords) {
  return coords[0].map(([lon, lat]) => [lat, lon]);
}

// ── Vessel type label ──────────────────────────────────────────────────────────
function vesselTypeLabel(shiptype) {
  if (shiptype >= 70 && shiptype <= 79) return "Cargo";
  if (shiptype >= 80 && shiptype <= 89) return "Tanker";
  if (shiptype === 52)  return "Tug";
  if (shiptype === 31)  return "Towing";
  if (shiptype === 33)  return "Dredger";
  if (shiptype === 50)  return "Pilot vessel";
  if (shiptype === 55)  return "Law enforcement";
  if (shiptype >= 60 && shiptype <= 69) return "Passenger";
  if (shiptype === 36)  return "Sailing";
  if (shiptype === 30)  return "Fishing";
  if (shiptype === 59)  return "Special craft";
  return `Type ${shiptype}`;
}

// ── Components ─────────────────────────────────────────────────────────────────

export function VesselMarkers({ visible, positions }) {
  if (!visible) return null;
  return vesselsData.entries.map((v) => {
    const { ais, schedule, data_quality: dq } = v;
    const pos = positions?.[v.entry_id] ?? [ais.lat, ais.lon];
    const statusColor = vesselStatusColor(v);
    return (
      <Marker key={v.entry_id} position={pos} icon={statusDotIcon("#e2e8f0", statusColor)}>
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
          <strong>{ais.shipname}</strong>
        </Tooltip>
        <Popup minWidth={200}>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {ais.shipname}
              <span style={{
                marginLeft: 6, padding: "1px 6px", borderRadius: 99,
                background: statusColor, color: "#fff", fontSize: 10, fontWeight: 600
              }}>
                {dq?.ais_signal === "lost" ? "AIS LOST" : ais.status_text ?? (ais.speed > 0 ? "UNDERWAY (INFERRED)" : "—")}
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ color: "#666", paddingRight: 8 }}>Type</td><td>{vesselTypeLabel(ais.shiptype)}</td></tr>
                <tr><td style={{ color: "#666" }}>MMSI</td><td>{ais.mmsi}</td></tr>
                <tr><td style={{ color: "#666" }}>Speed</td><td>{ais.speed} kts @ {ais.course}°</td></tr>
                <tr><td style={{ color: "#666" }}>Movement</td><td>{schedule.movement}</td></tr>
                {ais.destination && ais.destination !== "" && (
                  <tr><td style={{ color: "#666" }}>Dest.</td><td>{ais.destination}</td></tr>
                )}
                {ais.draught && (
                  <tr><td style={{ color: "#666" }}>Draught</td><td>{ais.draught} m</td></tr>
                )}
                {dq && (
                  <tr><td style={{ color: "#ef4444" }} colSpan={2}>⚠ {dq.note}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Popup>
      </Marker>
    );
  });
}

export function ResearchMarkers({ visible, missionVisible, positions }) {
  if (!visible && !missionVisible) return null;

  return researchData.entries.map((e) => {
    const start = researchStartPosition(e);
    if (!start) return null;

    const pos = positions?.[e.entry_id] ?? start;
    const statusColor = researchStatusColor(e);
    const isSubmerged = SUBMERGED_TYPES.has(e.platform_type);
    const hasMission = e.mission?.area?.coordinates;

    return (
      <React.Fragment key={e.entry_id}>
        {/* Mission area polygon */}
        {missionVisible && hasMission && (
          <Polygon
            positions={toLatLng(e.mission.area.coordinates)}
            pathOptions={{ color: "#a855f7", weight: 1.5, fillOpacity: 0.08, dashArray: "5 4" }}
          >
            <Tooltip sticky opacity={0.9}>
              <strong>{e.name}</strong> — declared mission area
            </Tooltip>
          </Polygon>
        )}

        {/* Marker — only if research layer is visible */}
        {visible && (
          <Marker position={pos} icon={researchDotIcon(isSubmerged)}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: statusColor, border: "1px solid #ccc", flexShrink: 0
                }} />
                <strong>{e.name}</strong>
              </div>
            </Tooltip>
            <Popup minWidth={210}>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  <span style={{
                    display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                    background: statusColor, flexShrink: 0, border: "1px solid #ccc"
                  }} />
                  {e.name}
                  <span style={{
                    marginLeft: "auto", padding: "1px 6px", borderRadius: 99,
                    background: statusColor, color: "#fff", fontSize: 10, fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {e.status?.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td style={{ color: "#666", paddingRight: 8 }}>Platform</td><td>{e.platform_type}</td></tr>
                    {!e.last_known && !e.position && (
                      <tr><td style={{ color: "#666" }}>Position</td><td>Mission area center (estimated)</td></tr>
                    )}
                    <tr><td style={{ color: "#666" }}>Owner</td><td>{e.owner?.org}</td></tr>
                    {e.permit && (
                      <tr><td style={{ color: "#666" }}>Permit</td><td>{e.permit.ref} (exp {e.permit.valid_to})</td></tr>
                    )}
                    {e.mission?.window && (
                      <tr>
                        <td style={{ color: "#666" }}>Window</td>
                        <td>{e.mission.window.start.slice(11,16)}–{e.mission.window.end.slice(11,16)} UTC</td>
                      </tr>
                    )}
                    {e.mission?.pattern && (
                      <tr><td style={{ color: "#666" }}>Pattern</td><td>{e.mission.pattern}</td></tr>
                    )}
                    {e.last_known && (
                      <tr><td style={{ color: "#666" }}>Last seen</td><td>{e.last_known.time.slice(11,16)} UTC via {e.last_known.source}</td></tr>
                    )}
                    <tr><td style={{ color: "#666" }}>Acoustic</td><td>{e.signature?.emits_acoustic ? "yes" : "no"} {e.signature?.note ? `— ${e.signature.note}` : ""}</td></tr>
                    {e.notes && (
                      <tr><td style={{ color: "#666", fontStyle: "italic" }} colSpan={2}>{e.notes}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Popup>
          </Marker>
        )}
      </React.Fragment>
    );
  });
}

export function MammalMarkers({ visible, positions }) {
  if (!visible) return null;
  return mammalsData.recent_sightings.map((s) => {
    const pos = positions?.[s.event_id] ?? [s.decimalLatitude, s.decimalLongitude];
    return (
      <Marker key={s.event_id} position={pos} icon={mammalIcon()}>
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
          <strong>{s.vernacularName}</strong>
        </Tooltip>
        <Popup minWidth={200}>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {s.vernacularName}
              <span style={{
                marginLeft: 6, padding: "1px 6px", borderRadius: 99,
                background: MAMMAL_COLOR, color: "#fff", fontSize: 10, fontWeight: 600
              }}>
                SIGHTING
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ color: "#666", paddingRight: 8 }}>Species</td><td><em>{s.scientificName}</em></td></tr>
                <tr><td style={{ color: "#666" }}>Count</td><td>{s.individualCount}</td></tr>
                <tr><td style={{ color: "#666" }}>Time</td><td>{s.eventDate.slice(11, 16)} UTC</td></tr>
                <tr><td style={{ color: "#666" }}>Behavior</td><td>{s.behavior}</td></tr>
                <tr><td style={{ color: "#666" }}>±</td><td>{s.coordinateUncertaintyInMeters} m</td></tr>
                {s.occurrenceRemarks && (
                  <tr><td style={{ color: "#666", fontStyle: "italic" }} colSpan={2}>{s.occurrenceRemarks}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Popup>
      </Marker>
    );
  });
}

// ── Unauthorized UUV ───────────────────────────────────────────────────────────

function uuvIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:16px;height:16px;">
        <div style="
          width:16px;height:16px;border-radius:50%;
          background:#ef4444;
          border:2px solid #fff;
          box-shadow:0 0 8px rgba(239,68,68,0.8);
          animation:uuv-pulse 1.2s ease-in-out infinite;
        "></div>
      </div>
      <style>
        @keyframes uuv-pulse {
          0%,100% { box-shadow: 0 0 8px rgba(239,68,68,0.8); }
          50%      { box-shadow: 0 0 18px rgba(239,68,68,1); }
        }
      </style>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function UuvMarker({ visible, positions }) {
  if (!visible) return null;
  const pos = positions?.["UUV-UNKNOWN"] ?? [33.672, -118.288];
  const isInside = pos[0] >= 33.706;

  return (
    <Marker position={pos} icon={uuvIcon()}>
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95} sticky>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
            background: "#ef4444", border: "1px solid #ccc", flexShrink: 0
          }} />
          <strong>UNKNOWN UUV</strong>
        </div>
      </Tooltip>
      <Popup minWidth={210}>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <span style={{
              display: "inline-block", width: 10, height: 10, borderRadius: "50%",
              background: "#ef4444", flexShrink: 0, border: "1px solid #ccc"
            }} />
            UNKNOWN UUV
            <span style={{
              marginLeft: "auto", padding: "1px 6px", borderRadius: 99,
              background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 600
            }}>
              UNIDENTIFIED
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ color: "#666", paddingRight: 8 }}>Status</td><td style={{ color: "#ef4444", fontWeight: 600 }}>{isInside ? "INSIDE HARBOR" : "APPROACHING"}</td></tr>
              <tr><td style={{ color: "#666" }}>AIS</td><td>None — no transponder</td></tr>
              <tr><td style={{ color: "#666" }}>Permit</td><td>None on record</td></tr>
              <tr><td style={{ color: "#666" }}>Speed</td><td>~3.5 kts</td></tr>
              <tr><td style={{ color: "#666" }}>Depth</td><td>Unknown — submerged</td></tr>
              <tr><td style={{ color: "#ef4444", fontWeight: 600 }} colSpan={2}>⚠ No matching manifest entry. Escalation required.</td></tr>
            </tbody>
          </table>
        </div>
      </Popup>
    </Marker>
  );
}
