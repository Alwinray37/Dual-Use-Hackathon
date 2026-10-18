import researchData from "../../../test-data/research_tech.json";
import vesselsData from "../../../test-data/vessels.json";
import mammalsData from "../../../test-data/marine_mammals.json";
import { distanceM } from "./geo.js";

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE MANIFEST.
// Everything the app "knows is supposed to be here" comes from the three JSON
// files in /test-data (vessels, research and technologies, marine mammals).
// This file turns them into the shape the matcher uses. Nothing else in the app
// keeps its own list of expected activity.
//
// Sonar contacts are underwater, so only underwater declared activity is
// checked against them: mobile research assets (AUV, ROV) and dive operations.
// Surface vessels (tracked by AIS and VTS), fixed sensors and the surface
// survey boat are counted in OTHER_KNOWN but not sonar-checked in this demo.
// Wildlife priors are used to explain animal contacts.
//
// All data is synthetic. Windows are stored in UTC in the JSON and shown here
// in harbor local time.
// ─────────────────────────────────────────────────────────────────────────────

const UTC_OFFSET_H = -7; // Pacific Daylight Time on 2026-10-17

const AS_OF = researchData._meta.as_of;
const local = (iso) => new Date(new Date(iso).getTime() + UTC_OFFSET_H * 3600 * 1000);
const hhmm = (iso) => {
  const d = local(iso);
  return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
};
const TODAY = local(AS_OF).toISOString().slice(0, 10);

// Wall clock at sim t = 0, in minutes since midnight (harbor local time).
export const CLOCK_START_MIN = (() => {
  const d = local(AS_OF);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
})();

const SONAR_CLASS = { auv: "small-vehicle", rov: "small-vehicle", dive_operation: "diver" };

// Planned speed -> speed band a sonar track is allowed to show. Slow work stays 0 to 1 kt.
const speedBand = (v) => [v >= 1 ? v * 0.5 : 0, Math.max(1, v * 1.5)];

const stripSynthetic = (s) => s.replace(/\s*\(synthetic\)\s*/g, "").trim();

function zoneFrom(area) {
  const ring = area.coordinates[0].map(([lon, lat]) => [lat, lon]);
  const lats = ring.map((p) => p[0]);
  const lons = ring.map((p) => p[1]);
  const center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lons) + Math.max(...lons)) / 2];
  const radiusM = Math.round(Math.max(...ring.map((p) => distanceM(center, p))));
  return { ring, center, radiusM };
}

function trustOf(e) {
  const p = e.permit;
  if (!p) return { trust: "Self-declared", trustLevel: 1 };
  if (p.valid_to < TODAY) return { trust: `Permit ${p.ref} expired ${p.valid_to}`, trustLevel: 1 };
  return { trust: `Permit ${p.ref} on file${e.check_in ? " + radio check-in" : ""}`, trustLevel: 3 };
}

const isChecked = (e) => SONAR_CLASS[e.platform_type] && e.mission && e.mission.area;

// Windows are assumed not to cross midnight.
export const MANIFEST = researchData.entries.filter(isChecked).map((e) => ({
  id: e.entry_id,
  category: e.category,
  title: `${e.name}, ${e.mission.pattern}`,
  activity: e.mission.pattern,
  who: stripSynthetic(e.owner.org),
  zone: zoneFrom(e.mission.area),
  window: { start: hhmm(e.mission.window.start), end: hhmm(e.mission.window.end) },
  expect: { classes: [SONAR_CLASS[e.platform_type]], speedKt: speedBand(e.mission.planned_speed_kts) },
  sources: e.source_docs || [],
  ...trustOf(e),
  checkIn: e.check_in ? hhmm(e.check_in) : undefined,
  permit: e.permit ? { ref: e.permit.ref, validTo: e.permit.valid_to, expired: e.permit.valid_to < TODAY } : null,
  status: e.status,
}));

// Wildlife priors by species id, used to explain animal contacts.
export const WILDLIFE = Object.fromEntries(mammalsData.species_priors.map((s) => [s.species_id, s]));

// Known but not sonar-checked in this demo.
const unchecked = researchData.entries.filter((e) => !isChecked(e) && e.platform_type !== "own_platform");
export const OTHER_KNOWN = {
  surfaceCraft: vesselsData.entries.length + unchecked.filter((e) => e.mobility === "mobile").length,
  fixedSensors: unchecked.filter((e) => e.mobility === "fixed").length,
  wildlife: mammalsData.species_priors.length,
};
