import { CLASS_LABEL, MANIFEST } from "../sim/scenario.js";
import { CONFIRM_S, ROW_S, STAGE_STYLE, clockStr, contactDefs, defOf, focusContact } from "../sim/useSimulation.js";
import { fmtPos } from "../sim/geo.js";

const CHECK_KEYS = [
  ["where", "Where"],
  ["when", "When"],
  ["what", "What"],
  ["how", "How it moves"],
];

function Cell({ check, state }) {
  if (state === "pending") return <td className="cc-cell pending">·</td>;
  if (state === "running") return <td className="cc-cell running"><span className="spin" /></td>;
  return (
    <td className={`cc-cell ${check.pass ? "pass" : "fail"}`}>
      <span className="mark">{check.pass ? "✓" : "✕"}</span>
      <span className="detail">{check.detail}</span>
    </td>
  );
}

function VerdictBanner({ c }) {
  if (!c.verdict) return null;
  const v = c.verdict;
  if (v.type === "cleared") {
    return (
      <div className="verdict ok">
        <strong>Cleared on manifest ({v.bestId}).</strong> Logged quietly. Nobody was paged.
      </div>
    );
  }
  if (v.type === "animal") {
    return (
      <div className="verdict neutral">
        <strong>Marine animal.</strong> Not treated as a vehicle. Logged for wildlife awareness.
      </div>
    );
  }
  const text =
    v.type === "partial"
      ? `Partial match: closest is ${v.bestId} (${v.bestPass} of 4 checks pass). Sent to the watch officer. The system stops here.`
      : v.type === "lost"
      ? "Lost before the check could finish. Sent to the watch officer with the last known position. The system stops here."
      : "No manifest match. Sent to the watch officer. The system stops here.";
  return (
    <div className="verdict alert">
      <strong>{v.type === "partial" ? "Needs a decision." : v.type === "lost" ? "Needs a decision." : "Unexplained."}</strong> {text}
      <span className="verdict-hint">See the Officer view tab for what the officer sees.</span>
    </div>
  );
}

export default function ContactCheckPanel({ sim, dispatch }) {
  const defs = contactDefs(sim);
  const live = defs.filter((d) => sim.contacts[d.id].stage !== "pending");
  const c = focusContact(sim);
  const def = c ? defOf(sim, c.id) : null;

  if (!c) {
    return (
      <div className="cc-empty">
        <h3 className="panel-heading">Contact Check</h3>
        <p className="panel-note">
          Press <strong>Play scenario</strong>. When a sonar node picks up a contact, it appears here and is
          checked against today's manifest, one entry at a time.
        </p>
        <p className="panel-note">
          The system never asks "is this a threat?". It asks "is this something we expected?" and only
          bothers the officer when the answer is no.
        </p>
      </div>
    );
  }

  const checking = c.stage === "checking";
  const revealed = checking ? Math.floor((sim.t - c.checkT) / ROW_S) : MANIFEST.length;
  const preCheck = ["detected", "tracking"].includes(c.stage);
  const progress = c.firstSeenT != null ? Math.min(1, (sim.t - c.firstSeenT) / CONFIRM_S) : 0;
  const recentLog = [...sim.log].reverse().slice(0, 6);

  return (
    <div className="cc">
      <div className="cc-list">
        {live.map((d) => {
          const k = sim.contacts[d.id];
          const st = STAGE_STYLE[k.stage];
          return (
            <button
              key={d.id}
              className={`cc-item${c.id === d.id ? " sel" : ""}`}
              onClick={() => dispatch({ type: "SELECT", id: d.id })}
            >
              <span className="cc-dot" style={{ background: st.color }} />
              <span className="cc-id">{d.id}</span>
              <span className="cc-stage" style={{ color: st.color }}>{k.lost ? "Track lost" : st.label}</span>
            </button>
          );
        })}
      </div>

      <div className="cc-main">
        <div className="cc-head">
          <div>
            <h3 className="panel-heading" style={{ margin: 0 }}>
              {c.id} <span className="muted">({CLASS_LABEL[def.sonarClass]} sonar return)</span>
            </h3>
            <div className="cc-sub">
              {fmtPos(c.pos)} &middot; {def.speedKt.toFixed(1)} kt &middot; seen by{" "}
              {c.nodesNow.length ? c.nodesNow.join(", ") : "no node right now"} &middot; first seen{" "}
              {clockStr(c.firstSeenT)}
            </div>
          </div>
          <span className="chip" style={{ background: STAGE_STYLE[c.stage].color }}>
            {c.lost ? "Track lost" : STAGE_STYLE[c.stage].label}
          </span>
        </div>

        {preCheck && (
          <div className="cc-watch">
            <div className="cc-watch-title">
              {c.stage === "detected"
                ? "Keep watching: confirming this is a real track before anyone is bothered"
                : "Confirmed. Starting manifest check"}
            </div>
            <div className="bar"><div className="bar-fill" style={{ width: `${progress * 100}%` }} /></div>
            <div className="cc-watch-sub">One noisy ping never pages the officer. A track needs to hold for {CONFIRM_S} s or be seen by two nodes.</div>
          </div>
        )}

        {c.stage === "discarded" && <VerdictBanner c={c} />}

        {c.evaluation && (
          <>
            <table className="panel-table cc-table">
              <thead>
                <tr>
                  <th>Manifest entry</th>
                  {CHECK_KEYS.map(([k, label]) => <th key={k}>{label}</th>)}
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {c.evaluation.map((r, i) => {
                  const state = i < revealed ? "done" : i === revealed && checking ? "running" : "pending";
                  const best = c.verdict && c.verdict.bestId === r.entry.id;
                  return (
                    <tr key={r.entry.id} className={`${state === "done" && r.allPass ? "match" : ""}${best && c.verdict.type !== "cleared" ? " closest" : ""}`}>
                      <td>
                        <code>{r.entry.id}</code> {r.entry.title}
                        <div className="cc-win">{r.entry.window.start} to {r.entry.window.end}</div>
                      </td>
                      {CHECK_KEYS.map(([k]) => <Cell key={k} check={r.checks[k]} state={state} />)}
                      <td className="cc-res">
                        {state !== "done" ? "" : r.allPass ? <span className="pass">Match</span> : <span className="muted">{r.passCount} of 4</span>}
                        {state === "done" && best && c.verdict.type !== "cleared" && <div className="closest-tag">closest</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <VerdictBanner c={c} />
          </>
        )}

        <div className="cc-log">
          <div className="cc-log-title">Event log</div>
          {recentLog.length === 0 && <div className="muted">Nothing yet.</div>}
          {recentLog.map((l, i) => (
            <div key={i} className={`logline ${l.kind}`}>
              <span className="t">{clockStr(l.t)}</span> {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
