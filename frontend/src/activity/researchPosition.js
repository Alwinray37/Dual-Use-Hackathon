// Use a reported position when available. Otherwise, place synthetic assets at
// the center of their declared mission area so they remain visible in the demo.
export function researchStartPosition(entry) {
  const lat = entry.last_known?.lat ?? entry.position?.lat;
  const lon = entry.last_known?.lon ?? entry.position?.lon;
  if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];

  const ring = entry.mission?.area?.coordinates?.[0];
  if (!ring?.length) return null;

  const lats = ring.map(([, pointLat]) => pointLat);
  const lons = ring.map(([pointLon]) => pointLon);
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lons) + Math.max(...lons)) / 2,
  ];
}
