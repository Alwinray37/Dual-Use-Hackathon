# How We Used IBM Bob — Dual-Use Hackathon

**Team:** Harbor Watch
**Track:** Crisis Mitigation · Vertical: Under the Water (with NULL Systems)
**Event:** Dual-Use Hackathon, InnovateLA at USC Viterbi · October 16–18, 2026

---

## What IBM Bob Is

IBM Bob is IBM's AI coding partner — a context-aware assistant that reads the codebase, answers questions about it, writes and edits code, runs commands, and tracks multi-step tasks. We used the 30-day free trial provided to all hackathon participants.

---

## How We Used It

We used IBM Bob as the primary development tool for the entire frontend build. The project went from a blank folder to a working harbor situational awareness platform in the hackathon window. Bob handled architecture decisions, wrote every component, debugged errors, and maintained continuity across the session.

---

## What Bob Built

### Project scaffolding & documentation
- Created [`README.md`](README.md) from the hackathon participant hub content — event details, schedule, track brief, Twist 1 vertical
- Created [`HACKATHON.md`](HACKATHON.md) — full track/vertical documentation with judging criteria, problem statement, dual-use table, and placeholder sections for the team to fill in
- Corrected the terminology structure: "Lens" → Track (Crisis Mitigation), "Track" → Vertical (Marine / Under the Water)
- Created [`la-marine-hazard-systems.md`](la-marine-hazard-systems.md) — researched and documented real LA marine hazard detection systems (IPAWS, NWS, DART, NDBC, CDIP, USGS), including system descriptions, data types, API endpoints, and a Data Systems Reference section

### Frontend — React + Leaflet map application

#### [`HarborMap.jsx`](frontend/src/components/HarborMap.jsx)
- Built the interactive Leaflet map centered on Port of Los Angeles / San Pedro Bay
- Verified and placed real NOAA sensor infrastructure: NDBC wave buoys (confirmed active station IDs against live NDBC data), NOAA CO-OPS tide gauges (verified station IDs and corrected two wrong mappings against the CO-OPS API)
- Drew the San Pedro Breakwater, and corrected the main shipping channel from a single rough line into three accurate polylines: inbound approach + LA fork + Long Beach fork, based on NOAA Chart 18751
- Added 20 simulated sonar detection nodes with coverage radius rings, placed at strategic chokepoints (outer approach, Angel's Gate, LA basin, LB channel, inner harbor, anchorage)
- Built a full layer visibility filter system — every layer independently toggleable from the legend
- Swapped basemap from OpenStreetMap to Esri World Street Map to remove transit line noise

#### [`SimulatedObjects.jsx`](frontend/src/components/SimulatedObjects.jsx)
- Rendered all 14 vessels, 12 research tech assets, and 4 marine mammal sightings from the test-data JSON files
- Designed a status dot system: colored indicator (green/amber/red) in marker tooltip and popup header for research tech; status badge in vessel popups
- Differentiated submerged objects (AUVs, ROVs, divers) with dashed ring icons vs solid dots for surface objects
- Added a pulsing red **Unknown UUV** marker — the threat object for the demo scenario

#### [`useSimulation.js`](frontend/src/hooks/useSimulation.js) (initial version) → [`sim/useSimulation.js`](frontend/src/sim/useSimulation.js) (extended externally)
- Built the movement simulation hook: 2-second tick rate, 120× speed multiplier
- Implemented four movement types:
  - `course_heading` — vessels follow AIS course + speed
  - `lawnmower` — AUVs sweep back and forth within their authorized mission area polygon
  - `random_walk` — ROVs, dive teams, marine mammals, clamped or unclamped depending on status
  - `drift` — overdue AUV (RT-008) drifts unbounded from last known position
- Added UUV approach logic: approaches harbor on heading 018° from outside the breakwater, then prowls inside once past Angel's Gate

#### [`MapInfoPanel.jsx`](frontend/src/components/MapInfoPanel.jsx)
- Built a tabbed info panel below the map with four tabs: Sensors, Coverage Notes, Data Sources, About
- Coverage Notes tab documents that NDBC buoys and tide gauges are point sensors with no spatial detection range, and explains the basis for each watch post's estimated detection radius
- Data Sources tab lists NDBC, CO-OPS, NWS Alerts API, and USGS Earthquake Feed with endpoints and auth requirements

#### [`index.css`](frontend/src/index.css)
- Designed a full dark navy UI theme (`#0b1520` background) consistent across map, legend, info panel, and topbar
- Built the map legend as a connected dark bar below the map with toggle buttons (active = full opacity, inactive = dimmed)
- Added dark scrollbar styling, panel table styles, badge system, and source card layout

---

## How Bob Was Used — Workflow

**Bob was used conversationally throughout the build.** The typical pattern:

1. Ask a question or give an instruction in plain language
2. Bob read the relevant files first before making any change
3. Bob made surgical edits using `apply_diff` — minimal changes, not full rewrites
4. Bob ran `npm run build` after each change to catch errors before they accumulated
5. Bugs were caught and fixed in the same session (e.g. missing `Tooltip` import, JSX sibling fragment error, incorrect tide gauge station ID)

**Notable Bob capabilities used:**
- **Live data verification** — Bob ran `curl` against the NOAA NDBC station list and the CO-OPS API to verify that buoy stations 46222 and 46253 were not real active stations, and corrected tide gauge 9410680 from "Cabrillo Beach" to its actual name "Long Beach, Terminal Island"
- **Codebase continuity** — Bob tracked the full component tree across the session and correctly threaded new props (`positions`, `sim`, `dispatch`) through parent/child components without being reminded of the structure
- **Todo tracking** — Bob used its built-in todo list to track multi-step tasks (simulation hook, sonar nodes, UUV) and marked items complete only after verifying the build passed
- **Git operations** — Bob committed at checkpoints, removed Vite timestamp artifacts, updated `.gitignore`, and fixed the missing upstream branch on `git push`

---

## Responsible Use Note

This tool could be misused to simulate or plan unauthorized access to real harbor infrastructure. We limited it to:
- All objects are clearly labeled synthetic/simulated
- No real vessel identifiers, permit numbers, or crew names are used
- The platform stops at the handoff to a human officer — it does not recommend or automate any physical response
- Detection is modeled as a solved input; the product is the decision layer on top of it

---

## IBM Bob Trial

Free 30-day trial available at the link provided in the hackathon participant hub.
All participants were offered access — no cost to use during the weekend.

---

*Last updated: October 2026*
