import { useState } from "react";
import MiniMap from "./MiniMap.jsx";
import { CLASS_LABEL, SONAR_NODES } from "../sim/scenario.js";
import { rankResults } from "../sim/matcher.js";
import { clockStr, contactDefs, defOf, predictAhead } from "../sim/useSimulation.js";
import { compass, fmtPos } from "../sim/geo.js";

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const HEADLINE = {
  unexplained: "Unexplained underwater contact",
  partial: "Partly matches today's activity",
  lost: "Contact lost before it could be checked",
};

function confidence(c) {
  const n = c.nodesSeen.length;
  const label = n >= 3 ? "High" : n === 2 ? "Medium" : "Low";
  return { label, text: `${label}, seen by ${n} of ${SONAR_NODES.length} sonar nodes` };
}

function buildPacket(def, c, sim) {
  const ranked = c.evaluation ? rankResults(c.evaluation) : [];
  const best = ranked[0];
  const pred = c.lost ? null : predictAhead(c, def.speedKt);
  const conf = confidence(c);
  const lines = [
    `UNDERWATER CONTACT ${c.id}: FOR BOAT CREW (observation only)`,
    `Prepared ${clockStr(sim.t)} harbor time. First seen ${clockStr(c.firstSeenT)}.`,
    ``,
    `Last position:  ${fmtPos(c.pos)}${c.lost ? "  (track lost, last known)" : ""}`,
    `Heading/speed:  ${Math.round(c.heading)} deg ${compass(c.heading)}, about ${def.speedKt.toFixed(1)} kt`,
    pred ? `In ~3 min:      ${fmtPos(pred)}  (estimate if it holds course)` : `In ~3 min:      not predicted, track lost`,
    `Sonar class:    ${CLASS_LABEL[def.sonarClass]} return`,
    `Confidence:     ${conf.text}`,
    ``,
    best
      ? `Manifest:       no full match. Closest ${best.entry.id} (${best.entry.title}), ${best.passCount} of 4 checks pass.`
      : `Manifest:       not checked.`,
    ``,
    `Not known:      owner, purpose, whether it is autonomous or towed, no visual ID yet.`,
    `Scope:          observe and report only. No interdiction.`,
  ];
  return lines.join("\n");
}

function whyFlagged(c) {
  if (!c.evaluation) return [];
  return rankResults(c.evaluation)
    .slice(0, 2)
    .map((r) => ({
      id: r.entry.id,
      title: r.entry.title,
      passCount: r.passCount,
      fails: Object.entries(r.checks).filter(([, v]) => !v.pass).map(([, v]) => v.detail),
    }));
}

function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
  } catch (e) {
    /* fall through */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
}

function Card({ sim, dispatch, c }) {
  const def = defOf(sim, c.id);
  const [copied, setCopied] = useState(false);
  const why = whyFlagged(c);
  const conf = confidence(c);
  const resolved = c.stage === "resolved";
  const headline = HEADLINE[c.verdict.type];
  const packet = c.actions.includes("boat") ? buildPacket(def, c, sim) : null;

  return (
    <div className={`oc${resolved ? " resolved" : ""}`}>
      <div className="oc-head">
        <div>
          <div className="oc-eyebrow">{c.id} &middot; first seen {clockStr(c.firstSeenT)}</div>
          <h2>{resolved ? "Resolved: logged as expected" : headline}</h2>
        </div>
        <span className="chip" style={{ background: resolved ? "#22c55e" : "#ef4444" }}>
          {resolved ? "Closed" : "Needs your decision"}
        </span>
      </div>

      <div className="oc-body">
        <MiniMap sim={sim} c={c} def={def} />

        <div className="oc-info">
          <h4>Why we flagged it</h4>
          {c.verdict.type === "lost" ? (
            <p className="panel-note">It was seen, but sonar coverage dropped before the manifest check could finish. Treat the last known position as the starting point.</p>
          ) : (
            <ul className="why">
              {why.map((w) => (
                <li key={w.id}>
                  <strong>{w.id} {w.title}</strong> ({w.passCount} of 4 fit)
                  <div className="cc-win">{w.fails.join(". ")}.</div>
                </li>
              ))}
              <li className="muted">All other entries fit less well.</li>
            </ul>
          )}

          <div className="kd">
            <div>
              <h4>What we know</h4>
              <ul>
                <li>{cap(CLASS_LABEL[def.sonarClass])} sonar return, about {def.speedKt.toFixed(1)} kt</li>
                <li>{c.lost ? "Last" : "Now"} at {fmtPos(c.pos)}, heading {compass(c.heading)}</li>
                <li>Track confidence: <strong>{conf.text}</strong></li>
              </ul>
            </div>
            <div>
              <h4>What we do not know</h4>
              <ul>
                <li>Who owns it or why it is here</li>
                <li>Whether it is autonomous or towed</li>
                <li>No visual ID yet, sonar only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {!resolved && (
        <div className="oc-actions">
          <div className="oc-actions-title">You decide. The system stops here.</div>
          <div className="oc-buttons">
            <button className="act clear" onClick={() => dispatch({ type: "ACTION", id: c.id, action: "clear" })}>
              <strong>Expected: log and clear</strong>
              <span>It is known activity. Close it.</span>
            </button>
            <button className={`act boat${c.actions.includes("boat") ? " done" : ""}`} onClick={() => dispatch({ type: "ACTION", id: c.id, action: "boat" })}>
              <strong>Send a boat to look</strong>
              <span>Get a one page packet for the crew.</span>
            </button>
            <button className={`act watch${c.actions.includes("watch") ? " done" : ""}`} onClick={() => dispatch({ type: "ACTION", id: c.id, action: "watch" })}>
              <strong>Keep investigating</strong>
              <span>Stream live updates on this contact.</span>
            </button>
          </div>
        </div>
      )}

      {resolved && (
        <div className="oc-followup">
          <p className="panel-note" style={{ margin: 0 }}>
            Logged at {clockStr(sim.t)}. This contact will not alert again, and the decision is in the audit log.
            Because it was real activity that was not on the board, the system suggests adding it to the manifest.
          </p>
        </div>
      )}

      {packet && (
        <div className="oc-followup">
          <div className="oc-follow-head">
            <strong>Boat crew packet</strong>
            <button
              className="mini"
              onClick={() => {
                copyText(packet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="packet">{packet}</pre>
          <div className="cc-win">Preparing the packet is the end of our scope. Whether and how to task the boat is the officer's call.</div>
        </div>
      )}

      {c.actions.includes("watch") && !resolved && (
        <div className="oc-followup">
          <div className="oc-follow-head"><strong>Live updates</strong><span className="livedot">live</span></div>
          <div className="feed">
            {[...c.feed].reverse().map((f, i) => (
              <div key={i} className="feedline"><span className="t">{clockStr(f.t)}</span> {f.text}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfficerView({ sim, dispatch }) {
  const defs = contactDefs(sim);
  const all = defs.map((d) => sim.contacts[d.id]);
  const queue = all.filter((c) => (c.stage === "handoff" || (c.stage === "resolved" && c.verdict && ["unexplained", "partial", "lost"].includes(c.verdict.type))));
  const open = queue.filter((c) => c.stage === "handoff");
  const cleared = all.filter((c) => c.stage === "cleared" || (c.stage === "resolved" && c.verdict && c.verdict.type === "cleared")).length;
  const animals = all.filter((c) => c.stage === "discarded").length;

  return (
    <div className="page officer">
      <div className="page-head officer-head">
        <div>
          <h2>Watch Officer</h2>
          <p className="panel-note" style={{ margin: 0 }}>
            What the officer sees. Quiet when everything is explained, a short evidence package when something is not.
          </p>
        </div>
        <div className="tally">
          <div><span className="n green">{cleared}</span> cleared on manifest</div>
          <div><span className="n grey">{animals}</span> wildlife logged</div>
          <div><span className={`n ${open.length ? "red" : "grey"}`}>{open.length}</span> need you</div>
        </div>
      </div>

      {queue.length === 0 && (
        <div className="calm">
          <div className="calm-icon">{"✓"}</div>
          <h3>Nothing needs your attention</h3>
          <p>
            {sim.t === 0
              ? "Press Play scenario. Anything the manifest explains is cleared quietly and never shows up here."
              : `${cleared} contact${cleared === 1 ? "" : "s"} matched today's manifest and ${animals} marine animal${animals === 1 ? " was" : "s were"} logged. Nobody was paged.`}
          </p>
        </div>
      )}

      {queue.map((c) => (
        <Card key={c.id} sim={sim} dispatch={dispatch} c={c} />
      ))}
    </div>
  );
}
