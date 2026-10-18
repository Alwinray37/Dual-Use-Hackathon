import { offset } from "./geo.js";

// ─────────────────────────────────────────────────────────────────────────────
// ALL DEMO DATA IS SAMPLE / SIMULATED. Company names, permit numbers and crew
// names are invented for the demo. Sonar nodes are simulated: detection is a
// solved input, the product is the decision layer on top of it.
// ─────────────────────────────────────────────────────────────────────────────

// Wall clock at sim t = 0 (minutes since midnight). 10:40 AM.
export const CLOCK_START_MIN = 10 * 60 + 40;

// Conservative estimate. Vendor claims for commercial harbor sonar run up to
// about 1,500 m for small vehicles; ~600-900 m is typical in real harbors.
export const SONAR_RANGE_M = 800;

// Map framing for the demo (entrance + main channel of the Port of LA).
export const DEMO_CENTER = [33.7073, -118.2581];
export const DEMO_ZOOM = 13;

// ── Simulated sonar nodes (fixed structures at the chokepoints) ──────────────
export const SONAR_NODES = [
  { id: "S1", name: "Outer approach", pos: [33.6905, -118.2473], rangeM: SONAR_RANGE_M },
  { id: "S2", name: "Harbor entrance", pos: [33.70287, -118.24838], rangeM: SONAR_RANGE_M },
  { id: "S3", name: "Outer harbor and channel mouth", pos: [33.71435, -118.2602], rangeM: SONAR_RANGE_M },
  { id: "S4", name: "Main channel, inner basin", pos: [33.72672, -118.26795], rangeM: SONAR_RANGE_M },
];

// ── Raw, messy sources a harbor really receives ──────────────────────────────
export const SOURCES = [
  {
    id: "S-1",
    kind: "Email",
    title: "FW: FW: dive notif for today, berth work",
    raw: `From: dispatch@harborhull.example
To: portops@harbor.example
Subject: FW: FW: dive notif for today - berth work

Hi Port Ops,

Just confirming our crew (2 divers, Marco + Dee) will be doing the
hull clean on the Pacific Dawn at Berth 3 today, 0800 to about 4pm.
A flag will be up and we have a RIB alongside. BMP brushes only, no
abrasive. Max depth 8m.

Also the nav buoy dive for the east channel marker got done early,
that was 0600-0930. All good.

Thx, Dispatch`,
  },
  {
    id: "S-2",
    kind: "Permit PDF",
    title: "Diving & Waterside Activity Permit WP-2291",
    raw: `DIVING AND WATERSIDE ACTIVITY PERMIT      No. WP-2291
Requestor:   Port Engineering - Waterfront Facilities
Location:    Berth 5 pier, pilings P12 to P30
Date:        Today        From: 1000     To: 1400
Equipment:   Tethered ROV (observation class)
             surface support from pier
Max depth:   6 m
Harbor Master approval:  [X]
Port Security notified:  [X]`,
  },
  {
    id: "S-3",
    kind: "Spreadsheet",
    title: "marine_lab_schedule.xlsx (shared sheet)",
    raw: `asset,owner,area,start,end,notes
Kelp-3 (AUV),Marine Sci Lab,Outer harbor test box B,13:00,17:00,"lawnmower survey, 2-3 kt, pinger 12kHz"
Kelp-2 (AUV),Marine Sci Lab,(in dry dock),,,"not deployed this week"`,
  },
  {
    id: "S-4",
    kind: "Radio log",
    title: "Port Control VHF 12 log",
    raw: `10:12  PORT CONTROL: Pacific Dawn dive crew radio check
10:12  DIVE SUP: divers entering the water Berth 3, A flag up
10:31  PORT CONTROL: copy, tug transit Berth 3 area 1100`,
  },
];

// ── Parsed manifest ("expected underwater activity today") ───────────────────
// zone: where it is expected. window: when. expect: what the sonar should see.
export const MANIFEST = [
  {
    id: "M-001",
    title: "Hull cleaning, Pacific Dawn (Berth 3)",
    activity: "Hull cleaning",
    who: "Harbor Hull Services (2 divers)",
    zone: { center: [33.72893, -118.26988], radiusM: 220 },
    window: { start: "08:00", end: "16:00" },
    expect: { classes: ["diver"], speedKt: [0, 1.5] },
    sources: ["S-1", "S-4"],
    trust: "Notified + radio check-in",
    trustLevel: 3,
    checkIn: "10:12",
  },
  {
    id: "M-002",
    title: "Pier piling inspection, Berth 5",
    activity: "Pier inspection",
    who: "Port Engineering (tethered ROV)",
    zone: { center: [33.72142, -118.26752], radiusM: 220 },
    window: { start: "10:00", end: "14:00" },
    expect: { classes: ["small-vehicle"], speedKt: [0, 1.5] },
    sources: ["S-2"],
    trust: "Permit on file",
    trustLevel: 3,
  },
  {
    id: "M-003",
    title: "Research AUV trial, Kelp-3 (test box B)",
    activity: "Research vehicle",
    who: "Marine Sci Lab",
    zone: { center: [33.70446, -118.24461], radiusM: 350 },
    window: { start: "13:00", end: "17:00" },
    expect: { classes: ["small-vehicle"], speedKt: [1, 4] },
    sources: ["S-3"],
    trust: "Shared schedule (unverified)",
    trustLevel: 1,
  },
  {
    id: "M-004",
    title: "Nav buoy maintenance dive, east channel marker",
    activity: "Buoy maintenance",
    who: "Harbor Hull Services",
    zone: { center: [33.69492, -118.24515], radiusM: 200 },
    window: { start: "06:00", end: "09:30" },
    expect: { classes: ["diver"], speedKt: [0, 1] },
    sources: ["S-1"],
    trust: "Emailed notice",
    trustLevel: 2,
  },
];

// ── Scripted contacts ────────────────────────────────────────────────────────
// Paths are time-compressed for the demo: the contact moves along `waypoints`
// over `duration` sim-seconds, while `speedKt` is the nominal speed the sonar
// track reports (what the manifest behavior check uses).
const z1 = MANIFEST[0].zone.center;
const z2 = MANIFEST[1].zone.center;
const z3 = MANIFEST[2].zone.center;

const routineDiver = {
  id: "C-01",
  sonarClass: "diver",
  speedKt: 0.6,
  startT: 1,
  duration: 90,
  waypoints: [offset(z1, -60, 20), offset(z1, 10, 60), offset(z1, 70, -10), offset(z1, 0, -50)],
  truth: "Hull-cleaning diver at Berth 3 (matches manifest M-001).",
};

const routineRov = {
  id: "C-02",
  sonarClass: "small-vehicle",
  speedKt: 0.8,
  startT: 3,
  duration: 90,
  waypoints: [offset(z2, -80, 10), offset(z2, -20, -30), offset(z2, 50, 20), offset(z2, 90, -10)],
  truth: "Tethered ROV inspecting Berth 5 pilings (matches manifest M-002).",
};

const seaLion = {
  id: "C-03",
  sonarClass: "marine-animal",
  speedKt: 2.2,
  startT: 7,
  duration: 60,
  waypoints: [[33.7010, -118.2440], [33.7050, -118.2462], [33.7085, -118.2445]],
  truth: "California sea lion near the harbor entrance. Logged, not treated as a vehicle.",
};

const unknownVehicle = {
  id: "C-07",
  sonarClass: "small-vehicle",
  speedKt: 3.5,
  startT: 10,
  duration: 170,
  waypoints: [
    [33.68166, -118.24709],
    [33.6905, -118.24752],
    [33.69845, -118.24838],
    [33.70287, -118.24999],
    [33.70817, -118.25375],
    [33.71303, -118.25913],
    [33.71789, -118.26429],
    [33.72407, -118.26795],
    [33.72937, -118.26902],
    [33.73291, -118.26945],
  ],
  truth: "Small unregistered autonomous vehicle entering past the breakwater and up the main channel.",
};

const researchEarly = {
  id: "C-05",
  sonarClass: "small-vehicle",
  speedKt: 2.5,
  startT: 10,
  duration: 150,
  waypoints: [offset(z3, -160, -110), offset(z3, 140, -90), offset(z3, 150, 100), offset(z3, -120, 120)],
  truth: "The research lab's Kelp-3 AUV, started its trial hours before its scheduled window.",
};

export const SCENARIOS = [
  {
    id: "quiet",
    label: "1. Quiet Tuesday",
    blurb:
      "Routine day. Everything is on the manifest, so the officer is never bothered. A sea lion is logged for wildlife awareness.",
    contacts: [routineDiver, routineRov, seaLion],
  },
  {
    id: "unexplained",
    label: "2. Unexplained contact",
    blurb:
      "A small vehicle enters through the harbor entrance. Nothing on the manifest explains it, so it goes to the officer with evidence.",
    contacts: [routineDiver, routineRov, unknownVehicle],
  },
  {
    id: "partial",
    label: "3. Partial match",
    blurb:
      "Right place, right type, right speed, wrong time. A simple lookup would clear or flag it blindly. The system hands it over with the reason.",
    contacts: [routineDiver, routineRov, researchEarly],
  },
];

export const CLASS_LABEL = {
  diver: "diver-sized",
  "small-vehicle": "small vehicle",
  "marine-animal": "marine animal",
};
