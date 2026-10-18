import { distanceM, distToRingM, fmtDist, pointInRing } from "./geo.js";
import { CLASS_LABEL } from "./scenario.js";

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fmtMinutes = (min) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
};

// Compare one contact against every manifest entry on four questions:
//   where / when / what / how (behavior). Returns one row per entry.
export function evaluateContact({ pos, sonarClass, speedKt }, clockMin, manifest) {
  return manifest.map((entry) => {
    const d = distanceM(pos, entry.zone.center);
    const where = pointInRing(pos, entry.zone.ring)
      ? { pass: true, detail: "Inside the declared area" }
      : { pass: false, detail: `${fmtDist(distToRingM(pos, entry.zone.ring))} outside the declared area` };

    const start = toMin(entry.window.start);
    const end = toMin(entry.window.end);
    let when;
    if (clockMin >= start && clockMin <= end) {
      when = { pass: true, detail: `Window ${entry.window.start} to ${entry.window.end} is active` };
    } else if (clockMin < start) {
      when = { pass: false, detail: `Window starts ${entry.window.start} (in ${fmtMinutes(start - clockMin)})` };
    } else {
      when = { pass: false, detail: `Window ended ${entry.window.end} (${fmtMinutes(clockMin - end)} ago)` };
    }
    // A window only counts if the paperwork behind it is still valid.
    if (when.pass && entry.permit && entry.permit.expired) {
      when = { pass: false, detail: `Window is active but permit ${entry.permit.ref} expired ${entry.permit.validTo}` };
    }

    const what = entry.expect.classes.includes(sonarClass)
      ? { pass: true, detail: `${CLASS_LABEL[sonarClass]} contact fits` }
      : {
          pass: false,
          detail: `Expected ${entry.expect.classes.map((c) => CLASS_LABEL[c]).join(" / ")}, saw ${CLASS_LABEL[sonarClass]}`,
        };

    const [lo, hi] = entry.expect.speedKt;
    const how =
      speedKt >= lo && speedKt <= hi
        ? { pass: true, detail: `${speedKt.toFixed(1)} kt is within ${lo} to ${hi} kt` }
        : { pass: false, detail: `${speedKt.toFixed(1)} kt is outside ${lo} to ${hi} kt` };

    const checks = { where, when, what, how };
    const passCount = Object.values(checks).filter((c) => c.pass).length;
    return { entry, checks, passCount, allPass: passCount === 4, distanceM: d };
  });
}

export function rankResults(results) {
  return [...results].sort((a, b) => b.passCount - a.passCount || a.distanceM - b.distanceM);
}

// Three outcomes, not two: cleared / partial / unexplained.
export function verdictFrom(results) {
  const ranked = rankResults(results);
  const full = ranked.find((r) => r.allPass);
  if (full) return { type: "cleared", best: full };
  const best = ranked[0];
  if (best && (best.passCount >= 3 || (best.checks.where.pass && best.passCount >= 2))) {
    return { type: "partial", best };
  }
  return { type: "unexplained", best };
}
