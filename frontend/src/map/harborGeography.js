// --- Sensor / infrastructure data (verified against NOAA live systems, Oct 2026) ---

// NOAA NDBC wave & weather buoys — confirmed active stations only
// 46222 and 46253 do not exist as active NDBC stations — removed.
// Nearest real buoys to San Pedro Bay:
export const BUOYS = [
  { id: "46025", pos: [33.749, -119.053], label: "NDBC 46025 — Santa Monica Basin\nWave height, period, direction, wind, SST, pressure (~33 nm W)" },
  { id: "46086", pos: [32.501, -118.017], label: "NDBC 46086 — San Clemente Basin\nWave height, period, wind, SST (~45 nm SSW)" },
  { id: "46047", pos: [32.433, -119.527], label: "NDBC 46047 — Tanner Bank\nWave height, period, wind, SST (~80 nm SW)" },
  { id: "46069", pos: [33.650, -120.215], label: "NDBC 46069 — South Santa Rosa Island\nWave height, period, wind, SST (~55 nm NW)" },
];

// NOAA CO-OPS tide gauges — verified station IDs and coordinates
// 9410680 corrected: that ID is Terminal Island, not Cabrillo Beach (9410650)
export const TIDE_GAUGES = [
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
export const WATCH_POSTS = [
  { id: "lahd-sec",      pos: [33.736, -118.263], detectionRadius: 1000, label: "LA Harbor Department — Main Basin Security Post\nHarbor watch officer station" },
  { id: "lb-patrol",     pos: [33.752, -118.213], detectionRadius: 1500, label: "Long Beach Harbor Patrol HQ\nCovers Long Beach port basin" },
  { id: "uscg-san-pedro",pos: [33.714, -118.293], detectionRadius: 2000, label: "USCG Sector LA-LB — San Pedro\nCoast Guard sector command" },
];

// San Pedro Breakwater (western and middle arm — approximate real coords)
export const BREAKWATER = [
  [33.700, -118.255],
  [33.699, -118.275],
  [33.704, -118.300],
  [33.712, -118.312],
];

// LA/LB Main Shipping Channel — based on NOAA Chart 18751
// Inbound approach on ~045° heading, splits inside the breakwater

// Inbound approach to precautionary area
export const CHANNEL_APPROACH = [
  [33.590, -118.360], // outer separation zone / traffic lane
  [33.640, -118.330], // precautionary area SW edge
  [33.685, -118.308], // precautionary area center
  [33.706, -118.291], // breakwater entrance gap (west–middle arm)
];

// LA fork — NW into Port of Los Angeles basin
export const CHANNEL_LA = [
  [33.706, -118.291], // breakwater entrance (shared split point)
  [33.715, -118.281], // bends NW past Angel's Gate
  [33.724, -118.276], // main basin entry
  [33.732, -118.272], // LAHD inner harbor
];

// Long Beach fork — NE into Port of Long Beach
export const CHANNEL_LB = [
  [33.706, -118.291], // breakwater entrance (shared split point)
  [33.720, -118.265], // bends NE
  [33.740, -118.240], // LB outer harbor
  [33.754, -118.220], // LB inner basin
];
