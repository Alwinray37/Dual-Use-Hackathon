// Small geo helpers. Positions are [lat, lng].
const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

export const KT_TO_MS = 0.514444;

export function distanceM(a, b) {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function bearingDeg(a, b) {
  const p1 = toRad(a[0]);
  const p2 = toRad(b[0]);
  const dl = toRad(b[1] - a[1]);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function destination(a, bearing, meters) {
  const d = meters / R;
  const t = toRad(bearing);
  const p1 = toRad(a[0]);
  const l1 = toRad(a[1]);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  const l2 =
    l1 +
    Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [toDeg(p2), ((toDeg(l2) + 540) % 360) - 180];
}

// Shift a point by metres east / north (fine for short distances).
export function offset(center, eastM, northM) {
  const lat = center[0] + northM / 111320;
  const lng = center[1] + eastM / (111320 * Math.cos(toRad(center[0])));
  return [lat, lng];
}

export function lerp(a, b, f) {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export function compass(bearing) {
  return DIRS[Math.round(bearing / 45) % 8];
}

export function fmtPos(p) {
  return `${p[0].toFixed(4)}°N, ${Math.abs(p[1]).toFixed(4)}°W`;
}

export function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// minutes since midnight -> "HH:MM:SS" (seconds derived from a float sim clock)
export function fmtClock(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

// Is point p ([lat, lng]) inside a polygon ring of [lat, lng] points? (ray casting)
export function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Distance in metres from point p to the nearest edge of a ring (flat-earth approximation).
export function distToRingM(p, ring) {
  const ky = 111320;
  const kx = 111320 * Math.cos(toRad(p[0]));
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky;
    const bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}
