# LA Marine Hazard Systems: Detection, Warning, Response

Scope: high surf, coastal flooding, and tsunami for Los Angeles County. Compiled Oct 16, 2026 from public sources. Items marked "Not confirmed" could not be verified from the pages read.

## Summary Table

| Hazard | Detection | Warning | Response |
|---|---|---|---|
| **Tsunami** | DART buoys, National Tsunami Warning Center | 4 alert levels, county alerts, IPAWS, beach sirens (Torrance) | Beach and harbor closures, equipment and vessels moved |
| **High surf and rip currents** | Not confirmed (NWS forecasts) | NWS advisories, county news releases, beach hotline | Lifeguard rescues, stay-out-of-water guidance |
| **Coastal flooding** | Not confirmed | NWS beach hazards warnings, county flood notices | Sand berms and walls, Public Works storm prep |

## Additional Information

### Tsunami details
- **Detection:** NOAA's DART system has 39 buoys with seafloor pressure sensors that measure water level. The National Tsunami Warning Center issues alerts for California. For a local tsunami, the felt earthquake is the first warning.
- **Alert levels:**
  - Warning: widespread flooding expected or occurring.
  - Advisory: dangerous currents near water, significant flooding not expected.
  - Watch: a tsunami may affect the area later.
  - Information Statement: prevents unnecessary evacuations.
- **Alert channels:** county channels (Alert.LACounty.gov), city systems, and the national IPAWS system (phones, radio, TV).
- **Torrance Beach:** Beach Emergency Evacuation Lights System with sirens, flashing lights, and spoken alerts in English and Spanish. Found at one beach only, and the article was undated.
- **July 2025 advisory response:** the Dept. of Beaches and Harbors led, supported by the Sheriff and Harbor Patrol, Fire and lifeguards, and Emergency Management. Beaches, restrooms, access ways, and parking lots closed until at least noon. Heavy equipment moved to higher ground, vessels pulled from the water, Marina del Rey lessees contacted, and RV park guests told to move.
- **Timing in that event:** first waves expected around 1 a.m. at LA Harbor, with waves of 1 foot or less lasting at least nine hours. No Southern California evacuations were ordered.

### High surf details
- **Detection:** not confirmed. NWS Los Angeles/Oxnard forecasts surf. Buoy networks such as CDIP probably feed forecasts (assumption).
- **Warnings:** NWS issues high surf advisories and beach hazards warnings. Examples: Feb 2026 advisory for 5 to 9 ft breaking waves; Dec 2020 warning for 3 to 6 ft surf with tides near 7 ft.
- **Public channels:** LA County Fire news releases by email, and a 24-hour beach hotline (1-800-525-5662).
- **Response:** lifeguards perform rescues. Public guidance is to stay out of the water, avoid jetties and rocks, swim near occupied lifeguard towers, and never turn your back to the ocean.

### Coastal flooding details
- **Detection:** not confirmed. Sources mention tide heights (around 7 ft) but not which gauges feed alerts.
- **Warnings:** NWS beach hazards warnings can mention minor coastal flooding. LA County Fire has warned of significant seawater flooding in low-lying areas, beaches, and harbors during high tide.
- **Response:** the county built sand walls and berms to protect public buildings (2015). County Public Works storm prep covers flood control dams, round-the-clock patrols, sandbag sites, and a 24-hour dispatch line. The page read did not mention coastal flooding.

### Gaps (inferences, not confirmed findings)
1. **Warnings are text advisories.** They say to stay away from the water, but not where to go or how to get there.
2. **Coverage depends on lifeguards and opt-in alerts.**
3. **No feedback from the water.** The county's July 2025 page described expected conditions, not observed surges.
4. **Nothing joins the pieces.** Surf, tide, and tsunami data come from separate sources and agencies.
5. **Coastal flooding looks least covered.** No flood-specific live monitoring or alerting for LA was found.
6. **Local tsunamis leave almost no time.** DART buoys are far offshore, and a local source can arrive in about 10 minutes.

### Other facts worth knowing
- Worst-case tsunami flood levels at the ports of Los Angeles and Long Beach could reach 12 to 15 feet (older source).
- A 2014 USC study projects up to two feet of sea level rise by 2050, with San Pedro, Wilmington, and Venice most exposed. Check for newer projections.
- Public tsunami hazard maps with address lookup: tsunami.ca.gov.

### Live data sources (for building)
- NOAA DART buoys: ndbc.noaa.gov/dart
- NWS alerts API: api.weather.gov/alerts/active (poll no more than every 30 seconds)
- USGS earthquake catalog: GeoJSON, CSV, KML, and QuakeML formats
- CDIP wave data (Scripps): live access not verified
- NDBC buoys and NOAA tide gauges: seen in search results, not verified

---

## 📡 Data Systems Reference

Descriptions of the major systems and feeds referenced throughout this document.

---

### IPAWS — Integrated Public Alert and Warning System

**What it is:** IPAWS is FEMA's national infrastructure for issuing public emergency alerts. It is the backbone that connects authorized government alerting authorities (federal, state, county, tribal) to every major public-facing alert channel simultaneously from a single message.

**What it does:** When an alerting authority (e.g., NOAA, a county emergency office) sends an alert through IPAWS, it simultaneously broadcasts to Wireless Emergency Alerts (WEA) on cell phones, Emergency Alert System (EAS) interruptions on radio and TV, and the NOAA All-Hazards Radio network. For marine and coastal events, IPAWS is how a tsunami warning or coastal flood alert reaches the public within seconds of being issued — no opt-in required for WEA.

**Type of data it provides:**
- Structured alert messages in **CAP (Common Alerting Protocol)** format — an XML standard
- Fields include: event type, severity, urgency, certainty, affected area (polygon or FIPS code), onset time, expiry time, and plain-language instruction text
- Not a sensor feed — IPAWS carries *decisions and instructions*, not raw measurements
- Consumed via the NWS Alerts API (see below) or directly via FEMA's IPAWS Open Platform for Emergency Networks (IPAWS-OPEN)

---

### NWS — National Weather Service

**What it is:** The NWS is the federal agency (part of NOAA) responsible for weather, water, and climate forecasts and warnings for the United States. The NWS Los Angeles/Oxnard office covers Southern California coastal and marine zones.

**What it does:** The NWS issues official watches, warnings, and advisories for hazards including high surf, rip currents, coastal flooding, beach hazards, and tsunamis (coordinated with the National Tsunami Warning Center). It also produces marine zone forecasts covering wind, wave height, swell period, and visibility for defined offshore zones.

**Type of data it provides:**
- **Alerts and warnings** via the NWS Alerts API (`api.weather.gov/alerts/active`) in GeoJSON or JSON-LD — includes event type, zone, severity, onset, expiry, and description text; poll no more than every 30 seconds
- **Gridded point forecasts** (`api.weather.gov/points/{lat},{lon}`) — temperature, wind speed/direction, wave height, precipitation probability at hourly and 7-day resolution
- **Marine zone forecasts** — text and structured data for offshore/coastal zones (e.g., Santa Monica Bay, San Pedro Channel)
- **Observation stations** — current conditions (wind, pressure, temperature) from ASOS/AWOS stations
- All endpoints are free, no API key required, REST/JSON

---

### DART — Deep-ocean Assessment and Reporting of Tsunamis

**What it is:** DART is NOAA's network of deep-ocean buoy systems deployed across the Pacific, Atlantic, and Caribbean to detect tsunamis in open water. There are 39 buoys globally; several are positioned in the Pacific to provide early warning for the US West Coast.

**What it does:** Each DART station has a seafloor **Bottom Pressure Recorder (BPR)** that measures changes in water column pressure caused by a passing tsunami wave — even when the surface appears calm. When the BPR detects an anomaly, it triggers the surface buoy to transmit data in real time via satellite to NOAA's tsunami warning centers. This is the primary detection mechanism for distant-source tsunamis (e.g., Alaska or Japan generating a wave toward LA).

**Type of data it provides:**
- Real-time and historical water column height (pressure converted to meters) at 1-minute and 15-minute intervals
- Event-mode data (triggered, high-frequency) during a detected anomaly
- Available via **NDBC** (`ndbc.noaa.gov/dart`) as text files and through the NDBC API
- Data format: timestamped water height in meters, station ID, lat/lon
- Latency: typically 2–4 minutes from seafloor detection to satellite transmission

---

### NDBC — National Data Buoy Center

**What it is:** NDBC is NOAA's network of moored buoys, C-MAN (Coastal-Marine Automated Network) stations, and ships that collect real-time oceanographic and meteorological data across US coastal and offshore waters. It operates the DART buoys and dozens of standard weather/wave buoys off Southern California.

**What it does:** NDBC buoys continuously measure and transmit surface conditions. For LA-area marine operations, the relevant stations include buoys off Point Conception, Santa Monica Bay, and the Santa Barbara Channel. Data feeds weather models, surf forecasts, and port operations.

**Type of data it provides:**
- **Wave data:** significant wave height (Hs), dominant wave period, average wave period, wave direction
- **Wind data:** wind speed, gust, direction
- **Meteorological:** air temperature, sea surface temperature, atmospheric pressure, dewpoint
- **Water level** (select stations)
- Available via `ndbc.noaa.gov` as real-time text files (45-day rolling) and historical archives; also via the NOAA CO-OPS API
- Format: space-delimited text or JSON; free, no key required
- Update frequency: typically every 10–30 minutes per station

---

### CDIP — Coastal Data Information Program

**What it is:** CDIP is a wave monitoring and data management program run by the Scripps Institution of Oceanography (UC San Diego) in partnership with the US Army Corps of Engineers and NOAA. It operates a network of directional wave buoys along the US West Coast, including several off Southern California.

**What it does:** CDIP buoys provide higher-resolution directional wave spectra than standard NDBC buoys, making them the primary data source for surf forecasting along the California coast. The Harvest Platform buoy (off Point Conception) and Santa Monica Basin buoy are particularly relevant to LA harbor and beach conditions.

**Type of data it provides:**
- **Directional wave spectra** — full frequency-direction energy spectrum, not just summary statistics
- Significant wave height, peak period, peak direction, mean direction, directional spread
- Real-time and hindcast data
- Available via `cdip.ucsd.edu` and a NetCDF/Thredds server; also OPeNDAP access for programmatic queries
- Format: NetCDF (primary), CSV summaries available on the website
- Live access via API: partially verified — check `thredds.cdip.ucsd.edu` for current endpoints

---

### USGS Earthquake Catalog

**What it is:** The USGS Earthquake Hazards Program operates a national seismic monitoring network and publishes a real-time earthquake catalog via its public API. For marine hazard purposes, it is the primary source for detecting undersea earthquakes that may trigger local or distant tsunamis.

**What it does:** The USGS ingests data from hundreds of seismometers (including the Southern California Seismic Network, operated jointly with Caltech) and publishes earthquake events — including location, depth, magnitude, and time — typically within 1–5 minutes of detection for significant events. Submarine earthquakes at shallow depth with Mw ≥ 7.0 in subduction zones are the primary tsunami-triggering mechanism.

**Type of data it provides:**
- Real-time event feed via `earthquake.usgs.gov/earthquakes/feed/v1.0/`
- Formats: **GeoJSON**, CSV, KML, QuakeML, Atom
- Fields: magnitude, magnitude type, location (lat/lon/depth), origin time, place description, event ID, alert level (PAGER), tsunami flag
- The `tsunami` field in the GeoJSON feed flags events where a tsunami message has been issued
- Feed update intervals: real-time (every minute for significant events), 1-hour, 1-day, 7-day, and 30-day windows available
- Free, no API key required

### Caveats
- Several sources are older (2014, 2015, 2020, 2021). Treat details as "has existed," not "confirmed current."
- The coastal flooding and surf detection entries are the weakest and need confirmation before use in a pitch.

## Sources
- [Official tsunami warning levels (Humboldt State)](https://rctwg.humboldt.edu/node/8)
- [NOAA tsunami detection](https://tsunami.noaa.gov/node/8)
- [LA County beach evacuation system test (Santa Monica Daily Press)](https://www.smdp.com/los-angeles-county-tests-new-beach-evacuation-system)
- [LA County tsunami advisory preparations](https://beaches.lacounty.gov/july-30-tsunami-advisory-preparations/)
- [LA County tsunami closures notice](https://lacounty.gov/2025/07/30/stay-away-from-beaches-marina-del-rey-until-at-least-noon-on-wednesday/)
- [High surf warning bulletin (LA County Fire)](https://content.govdelivery.com/accounts/CALACOUNTY/bulletins/3825819)
- [Beach hazards warning, Dec 2020 (FOX LA)](https://www.foxla.com/news/beach-hazards-warning-issued-by-national-weather-service)
- [West swell, Feb 2026 (Hoodline)](https://hoodline.com/2026/02/raging-west-swell-turns-l-a-beaches-treacherous/)
- [King tides (LAist)](https://laist.com/news/return-of-the-king-tides)
- [LA County Public Works storm preparation](https://pw.lacounty.gov/explore-public-works/la-county-ramps-up-to-protect-communities-ahead-of-two-winter-storms/)
- [LA tsunami map (Long Beach Business Journal)](https://lbbusinessjournal.com/?p=8314)
- [NWS alerts API](https://www.weather.gov/documentation/services-web-alerts)
- [LA sea level rise vulnerability (USC)](https://today.usc.edu/las-vulnerability-to-future-sea-level-rise-projected/)
