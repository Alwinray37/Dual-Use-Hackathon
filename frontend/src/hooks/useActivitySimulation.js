import { useState, useEffect, useRef } from "react";
import vesselsData from "../../../test-data/vessels.json";
import researchData from "../../../test-data/research_tech.json";
import mammalsData from "../../../test-data/marine_mammals.json";
import { researchStartPosition } from "../activity/researchPosition.js";

const TICK_MS = 2000;

// Hardcoded speed multiplier — 120x real time so movement is visible in demo
// At 120x, a 9.5kt vessel moves ~0.0035° lat per tick (visibly across the harbor)
const SPEED_MULT = 120;

// Degrees per meter (approximate at this latitude)
const DEG_PER_M = 1 / 111320;

// Knots → meters per second
const KTS_TO_MPS = 0.514444;

// ── Movement helpers ───────────────────────────────────────────────────────────

function moveHeading(lat, lon, speedKts, headingDeg) {
  const dtSec = (TICK_MS / 1000) * SPEED_MULT;
  const distM = speedKts * KTS_TO_MPS * dtSec;
  const rad = (headingDeg * Math.PI) / 180;
  const dLat = Math.cos(rad) * distM * DEG_PER_M;
  const dLon = Math.sin(rad) * distM * DEG_PER_M / Math.cos((lat * Math.PI) / 180);
  return [lat + dLat, lon + dLon];
}

function randomWalk(lat, lon, maxDeltaDeg = 0.0003) {
  return [
    lat + (Math.random() - 0.5) * 2 * maxDeltaDeg,
    lon + (Math.random() - 0.5) * 2 * maxDeltaDeg,
  ];
}

function clampToBbox(lat, lon, bbox) {
  // bbox: { minLat, maxLat, minLon, maxLon }
  return [
    Math.max(bbox.minLat, Math.min(bbox.maxLat, lat)),
    Math.max(bbox.minLon, Math.min(bbox.maxLon, lon)),
  ];
}

// Parse a GeoJSON polygon ring into a bounding box
function polygonToBbox(coordinates) {
  const ring = coordinates[0];
  const lats = ring.map(([, lat]) => lat);
  const lons = ring.map(([lon]) => lon);
  return {
    minLat: Math.min(...lats), maxLat: Math.max(...lats),
    minLon: Math.min(...lons), maxLon: Math.max(...lons),
  };
}

// Lawnmower state per entry (stored in ref)
function initLawnmower(bbox, speedKts) {
  return {
    direction: 1,         // 1 = moving in +lon, -1 = moving in -lon
    rowLat: bbox.minLat,  // current row latitude
    rowStep: 0.0005,      // lat step between rows
    speedKts,
  };
}

function stepLawnmower(lat, lon, state, bbox) {
  const dtSec = (TICK_MS / 1000) * SPEED_MULT;
  const distDeg = (state.speedKts * KTS_TO_MPS * dtSec) * DEG_PER_M;

  let newLon = lon + state.direction * distDeg;
  let newLat = state.rowLat;

  // Hit side wall — flip direction, advance row
  if (newLon > bbox.maxLon || newLon < bbox.minLon) {
    state.direction *= -1;
    state.rowLat += state.rowStep;
    if (state.rowLat > bbox.maxLat) state.rowLat = bbox.minLat;
    newLon = Math.max(bbox.minLon, Math.min(bbox.maxLon, newLon));
    newLat = state.rowLat;
  }

  return [newLat, newLon];
}

// ── Build initial state from JSON ──────────────────────────────────────────────

function buildInitialPositions() {
  const pos = {};

  // Vessels
  for (const v of vesselsData.entries) {
    pos[v.entry_id] = [v.ais.lat, v.ais.lon];
  }

  // Research tech
  for (const e of researchData.entries) {
    const start = researchStartPosition(e);
    if (start) pos[e.entry_id] = start;
  }

  // Marine mammal sightings
  for (const s of mammalsData.recent_sightings) {
    pos[s.event_id] = [s.decimalLatitude, s.decimalLongitude];
  }

  // Unauthorized UUV — starts outside the breakwater, approaches harbor entrance
  pos["UUV-UNKNOWN"] = [33.672, -118.288];

  return pos;
}

// ── Build lawnmower states for AUVs with mission areas ─────────────────────────

function buildLawnmowerStates() {
  const states = {};
  for (const e of researchData.entries) {
    if (
      e.platform_type === "auv" &&
      e.status === "on_mission" &&
      e.mission?.area?.coordinates
    ) {
      const bbox = polygonToBbox(e.mission.area.coordinates);
      states[e.entry_id] = initLawnmower(bbox, e.mission.planned_speed_kts ?? 2.0);
    }
  }
  return states;
}

// ── UUV path — slow, steady approach toward harbor entrance ───────────────────
// Moves on a bearing of ~015° (NNE) toward the breakwater gap
const UUV_SPEED_KTS = 3.5;
const UUV_HEADING = 18; // degrees — NNE toward breakwater entrance

// ── Main hook ──────────────────────────────────────────────────────────────────

export default function useActivitySimulation() {
  const [positions, setPositions] = useState(() => buildInitialPositions());
  const lawnRef = useRef(null);
  if (lawnRef.current === null) lawnRef.current = buildLawnmowerStates();

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) => {
        const next = { ...prev };

        // ── Vessels ──────────────────────────────────────────────────────────
        for (const v of vesselsData.entries) {
          const { ais, data_quality: dq } = v;
          const [lat, lon] = next[v.entry_id];

          if (dq?.ais_signal === "lost") {
            // Went silent — slow random drift, no heading
            next[v.entry_id] = randomWalk(lat, lon, 0.0001);
          } else if ((ais.status === 0 || ais.status == null) && ais.speed > 0) {
            // Underway — follow course heading
            next[v.entry_id] = moveHeading(lat, lon, ais.speed, ais.course);
          } else if (ais.status === 3) {
            // Restricted manoeuvrability (dredger) — very slow drift
            next[v.entry_id] = randomWalk(lat, lon, 0.00005);
          }
          // Moored (status 5) — no movement
        }

        // ── Research tech ─────────────────────────────────────────────────────
        for (const e of researchData.entries) {
          if (!next[e.entry_id]) continue;
          const [lat, lon] = next[e.entry_id];

          if (e.platform_type === "auv" && e.status === "on_mission" && e.mission?.area?.coordinates) {
            // Lawnmower pattern within mission bbox
            const state = lawnRef.current[e.entry_id];
            if (state) {
              const bbox = polygonToBbox(e.mission.area.coordinates);
              next[e.entry_id] = stepLawnmower(lat, lon, state, bbox);
            }
          } else if (e.platform_type === "auv" && e.status === "overdue") {
            // Lost AUV — slow random drift, no bounds
            next[e.entry_id] = randomWalk(lat, lon, 0.0002);
          } else if (e.platform_type === "rov" && e.status === "on_mission" && e.mission?.area?.coordinates) {
            // ROV — slow random walk clamped to mission area
            const bbox = polygonToBbox(e.mission.area.coordinates);
            const [nLat, nLon] = randomWalk(lat, lon, 0.0001);
            next[e.entry_id] = clampToBbox(nLat, nLon, bbox);
          } else if (e.platform_type === "usv" && e.status === "on_mission") {
            // USV — follows heading like a vessel
            next[e.entry_id] = moveHeading(lat, lon, e.mission?.planned_speed_kts ?? 3.5, 90);
            // Wrap within mission bbox if it has one
            if (e.mission?.area?.coordinates) {
              const bbox = polygonToBbox(e.mission.area.coordinates);
              next[e.entry_id] = clampToBbox(...next[e.entry_id], bbox);
            }
          } else if (e.platform_type === "dive_operation" && e.status === "on_mission" && e.mission?.area?.coordinates) {
            // Divers — very slow walk within area
            const bbox = polygonToBbox(e.mission.area.coordinates);
            const [nLat, nLon] = randomWalk(lat, lon, 0.00008);
            next[e.entry_id] = clampToBbox(nLat, nLon, bbox);
          } else if (e.platform_type === "auv" && e.status === "permit_expired" && e.mission?.area?.coordinates) {
            // Permit expired AUV — still moving in its area (that's the ambiguous case)
            const bbox = polygonToBbox(e.mission.area.coordinates);
            const [nLat, nLon] = randomWalk(lat, lon, 0.0002);
            next[e.entry_id] = clampToBbox(nLat, nLon, bbox);
          }
          // Fixed sensors (tide_gauge, hydrophone_array, adcp_mount, own_platform, wave_buoy) — no movement
        }

        // ── Marine mammals ────────────────────────────────────────────────────
        for (const s of mammalsData.recent_sightings) {
          const [lat, lon] = next[s.event_id];
          if (s.vernacularName.includes("sea lion")) {
            // Erratic, fast near docks
            next[s.event_id] = randomWalk(lat, lon, 0.0006);
          } else if (s.vernacularName.includes("seal")) {
            // Short dives near rocks — slow
            next[s.event_id] = randomWalk(lat, lon, 0.0002);
          } else if (s.vernacularName.includes("dolphin")) {
            // Fast, directional — move on a heading
            next[s.event_id] = moveHeading(lat, lon, 5, 45);
          } else {
            // Whale — slow drift
            next[s.event_id] = randomWalk(lat, lon, 0.0003);
          }
        }

        // ── Unauthorized UUV ──────────────────────────────────────────────────
        // Moves steadily toward harbor entrance; once inside breakwater, slow drift
        const [uuvLat, uuvLon] = next["UUV-UNKNOWN"];
        if (uuvLat < 33.706) {
          // Still outside — approach on heading
          next["UUV-UNKNOWN"] = moveHeading(uuvLat, uuvLon, UUV_SPEED_KTS, UUV_HEADING);
        } else {
          // Inside harbor — slow prowl
          next["UUV-UNKNOWN"] = randomWalk(uuvLat, uuvLon, 0.0003);
        }

        return next;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return positions;
}
