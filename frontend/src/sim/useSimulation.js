import { useEffect, useReducer } from "react";
import { bearingDeg, compass, destination, distanceM, fmtClock, fmtPos, lerp, KT_TO_MS } from "./geo.js";
import { CLOCK_START_MIN, MANIFEST, SCENARIOS, SONAR_NODES, WILDLIFE } from "./scenario.js";
import { evaluateContact, verdictFrom } from "./matcher.js";

// Timing, in sim seconds.
export const CONFIRM_S = 5; // "keep watching": confirm a track before escalating anything
export const ROW_S = 0.9; // one manifest row checked per ROW_S
const PRE_CHECK_S = 1.2;
const POST_CHECK_S = 1.4;
const ANIMAL_S = 2.5;
const LOST_S = 10;
const FEED_S = 3;
const TRAIL_S = 1.2;

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
}

export const clockStr = (t) => fmtClock(CLOCK_START_MIN * 60 + t);

// Where is a scripted contact at sim time t?
export function positionAt(def, t) {
  const local = t - def.startT;
  if (local < 0) return null;
  const pts = def.waypoints;
  const segLen = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distanceM(pts[i], pts[i + 1]);
    segLen.push(d);
    total += d;
  }
  const f = Math.min(local / def.duration, 1);
  let target = f * total;
  let i = 0;
  while (i < segLen.length - 1 && target > segLen[i]) {
    target -= segLen[i];
    i++;
  }
  const frac = segLen[i] > 0 ? Math.min(target / segLen[i], 1) : 1;
  return {
    pos: lerp(pts[i], pts[i + 1], frac),
    heading: bearingDeg(pts[i], pts[i + 1]),
    moving: f < 1,
  };
}

function newContact(def) {
  return {
    id: def.id,
    stage: "pending",
    pos: null,
    heading: 0,
    firstSeenT: null,
    lastSeenT: null,
    confirmT: null,
    checkT: null,
    handoffT: null,
    nodesSeen: [],
    nodesNow: [],
    trail: [],
    lost: false,
    evaluation: null,
    verdict: null,
    actions: [],
    feed: [],
    lastFeedT: null,
  };
}

export function initState(scenarioId, prev) {
  const sc = getScenario(scenarioId);
  return {
    scenarioId: sc.id,
    t: 0,
    running: false,
    speed: prev && prev.speed ? prev.speed : 1,
    offline: {},
    selected: null,
    contacts: Object.fromEntries(sc.contacts.map((d) => [d.id, newContact(d)])),
    log: [],
  };
}

const nodeName = (id) => {
  const n = SONAR_NODES.find((x) => x.id === id);
  return n ? `${id} ${n.name}` : id;
};

function step(prev, def, t, s, log) {
  const p = positionAt(def, t);
  if (!p) return prev;
  const c = { ...prev, pos: p.pos, heading: p.heading };

  const nodes = SONAR_NODES.filter(
    (n) => !s.offline[n.id] && distanceM(p.pos, n.pos) <= n.rangeM
  );
  c.nodesNow = nodes.map((n) => n.id);

  if (nodes.length) {
    c.lastSeenT = t;
    if (c.lost) {
      c.lost = false;
      log.push({ t, id: def.id, kind: "info", text: `${def.id}: track reacquired by ${nodes.map((n) => n.id).join(", ")}.` });
    }
    const seen = new Set(c.nodesSeen);
    nodes.forEach((n) => seen.add(n.id));
    if (seen.size !== c.nodesSeen.length) c.nodesSeen = [...seen];
    const lastTrail = c.trail.length ? c.trail[c.trail.length - 1].t : -99;
    if (t - lastTrail >= TRAIL_S) c.trail = [...c.trail, { t, pos: p.pos }];
    if (c.firstSeenT == null) {
      c.firstSeenT = t;
      c.stage = "detected";
      log.push({ t, id: def.id, kind: "info", text: `${def.id}: new sonar contact on ${nodes.map((n) => nodeName(n.id)).join(", ")}. Watching before escalating.` });
    }
  } else if (c.firstSeenT != null && !c.lost && t - c.lastSeenT > LOST_S) {
    c.lost = true;
    log.push({ t, id: def.id, kind: "warn", text: `${def.id}: no sonar coverage. Track lost at ${fmtPos(c.trail.length ? c.trail[c.trail.length - 1].pos : p.pos)}.` });
    if (["detected", "tracking", "checking"].includes(c.stage)) {
      c.stage = "handoff";
      c.handoffT = t;
      c.verdict = { type: "lost", bestId: null, bestPass: 0 };
      log.push({ t, id: def.id, kind: "alert", text: `${def.id}: lost before it could be checked. Sent to watch officer with last known position.` });
    }
  }

  // Stage machine
  if (c.stage === "detected") {
    if (def.sonarClass === "marine-animal" && t - c.firstSeenT >= ANIMAL_S) {
      c.stage = "discarded";
      c.verdict = { type: "animal" };
      const sp = def.speciesId ? WILDLIFE[def.speciesId] : null;
      const what = sp ? `a ${sp.common_name.toLowerCase()} (expected around ${sp.expected_habitat.slice(0, 3).join(", ")})` : "marine animal";
      log.push({ t, id: def.id, kind: "ok", text: `${def.id}: classified as ${what}. Not tracked as a vehicle, logged for wildlife awareness.` });
    } else if (t - c.firstSeenT >= CONFIRM_S || c.nodesSeen.length >= 2) {
      c.stage = "tracking";
      c.confirmT = t;
      log.push({ t, id: def.id, kind: "info", text: `${def.id}: track confirmed (${c.nodesSeen.length} node${c.nodesSeen.length > 1 ? "s" : ""}). Checking manifest.` });
    }
  } else if (c.stage === "tracking" && t - c.confirmT >= PRE_CHECK_S) {
    c.stage = "checking";
    c.checkT = t;
    const clockMin = CLOCK_START_MIN + t / 60;
    c.evaluation = evaluateContact(
      { pos: p.pos, sonarClass: def.sonarClass, speedKt: def.speedKt },
      clockMin,
      MANIFEST
    );
  } else if (c.stage === "checking" && t - c.checkT >= MANIFEST.length * ROW_S + POST_CHECK_S) {
    const v = verdictFrom(c.evaluation);
    c.verdict = { type: v.type, bestId: v.best.entry.id, bestPass: v.best.passCount };
    c.handoffT = t;
    if (v.type === "cleared") {
      c.stage = "cleared";
      log.push({ t, id: def.id, kind: "ok", text: `${def.id}: matched ${v.best.entry.id} (${v.best.entry.title}). Cleared quietly, nobody paged.` });
    } else {
      c.stage = "handoff";
      log.push({
        t,
        id: def.id,
        kind: "alert",
        text:
          v.type === "partial"
            ? `${def.id}: closest is ${v.best.entry.id} but only ${v.best.passCount} of 4 checks pass. Sent to watch officer. System stops here.`
            : `${def.id}: no manifest match. Sent to watch officer. System stops here.`,
      });
    }
  }

  // "Keep investigating" live feed (officer-chosen)
  if (c.stage === "handoff" && c.actions.includes("watch") && (c.lastFeedT == null || t - c.lastFeedT >= FEED_S)) {
    c.feed = [...c.feed, feedLine(def, c, t)];
    c.lastFeedT = t;
  }
  return c;
}

export function feedLine(def, c, t) {
  return {
    t,
    text: c.lost
      ? `Track lost. Last position ${fmtPos(c.pos)}`
      : `${fmtPos(c.pos)}  hdg ${Math.round(c.heading)}° ${compass(c.heading)}  ${def.speedKt.toFixed(1)} kt  seen by ${c.nodesNow.length || 0} node${c.nodesNow.length === 1 ? "" : "s"}`,
  };
}

// Predicted position `seconds` ahead of a contact at its current heading and speed (nominal).
export function predictAhead(c, speedKt, seconds = 180) {
  if (!c.pos) return null;
  return destination(c.pos, c.heading, speedKt * KT_TO_MS * seconds);
}

export function reducer(s, a) {
  switch (a.type) {
    case "LOAD":
      return initState(a.id, s);
    case "RESTART":
      return { ...initState(s.scenarioId, s), running: true };
    case "PLAY":
      return { ...s, running: true };
    case "PAUSE":
      return { ...s, running: false };
    case "TOGGLE":
      return { ...s, running: !s.running };
    case "SPEED":
      return { ...s, speed: a.speed };
    case "SELECT":
      return { ...s, selected: a.id };
    case "NODE": {
      const offline = { ...s.offline, [a.id]: !s.offline[a.id] };
      const log = [
        ...s.log,
        {
          t: s.t,
          id: a.id,
          kind: offline[a.id] ? "warn" : "info",
          text: offline[a.id]
            ? `${nodeName(a.id)} went silent. Could be failed, drifted or out of range, so the system will not guess. Coverage gap flagged.`
            : `${nodeName(a.id)} is reporting again.`,
        },
      ];
      return { ...s, offline, log };
    }
    case "ACTION": {
      const prev = s.contacts[a.id];
      if (!prev) return s;
      const c = { ...prev, actions: prev.actions.includes(a.action) ? prev.actions : [...prev.actions, a.action] };
      const log = [...s.log];
      const def = getScenario(s.scenarioId).contacts.find((d) => d.id === a.id);
      if (a.action === "clear") {
        c.stage = "resolved";
        log.push({ t: s.t, id: a.id, kind: "ok", text: `Officer logged ${a.id} as expected. No further alerts for this contact.` });
      } else if (a.action === "boat") {
        c.packetT = s.t;
        log.push({ t: s.t, id: a.id, kind: "info", text: `Officer asked for a boat crew packet on ${a.id}. Tasking the boat is the officer's call.` });
      } else if (a.action === "watch") {
        c.feed = def && c.pos ? [...c.feed, feedLine(def, c, s.t)] : c.feed;
        c.lastFeedT = s.t;
        log.push({ t: s.t, id: a.id, kind: "info", text: `Officer chose to keep investigating ${a.id}. Live updates started.` });
      }
      return { ...s, contacts: { ...s.contacts, [a.id]: c }, log };
    }
    case "TICK": {
      if (!s.running) return s;
      const t = s.t + a.dt * s.speed;
      const log = s.log.slice();
      const contacts = {};
      for (const def of getScenario(s.scenarioId).contacts) {
        contacts[def.id] = step(s.contacts[def.id], def, t, s, log);
      }
      return { ...s, t, contacts, log };
    }
    default:
      return s;
  }
}

export function useSimulation() {
  const [sim, dispatch] = useReducer(reducer, "quiet", (id) => initState(id));
  useEffect(() => {
    if (!sim.running) return undefined;
    const iv = setInterval(() => dispatch({ type: "TICK", dt: 0.1 }), 100);
    return () => clearInterval(iv);
  }, [sim.running]);
  return [sim, dispatch];
}

// ── Derived helpers shared by components ─────────────────────────────────────
export function contactDefs(sim) {
  return getScenario(sim.scenarioId).contacts;
}

export function defOf(sim, id) {
  return contactDefs(sim).find((d) => d.id === id);
}

export function handoffs(sim) {
  return Object.values(sim.contacts).filter((c) => c.stage === "handoff");
}

export function focusContact(sim) {
  const all = Object.values(sim.contacts).filter((c) => c.stage !== "pending");
  if (sim.selected && sim.contacts[sim.selected] && sim.contacts[sim.selected].stage !== "pending") {
    return sim.contacts[sim.selected];
  }
  return (
    all.find((c) => c.stage === "handoff") ||
    all.find((c) => c.stage === "checking") ||
    all.find((c) => c.stage === "tracking" || c.stage === "detected") ||
    all[all.length - 1] ||
    null
  );
}

export const STAGE_STYLE = {
  pending: { label: "Not seen", color: "#64748b" },
  detected: { label: "Watching", color: "#f59e0b" },
  tracking: { label: "Confirmed", color: "#f59e0b" },
  checking: { label: "Checking manifest", color: "#f59e0b" },
  cleared: { label: "Cleared, on manifest", color: "#22c55e" },
  discarded: { label: "Marine animal", color: "#94a3b8" },
  handoff: { label: "Needs a decision", color: "#ef4444" },
  resolved: { label: "Resolved by officer", color: "#22c55e" },
};

export function activeStatus(entry, t) {
  if (entry.permit && entry.permit.expired) return "expired";
  const clockMin = CLOCK_START_MIN + t / 60;
  const [sh, sm] = entry.window.start.split(":").map(Number);
  const [eh, em] = entry.window.end.split(":").map(Number);
  if (clockMin < sh * 60 + sm) return "upcoming";
  if (clockMin > eh * 60 + em) return "ended";
  return "active";
}
