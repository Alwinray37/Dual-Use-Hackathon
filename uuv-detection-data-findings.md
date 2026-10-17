# UUV Detection Data: What Exists and What We Can Use

Prompt: Under the Water (harbor watch officer). Compiled Oct 17, 2026 from public sources.

> **Important:** The JSON and type snippets in Part 3 are **our own illustrative schemas for the simulation**. They are NOT real exports from any product. No public dataset of harbor UUV tracks was found (such data is mostly classified). Everything in Parts 1 and 2 comes from the cited sources.

---

## TL;DR

- Detection is treated as a **given input** by the prompt ("detecting small underwater vehicles is getting easier").
- Real systems give a **track** (position, bearing, confidence, threat level), not just a blip.
- Classification uses **size/echo, speed, heading, behavior, noise, bubbles**.
- **Behavior** (is it heading at an asset? is the path straight?) is the cheap, strong signal a small platform can compute.
- The hard case is the **harmless sensor vehicle vs. armed vehicle**. Sources give a target of **1 false alarm per day**.
- Our platform's job: **confirm, identify, and package** a contact for the officer.

---

## Part 1: What detection systems output

| Field | What the sources say | Source |
|---|---|---|
| Position and bearing | Bearing accuracy down to 0.35 deg. Position accuracy under 1 m at 150 m range | Sentinel IDS |
| Detection range | Mini-subs and similar vehicles up to about 1,500 m. Divers about 1,000 m | Sentinel IDS |
| Navy range goal | Detect a Remus 100-size object or larger at 1,000 m | Navy SBIR N152-113 |
| Class label | Most probable class: fish, unassisted diver, assisted diver, UUV, sea mammal | Patent US8144546 |
| Threat level | Reported continuously. Alert level rises as active and passive tracks are correlated | Sentinel IDS |
| Track history | Historical tracks can be replayed to evaluate threats | Sentinel IDS |
| Handoff | Tracks passed automatically to command centers with no manual relay | Navy Lanternfish exercise |
| Raw imagery | Range-bearing images up to 40 Hz, but only 10 to 200 m range depending on model | Oculus M-Series |

Notes:
- The imaging sonar (Oculus) datasheet describes **no tracking or classification**. It is a close-range look sensor, useful for "second look" ideas.
- Sentinel does not list speed or heading as outputs. Only the patent describes them as classifier inputs.

---

## Part 2: Factors used to classify a contact

From the swimming-object patent (the most detailed source):

| Factor | How it helps | Distinguishes |
|---|---|---|
| Echo strength and aspect change | Hints at size and shape | Fish vs. vehicle vs. diver |
| Speed, acceleration, turn rate | From the tracker | Animal vs. powered vehicle |
| Heading | Toward or away from an asset | Hostile vs. non-hostile behavior |
| Path straightness | Direct path vs. meandering | Survey/loiter vs. approach |
| Emitted noise | Motor or propeller noise, spectrum, blade count | Man-made vs. natural |
| Doppler | Mostly low for targets, mammals are the exception | Mammal vs. others |
| Bubbles | Trail behind scuba divers (the diver's echo is weak) | Diver (open circuit) |
| Depth | Not mentioned in sources read | Unknown |

### Behavior metrics (patent idea, our simplified versions)

The patent describes two behavior measures. These formulas are **our simplified interpretation**, not copied from the patent:

```
approach_ratio (K-like) = distance_moved_toward_asset / total_distance_moved
straightness   (L-like) = straight_line_distance(start, end) / total_path_length
```

Rough meaning:
- `approach_ratio` near 1.0: heading straight at the asset. Near 0: moving away or sideways.
- `straightness` near 1.0: a direct path. Low: wandering, loitering, or a survey pattern.

A lost research vehicle might drift (low straightness, low approach). A hostile run might be direct (high both). That contrast is a good demo moment.

---

## Part 3: Snippets we can use (illustrative, for the simulation)

### 3a. Incoming detection track (what we assume upstream gives us)

```json
{
  "track_id": "T-0042",
  "timestamp": "2026-10-17T10:51:12Z",
  "position": { "lat": 33.7361, "lon": -118.2630, "depth_m": null },
  "range_m": 820,
  "bearing_deg": 214.5,
  "speed_kts": 2.8,
  "heading_deg": 41.0,
  "upstream_class": "UUV",
  "upstream_confidence": 0.62,
  "echo_strength_db": -18.0,
  "emits_noise": true,
  "bubble_trail": false
}
```

### 3b. Type definitions

```ts
type UpstreamClass =
  | "fish"
  | "diver_unassisted"
  | "diver_assisted"
  | "uuv"
  | "mammal"
  | "unknown";

interface DetectionTrack {
  trackId: string;
  timestamp: string;          // ISO 8601
  lat: number;
  lon: number;
  depthM: number | null;      // often unavailable
  rangeM: number;
  bearingDeg: number;
  speedKts: number;
  headingDeg: number;
  upstreamClass: UpstreamClass;
  upstreamConfidence: number; // 0 to 1
  echoStrengthDb?: number;
  emitsNoise?: boolean;
  bubbleTrail?: boolean;
}
```

### 3c. What our platform adds (the "seen to handled" gap)

```ts
type Authority = "decide_alone" | "alert_and_wait" | "needs_approval";

interface ContactAssessment {
  trackId: string;
  behavior: {
    approachRatio: number;    // 0 to 1
    straightness: number;     // 0 to 1
    loitering: boolean;
  };
  identity: {
    matchedKnownVehicle: string | null;  // e.g. registry or schedule match
    authorized: boolean | null;          // null = unknown
  };
  confidence: number;         // 0 to 1, honest uncertainty
  recommendedAction: string;
  authority: Authority;
}
```

### 3d. Handoff packet to the officer (single screen)

```json
{
  "track_id": "T-0042",
  "summary": "Probable small UUV, unknown owner, heading toward Berth 7",
  "confidence": 0.71,
  "why": ["direct path", "closing at 2.8 kts", "no match in authorized list"],
  "uncertainty": ["depth unknown", "echo could fit large debris"],
  "recommended_next_step": "Approve close-range second look",
  "needs_human_approval": true,
  "track_history_url": "replay/T-0042"
}
```

### 3e. Quiet Tuesday version (same platform, different job)

```json
{
  "track_id": "T-0107",
  "summary": "Probable research vehicle, drifting, matches 'SurveyBot-3' last known position",
  "confidence": 0.88,
  "why": ["low speed", "wandering path", "matches registry entry"],
  "recommended_next_step": "Notify owner with position",
  "needs_human_approval": false
}
```

---

## Part 4: Design implications

1. Treat detection as **upstream input**. We build the layer after it.
2. **Behavior** is cheap to compute and does not need fancy sensors.
3. **Show uncertainty**. Depth is often missing, and echoes can be ambiguous.
4. Design against a **false alarm budget** (the Navy topic cites 1 per day).
5. The key metric is the **officer's response window**: the Navy says current warning ranges do not give a satisfactory one.
6. Keep the **handoff packet short**: summary, confidence, why, uncertainty, next step.

---

## Part 5: Gaps and caveats

- Speed and heading are not listed as outputs in the Sentinel brochure.
- Lanternfish exercise sources gave no vehicle speeds, sizes, or depths.
- The Navy topic does not define classes beyond "sensor-laden, no direct threat" vs. "armed."
- Only the first 100,000 of about 121,000 characters of the patent were read.
- Our schemas in Part 3 are assumptions. Validate them with your team before building.

---

## Sources

- [Sentinel IDS brochure](https://www.unmannedsystemstechnology.com/wp-content/uploads/2022/06/Sentinel_IDS_Brochure.pdf)
- [Navy SBIR N152-113: UUV Detection and Classification in Harbor Environments](https://navysbir.com/n15_2/N152-113.htm)
- [Patent US8144546B2: Detection and classification of a swimming object](https://patents.google.com/patent/US8144546B2/en)
- [Navy Lanternfish exercise (Naval News)](https://www.navalnews.com/?p=89424)
- [Blueprint Subsea Oculus M-Series datasheet](https://download.videoray.com/documentation/mss/pdf/blueprint_subsea/oculus/Oculus_M-Series_Datasheet_EN.pdf)
- [C4ISRNET: Searching for UUVs in harbor](https://c4isrnet.com/unmanned/2015/05/19/searching-for-uuvs-in-harbor)
