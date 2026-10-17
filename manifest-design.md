# Harbor Manifest Design

How our system decides whether a contact is known, using a central view assembled from the manifests that different harbor groups already keep.

Test data: `test-data/vessels.json`, `test-data/research_tech.json`, `test-data/marine_mammals.json`

> **Provenance legend**
> - **Sourced:** taken from a source we read (listed at the bottom).
> - **Standard:** general knowledge of a standard, not verified in this session.
> - **Invented:** our own design or placeholder. Replace if real data is found.
>
> All entries in the test files are synthetic unless marked otherwise. Names, IDs, and positions are fake or approximate.

---

## 1. The idea

Each harbor group has its own record of what it has in the water. Our system combines those records into one view. When a detection system reports a contact, we check it against that view and produce one of three outcomes:

| Outcome | Meaning | Officer sees |
|---|---|---|
| **Cleared** | Matches a known entry and behaves normally | Logged only, no alert |
| **Watch** | Unknown or imperfect match, nothing alarming | Tracked and shown, no action demanded |
| **Escalate** | Unknown and behaving concerningly | A decision-ready case with a recommended step |

Unknown always defaults to **Watch**, never to Cleared. Work stops at the handoff to a human.

---

## 2. Three categories, three different ways of "belonging"

| | Vessels | Research and technologies | Marine mammals |
|---|---|---|---|
| How it belongs | Declared and broadcast | Declared by the owner | Never declared, only expected |
| Match type | Exact ID | Exact ID | Probability |
| Real analog | AIS plus Marine Exchange / VTS | Permits plus mission plans (no public standard found) | Sighting records and seasonality |
| Data owner | Marine Exchange, ports, agents, operators | Research groups, contractors, agencies | Researchers, sighting networks |
| Main job | Rule out ships, tugs, boats | Rule out friendly vehicles, find lost ones | Rule out animals |

---

## 3. Real sources behind each category

### 3.1 Vessels

| Source | What it gives | Provenance |
|---|---|---|
| AIS position reports, Class A (types 1-3) | `mmsi`, `status`, `speed`, `course`, `heading`, `lat`, `lon`, `turn`, `accuracy` | Sourced (AIS-catcher JSON reference) |
| AIS static and voyage data (type 5) | `imo`, `callsign`, `shipname`, `shiptype`, `to_bow`, `to_stern`, `to_port`, `to_starboard`, `draught`, `destination`, `eta` | Sourced |
| AIS Class B (types 18 and 24) | position fields plus `shipname`, `shiptype`, dimensions, `callsign`. No status, destination, draught, or IMO | Sourced |
| Ship type codes | e.g. 30 fishing, 31 towing, 33 dredging, 36 sailing, 50 pilot, 52 tug, 55 law enforcement, 60 passenger, 70 cargo, 80 tanker | Standard |
| Marine Exchange consolidated schedules | arrivals, departures, shifts across agents | Sourced (USC Sea Grant) |
| VTS reports | sail plans, position reports, movement and final reports, emergency reports. Includes ETA, destination, location, direction | Sourced (VTS user manual) |
| VTS tracking | radar, cameras, AIS receivers | Sourced (Defense Media Network) |

Notes:
- The VTS manual does not list cargo, hazmat, tug, or berth assignment as reporting fields. Our `schedule` layer adds some of those as our own fields.
- A vessel's `draught` is the part that reaches below the surface. It matters for underwater contact, not for the surface picture.

### 3.2 Research and technologies

| Source | What it gives | Provenance |
|---|---|---|
| NOAA CO-OPS station 9410660 (Los Angeles, Outer Harbor) | A real fixed tide gauge | Sourced (search result) |
| CDIP / NDBC San Pedro buoy (092 / 46222) and San Pedro South (213) | Real fixed wave buoys | Sourced (search results) |
| Port noise monitoring | Hydrophones, current profilers, temperature and salinity sensors tied to vessel arrivals | Sourced (Sofar Ocean use case) |
| Port survey work | Sonar for debris, dredge depth checks, quay wall inspection | Sourced (Teledyne, Kongsberg pages) |
| Mobile vehicle records (AUV, ROV, USV, divers) | Owner, permit, mission window, mission area, depth, speed, size, identification, recovery aids | **Invented.** No public manifest was found |
| How a submerged vehicle identifies itself | Acoustic modem ID assumed | **Invented.** Not verified |

The research and technologies mobile records are the least grounded part of the design. The structure is a reasonable guess at what a permit plus mission plan would contain.

### 3.3 Marine mammals

| Source | What it gives | Provenance |
|---|---|---|
| Visit Long Beach wildlife page | Species list, rough seasons, sea lion and harbor seal habitat, 2024 sighting counts | Sourced (tourism content) |
| Sonar studies (seal classification, biological target classification) | How well sonar separates animals from other targets | Sourced |
| Species sizes and speeds | Approximate ranges | Standard |
| Sighting record format | Modeled on Darwin Core terms (`eventDate`, `scientificName`, `individualCount`, `decimalLatitude`) | Standard |
| Live sighting feed (Whale Alert, CINMS programs) | Exists, but its fields and public availability were not confirmed | Not verified |
| `in_harbor_prior` numbers | Chance an animal of that species is inside the harbor | **Invented** placeholders |

---

## 4. Shared shape

Every record answers the same questions, so the matcher can treat the three files uniformly.

```ts
type Category = "vessel" | "research_tech" | "marine_mammal";
type Outcome = "cleared" | "watch" | "escalate";

interface KnownEntity {
  entryId: string;
  category: Category;
  expectedArea: GeoPolygon | HabitatTag[]; // polygon for declared things, habitat for animals
  expectedWindow?: { start: string; end: string };
  sizeRangeM: [number, number];
  speedRangeKts: [number, number];
  identification: string[];                // MMSI, modem ID, or none
  prior: number;                           // 1.0 for an active declared entry
  status: "active" | "overdue" | "permit_expired" | "ais_lost" | "unknown";
}

interface MatchResult {
  trackId: string;
  bestMatch: string | null;
  matchScore: number;      // 0 to 1
  reasons: string[];
  outcome: Outcome;
}
```

---

## 5. Matching logic (sketch)

```
for each incoming track:
  candidates = known entities whose
     area contains the track position (or habitat fits),
     window contains the time (if it has one),
     size and speed ranges fit

  score each candidate:
     id_match      (exact ID heard?)           strongest signal
     area_and_time (inside plan?)
     size_speed    (fits the ranges?)
     behavior      (approach ratio, path straightness)
     prior         (for animals: season x place)

  if best score high and behavior normal      -> cleared
  if best match imperfect (status != active)  -> watch + notify owner
  if no good match and behavior benign        -> watch
  if no good match and behavior concerning    -> escalate
```

Rules we want to hold:
- A match lowers suspicion but never ends the behavior check.
- Missing or stale data pushes toward Watch, not Cleared.
- A manifest source being down is itself shown to the officer.

---

## 6. Test entries and what they exercise

### Vessels (`vessels.json`)

| Entry | Situation it tests |
|---|---|
| V-001, V-003, V-005 | Inbound ship with assisting tug and pilot boat. Several known contacts moving together |
| V-002, V-004, V-007, V-013 | Moored and docked vessels. Should be trivial to clear |
| V-006 | Government patrol vessel |
| V-008 | Whale-watch charter that slows and drifts near animals. Looks odd but is known |
| V-009, V-010 | Class B small craft with no destination or draught |
| V-011 | Dredge with continuous high underwater noise |
| V-012 | Tug with a barge that has no AIS and trailing tow gear |
| V-014 | Known vessel whose AIS went silent. Known but unverified |

### Research and technologies (`research_tech.json`)

| Entry | Situation it tests |
|---|---|
| RT-001 to RT-003 | Real fixed public stations |
| RT-004, RT-005 | Fixed harbor sensors, one passive and one active (the active one can cause repeating returns) |
| RT-006 | Our own node, so the system never flags itself |
| RT-007 | AUV inside its mission area and window. Should be Cleared |
| RT-008 | Overdue AUV, the quiet Tuesday case. Notify the owner |
| RT-009 | Tethered ROV near piers, tied to tender V-013 |
| RT-010 | Survey USV with AIS. Sits between vessel and research categories |
| RT-011 | Declared divers with a bubble trail |
| RT-012 | AUV with an expired permit. Watch with owner notice |

### Marine mammals (`marine_mammals.json`)

| Entry | Situation it tests |
|---|---|
| M-001, M-002 | Resident animals near docks, buoys, and jetties |
| M-003, M-004 | Fast dolphin groups |
| M-005 to M-008 | Seasonal or rare large animals, mostly outside the breakwater |
| SG-001 to SG-004 | Recent sightings that can raise the prior in an area |

---

## 7. Concerns and open items

1. **Mobile research records are invented.** No public manifest exists for underwater research vehicles. Present them as a proposed standard, not existing data.
2. **Underwater identification is unverified.** AIS does not work underwater. Acoustic modem IDs are an assumption.
3. **Animal priors are placeholders.** The `in_harbor_prior` numbers are invented. Season and habitat are the only sourced parts.
4. **Sizes and speeds are approximate.**
5. **Unmanifested contacts live elsewhere.** This data holds only known entities. Unknown contacts (hostile or benign) need a fourth test file of simulated tracks.
6. **Natural and debris contacts are missing.** Sonar studies list fish schools, diving birds, and debris as common false-alarm sources. They are not in the three categories.
7. **Category overlap.** The survey USV (RT-010) and the research vessel (V-013) appear in both vessel and research data. Decide which category owns each and cross-link.
8. **Central vs. federated.** The demo can simulate a central view. A deployment would likely query each owner instead of copying their data.
9. **Names and locations.** All vessel and organization names are fictional. Coordinates are approximate and may not be in navigable water.

---

## Sources

- [AIS-catcher JSON decoding reference](https://jvde-github.github.io/AIS-catcher-docs/references/JSON-decoding/)
- [USC Sea Grant: Marine Exchange of Southern California](https://dornsife.usc.edu/uscseagrant/?p=3119)
- [Defense Media Network: Marine Exchange of Southern California](https://www.defensemedianetwork.com/stories/marine-exchange-southern-california)
- [Marine Exchange VTS user manual](https://mxsocal.org/assets/pdf/vts-user-manual-210331.pdf)
- [Sofar Ocean: acoustic monitoring in ports and harbors](https://marine-sensing-library.sofarocean.com/use-cases/underwater-acoustic-monitoring-for-vessel-noise-in-ports-and-harbors)
- [Teledyne Marine: ports and harbors](https://www.teledynemarine.com/markets/ports-harbors)
- [Kongsberg: ports and harbors](https://www.kongsberg.com/campaigns/shallow-water/ports--harbors/)
- [Visit Long Beach: ocean wildlife](https://www.visitlongbeach.com/blog/ocean-wildlife-in-long-beach)
- [NOAA CO-OPS station 9410660](https://tidesandcurrents.noaa.gov/physocean.html?id=9410660)
- [CDIP San Pedro 46222 listing](https://data.ioos.us/dataset/092-san-pedro-ca-46222)
