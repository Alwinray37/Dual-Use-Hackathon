# Dual-Use Hackathon — Team Documentation

**InnovateLA at USC Viterbi** · October 16–18, 2026 · Closing event of LA Tech Week

> *Build for LA. Build for the world.*

---

## About the Event

The Dual-Use Hackathon is a 48-hour, in-person building competition hosted by **InnovateLA at USC Viterbi**, held on USC's University Park Campus as the closing event of LA Tech Week. It is free to enter and open to anyone — engineers, designers, researchers, and policy minds alike.

Teams of 2–4 people receive a single mystery problem prompt, revealed live on Friday evening. From there, every team picks a **lens** — their angle on the problem — and builds over the weekend. Three live **twists** shift the problem through the night and into Saturday morning, and teams are scored in part on how well they adapt.

The event culminates in Sunday's finals at Ginsburg Hall, where seven finalist teams pitch live to a jury for the top three overall prizes and individual lens awards.

---

## Our Track: Crisis Mitigation

**Sponsor:** NULL Systems
**Prize:** Internship interview for every teammate, 45-minute session with the founders, and a run in their autonomy sim.

Teams that selected Crisis Mitigation are judged on four criteria:

| Criterion | What judges are looking for |
|---|---|
| **Technical Depth** | Does it detect, warn, and respond — not just display data? |
| **Feasibility** | Could responders use it during a real incident? |
| **Impact** | How many people are safer, and how much faster? |
| **Dual-Use** | Useful on a normal day and when a wildfire, flood, or port threat hits. |

---

## Twist 1: Under the Water

*Revealed: Friday, October 16, 11:30 PM*
*Vertical sponsor: NULL Systems*

**The seat:** the harbor watch officer.

An unauthorized autonomous vehicle is in a working harbor. Detecting small underwater vehicles is getting easier. Handling one safely is not. What sits between *"seen"* and *"handled"*? What should a small, low-cost platform decide alone, and what must a person approve? What does it do for a living on a quiet Tuesday — like finding a lost research vehicle? Cost, safety, and scale all count. Elegant beats loud.

> **Scope boundary:**  Work stops at the handoff to a human. How a vehicle is physically halted is out of scope this weekend.

---


## Repo Structure

Run the app with `cd frontend && npm install && npm run dev`.

- `frontend/src/sim/`: three scripted scenarios (quiet Tuesday, unexplained contact, partial match). `manifest.js` builds the single manifest from the `test-data/` JSON files. `scenario.js` defines sample contacts, source documents, and four simulated sonar nodes. `useSimulation.js` advances contacts and `matcher.js` checks each contact against the manifest.
- `test-data/`: canonical synthetic vessel, research asset, and marine mammal records. The research entries become the sonar-checked manifest. Vessels, fixed sensors, and wildlife are counted and used to explain contacts but are not sonar-checked in the demo.
- `frontend/src/map/harborGeography.js`: shared map reference locations and channel geometry.

The app uses demo data. No live AIS, sonar, NOAA, or permit feed is connected. The Reference map layer shows real buoy, tide gauge, and watch post locations for context only.
