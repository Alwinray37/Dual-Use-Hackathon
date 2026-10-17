# 🌊 Hackathon Track Documentation

---

## 📋 Overview

| Field | Details |
|---|---|
| **Track** | Crisis Mitigation |
| **Vertical** | `01. Marine` — *with NULL Systems: Under the Water* |

---

## 🏷️ Track Brief: Crisis Mitigation

Teams that selected **Crisis Mitigation** at submission.

The judging criteria below apply to all Crisis Mitigation verticals — every design decision should be able to answer "yes" to each of these.

### Technical Depth
Does it detect, warn, and respond — not just display data?

### Feasibility
Could responders use it during a real incident?

### Impact
How many people are safer, and how much faster?

### Dual-Use
Useful on a normal day **and** when a wildfire, flood, or port threat hits.

---

## 🚢 Vertical Brief: Under the Water

**The Seat:** The harbor watch officer.

An unauthorized autonomous vehicle is in a working harbor. Detecting small underwater vehicles is getting easier. **Handling one safely is not.**

What sits between *"seen"* and *"handled"*?

- What should a small, low-cost platform **decide alone**?
- What **must a person approve**?
- What does it do for a living on a **quiet Tuesday** — like finding a lost research vehicle?

> Cost, safety, and scale all count. **Elegant beats loud.**

### ⚠️ Scope Boundary
> Work stops at the **handoff to a human**. How a vehicle is physically halted is out of scope.

---

## 🧩 Problem Statement

<!-- Describe the core problem you are solving -->

### Problem
> _What specific gap exists between detection and safe, human-approved response for unauthorized underwater vehicles in an active harbor?_

**Key tensions to address:**
- Detection capability is improving, but decision-making frameworks lag behind
- Harbor watch officers need actionable intelligence, not raw sensor feeds
- Autonomous systems must know their authority limits
- Normal operations cannot be disrupted by false positives or over-cautious alerts

---

## 💡 Solution

<!-- Describe your proposed solution at a high level -->

### High-Level Approach
> _What is your system, and what does it do?_

### Core Capability
> _One sentence: what problem does this solve, for whom, and how?_

---

## 🛠️ Technical Specifics

<!-- Deep dive into how it works -->

### Architecture
> _System diagram or description of components_

### Detection Layer
> _How does the system identify a potential unauthorized UUV?_

### Decision Logic
> _What does the autonomous platform decide on its own vs. escalate?_

### Alert & Warning System
> _How are alerts surfaced to the harbor watch officer?_

### Human-in-the-Loop Handoff
> _What information does the officer receive at the moment of handoff? What actions are they prompted to take?_

---

## 📅 Dual-Use: Quiet Tuesday vs. Crisis Day

| Scenario | Use Case |
|---|---|
| **Normal Operations** | e.g., locating lost research vehicles, routine harbor surveys |
| **Threat Response** | e.g., unauthorized UUV detected — classification, tracking, officer alert |
| **Post-Incident** | e.g., log replay, audit trail for harbor authority |

---

## 📐 Feasibility

<!-- Could responders actually use this during a real incident? -->

### Deployment Constraints
- Platform size / cost target: _TBD_
- Integration with existing harbor systems: _TBD_
- Operator training required: _TBD_

### Failure Modes & Mitigations
> _What happens when the system gets it wrong?_

---

## 📊 Impact

<!-- How many people are safer, and how much faster? -->

### Metrics
| Metric | Baseline | With Solution |
|---|---|---|
| Time from detection to officer alert | — | — |
| False positive rate | — | — |
| Coverage area per platform | — | — |

### Who is Safer?
> _Harbor workers, port infrastructure, civilian vessels, research teams — quantify where possible_

---

## 🚧 Out of Scope

- Physical interdiction / halting of a vehicle
- Weapons systems or any use-of-force decisions
- _Add any other explicit exclusions here_

---

## 📝 Team Notes & Open Questions

<!-- Use this section freely during the hackathon -->

- [ ] _Question / assumption to validate_
- [ ] _Technical risk to investigate_
- [ ] _Design decision pending_

---

## 🔗 References & Resources

<!-- Links to datasets, papers, APIs, prior art -->

- _Add relevant links here_

---

*Last updated: <!-- date -->*
