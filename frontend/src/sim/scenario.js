import { offset } from "./geo.js";
import { MANIFEST } from "./manifest.js";

// The manifest itself lives in manifest.js and is built from /test-data.
export { MANIFEST, WILDLIFE, OTHER_KNOWN, CLOCK_START_MIN } from "./manifest.js";

// ─────────────────────────────────────────────────────────────────────────────
// ALL DEMO DATA IS SAMPLE / SIMULATED. Company names, permit numbers and crew
// names are invented for the demo. Sonar nodes are simulated: detection is a
// solved input, the product is the decision layer on top of it.
// ─────────────────────────────────────────────────────────────────────────────

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
// Each manifest entry in test-data/research_tech.json lists the documents it
// was assembled from in `source_docs`. Times below are harbor local time.
export const SOURCES = [
  {
    id: "S-1",
    kind: "Email",
    title: "FW: FW: dive notif for today, pier work",
    raw: `From: dispatch@marinecontractors.example
To: portops@harbor.example
Subject: FW: FW: dive notif for today - pier work

Hi Port Ops,

Confirming our crew (2 divers) will be doing the piling
inspection at the Berth 3 pier today, 1330 to about 1630.
Dive flag will be up and we have a RIB alongside.
Max depth 10m.

Thx, Dispatch`,
  },
  {
    id: "S-2",
    kind: "Permit PDF",
    title: "Diving & Waterside Activity Permit SYN-PRM-2303",
    raw: `DIVING AND WATERSIDE ACTIVITY PERMIT      No. SYN-PRM-2303
Requestor:   Pacific Harbor Marine Institute
Location:    Berth 5 pier, pilings P12 to P30
Date:        Today        From: 1300     To: 1700
Equipment:   Tethered ROV (observation class)
             surface support: R/V Harbor Test
Max depth:   8 m
Valid:       Oct 15 to Oct 20
Harbor Master approval:  [X]
Port Security notified:  [X]`,
  },
  {
    id: "S-3",
    kind: "Spreadsheet",
    title: "research_schedule.xlsx (shared sheet)",
    raw: `asset,owner,area,start,end,notes
SurveyBot-3 (AUV),Pacific Harbor Marine Institute,Outer harbor test box B,12:00,16:00,"lawnmower survey, about 2 kt"
DriftBot-1 (AUV),Coastal Survey Lab,Channel mouth test box A,07:00,11:00,"transect line, about 1.5 kt, recover at 11:00"
ProbeBot-2 (AUV),Visiting University Team,East channel marker,13:00,16:00,"grid survey, permit SYN-PRM-2188 (check dates)"`,
  },
  {
    id: "S-4",
    kind: "Radio log",
    title: "Port Control VHF 12 log",
    raw: `10:40  SURVEY LAB: DriftBot-1 last modem ping, test box A, recovery at 1100
13:41  PORT CONTROL: Berth 3 dive crew radio check
13:41  DIVE SUP: divers entering the water, A flag up
13:55  PORT CONTROL: copy, ROV launch at Berth 5, R/V Harbor Test tending`,
  },
];

// ── Scripted contacts ────────────────────────────────────────────────────────
// Paths are time-compressed for the demo: the contact moves along `waypoints`
// over `duration` sim-seconds, while `speedKt` is the nominal speed the sonar
// track reports (what the manifest behavior check uses).
const zoneOf = (id) => MANIFEST.find((m) => m.id === id).zone.center;
const diverZone = zoneOf("RT-011");
const rovZone = zoneOf("RT-009");
const surveyZone = zoneOf("RT-007");
const driftZone = zoneOf("RT-008");

const routineDiver = {
  id: "C-01",
  sonarClass: "diver",
  speedKt: 0.6,
  startT: 1,
  duration: 90,
  waypoints: [offset(diverZone, -60, 20), offset(diverZone, 10, 60), offset(diverZone, 70, -10), offset(diverZone, 0, -50)],
  truth: "Pier piling dive team at Berth 3 (matches manifest RT-011).",
};

const routineRov = {
  id: "C-02",
  sonarClass: "small-vehicle",
  speedKt: 0.5,
  startT: 3,
  duration: 90,
  waypoints: [offset(rovZone, -80, 10), offset(rovZone, -20, -30), offset(rovZone, 50, 20), offset(rovZone, 90, -10)],
  truth: "PierEye ROV inspecting Berth 5 pilings (matches manifest RT-009).",
};

const surveyBot = {
  id: "C-04",
  sonarClass: "small-vehicle",
  speedKt: 2.0,
  startT: 5,
  duration: 120,
  waypoints: [offset(surveyZone, -160, -110), offset(surveyZone, 140, -90), offset(surveyZone, 150, 100), offset(surveyZone, -120, 120)],
  truth: "SurveyBot-3 on its lawnmower survey in test box B (matches manifest RT-007).",
};

const seaLion = {
  id: "C-03",
  sonarClass: "marine-animal",
  speciesId: "M-001",
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

const driftBot = {
  id: "C-05",
  sonarClass: "small-vehicle",
  speedKt: 1.5,
  startT: 10,
  duration: 150,
  waypoints: [offset(driftZone, -140, -100), offset(driftZone, 120, -80), offset(driftZone, 130, 90), offset(driftZone, -110, 100)],
  truth: "DriftBot-1, due out of the water at 11:00 and still in it four hours later (manifest RT-008).",
};

export const SCENARIOS = [
  {
    id: "quiet",
    label: "1. Quiet Tuesday",
    blurb:
      "Routine day. Divers, an ROV and a research AUV are all on the manifest, so the officer is never bothered. A sea lion is logged for wildlife awareness.",
    contacts: [routineDiver, routineRov, surveyBot, seaLion],
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
      "Right place, right type, right speed, wrong time: the research AUV DriftBot-1 was due out of the water four hours ago. A simple lookup would clear or flag it blindly. The system hands it over with the reason.",
    contacts: [routineDiver, routineRov, driftBot],
  },
];

export const CLASS_LABEL = {
  diver: "diver-sized",
  "small-vehicle": "small vehicle",
  "marine-animal": "marine animal",
};
