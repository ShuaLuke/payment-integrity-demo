/* Guided demo ribbon — scripted walkthrough of the 3 scenarios.
   Removable: the × hides it (a floating "Guided demo" pill re-opens). Delete this
   file + its <script> + #demo-ribbon to remove entirely. */
(function () {
  function q(sel) { return document.querySelector(sel); }
  function click(sel) { var e = q(sel); if (e) e.click(); }

  var STEPS = [
    { t: "Your day starts here", n: "Home orients the analyst — cases assigned to me, my highest-risk items, anything a supervisor returned, and my exposure. The app is grouped into Home · Casework · Insights · Library.", a: function () { window.APP.setRole("analyst"); window.APP.nav("home"); } },
    { t: "The work queue", n: "Casework › Work queue: 24 post-payment claims flagged by the rules and pattern engines, sorted by risk. Drag “Escalate ≥” to raise the threshold.", a: function () { window.APP.setRole("analyst"); window.APP.nav("queue"); } },
    { t: "Fraud #1 — upcoding", n: "Open allegation #20481. Alamo Internal Medicine bills 99215 on ~90% of visits vs a 14% peer median. Read the explainable-AI “Why this was flagged” panel and the rule/model outcomes.", a: function () { window.APP.setRole("analyst"); window.APP.openAllegation("20481"); } },
    { t: "Evidence & precedent", n: "The medical record is opened for you — it doesn't support level-5 complexity. “Similar adjudicated cases” shows precedent (one confirmed with recovery, one dismissed).", a: function () { window.APP.setRole("analyst"); window.APP.openAllegation("20481"); click('.doc-row[data-doc="mr"]'); click('.prec-row'); } },
    { t: "Analyst decides", n: "Choose Confirm, click “Draft with AI” for the rationale, then Submit. It routes to the supervisor — the money does NOT move to recovery yet.", a: function () { window.APP.setRole("analyst"); window.APP.openAllegation("20481"); } },
    { t: "Supervisor review", n: "Switch roles (top-right) to Supervisor (Karen Boyd) — the whole workspace changes. Confirmations wait under Casework › Approvals; Approve releases the recovery, or Return sends it back. Only approval moves the money.", a: function () { window.APP.setRole("supervisor"); window.APP.nav("approvals"); } },
    { t: "Fraud #2 — the ring", n: "The network view reveals collusion: Alamo & Rio Grande share a TIN and 6 patients. Click “Highlight ring.” Rio Grande's unbundling (#20517) uses modifier 59 to bypass the NCCI edit.", a: function () { window.APP.setRole("analyst"); window.APP.nav("network"); } },
    { t: "Weird but legitimate", n: "Open #20463 — a dialysis provider flagged for frequency (36 claims / 90 days), but at low 61% confidence. The medical record shows ESRD with a standing dialysis order. This is the human-in-the-loop catch.", a: function () { window.APP.setRole("analyst"); window.APP.openAllegation("20463"); click('.doc-row[data-doc="mr"]'); } },
    { t: "Analyst dismisses", n: "Dismiss as a false positive with a rationale — logged for model retraining, $0 recovered. The tool supported the analyst's judgment instead of a wrong accusation.", a: function () { window.APP.setRole("analyst"); window.APP.openAllegation("20463"); } },
    { t: "Aggregate analytics", n: "The oversight view: exposure & recovery trends, exposure by anomaly type, peer comparison, ROI, and the human-in-the-loop feedback loop feeding model retraining.", a: function () { window.APP.nav("analytics"); } },
    { t: "Explore the rest", n: "Everything's grouped: Home orients your day, Casework is the daily loop, Insights holds the network, provider 360, heatmap and trends, and Library has the rules and audit trail. The Copilot is bottom-right on every screen.", a: function () { window.APP.setRole("analyst"); window.APP.nav("home"); } }
  ];

  var DEMO = {
    i: 0,
    start: function () { DEMO.show(); DEMO.go(0); },
    show: function () { q("#demo-ribbon").style.display = "block"; var p = q("#demo-pill"); if (p) p.style.display = "none"; },
    hide: function () { q("#demo-ribbon").style.display = "none"; DEMO.pill(); window.APP.auditLog("DEMO_HIDDEN", "Guided demo ribbon dismissed"); },
    go: function (n) {
      DEMO.i = Math.max(0, Math.min(STEPS.length - 1, n));
      var s = STEPS[DEMO.i];
      try { if (s.a) s.a(); } catch (e) {}
      DEMO.render();
    },
    next: function () { if (DEMO.i < STEPS.length - 1) DEMO.go(DEMO.i + 1); },
    prev: function () { if (DEMO.i > 0) DEMO.go(DEMO.i - 1); },
    render: function () {
      var s = STEPS[DEMO.i], n = DEMO.i + 1, N = STEPS.length;
      var dots = STEPS.map(function (_, k) { return '<span data-go="' + k + '" style="width:7px;height:7px;border-radius:50%;cursor:pointer;background:' + (k === DEMO.i ? "#17b3a6" : "rgba(255,255,255,0.25)") + '"></span>'; }).join("");
      q("#demo-ribbon").innerHTML =
        '<div style="max-width:1180px;margin:0 auto;padding:7px 20px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="display:flex;align-items:center;gap:7px;white-space:nowrap"><i class="ti ti-player-play" style="color:#7fe0d6"></i><span style="font-size:12px;font-weight:500;color:#fff">Guided demo</span><span style="font-size:11px;color:#93a7bf">' + n + '/' + N + '</span></div>' +
        '<div style="flex:1;display:flex;justify-content:center;align-items:center;gap:5px">' + dots + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">' +
        '<button id="demo-prev" class="btn" style="padding:4px 9px;font-size:12px;background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.25)"' + (DEMO.i === 0 ? " disabled" : "") + '><i class="ti ti-chevron-left"></i></button>' +
        '<button id="demo-next" class="btn" style="padding:4px 11px;font-size:12px;background:#17b3a6;color:#04342c;border-color:#17b3a6"' + (DEMO.i === N - 1 ? " disabled" : "") + '>Next <i class="ti ti-chevron-right"></i></button>' +
        '<button id="demo-close" title="Hide demo" class="btn" style="padding:4px 7px;font-size:12px;background:transparent;color:#93a7bf;border-color:rgba(255,255,255,0.2)"><i class="ti ti-x"></i></button>' +
        '</div></div>' +
        '<div style="font-size:12.5px;color:#cfe0f0;margin-top:5px;line-height:1.45"><span style="font-weight:500;color:#fff">' + s.t + '.</span> ' + s.n + '</div>' +
        '</div>';
      q("#demo-prev").onclick = DEMO.prev;
      q("#demo-next").onclick = DEMO.next;
      q("#demo-close").onclick = DEMO.hide;
      q("#demo-ribbon").querySelectorAll("[data-go]").forEach(function (d) { d.onclick = function () { DEMO.go(+d.getAttribute("data-go")); }; });
    },
    pill: function () {
      var p = q("#demo-pill");
      if (!p) {
        p = document.createElement("button");
        p.id = "demo-pill";
        p.style.cssText = "position:fixed;bottom:18px;left:18px;z-index:200;background:#10243b;color:#fff;border:0.5px solid rgba(255,255,255,0.2);border-radius:22px;padding:8px 14px;font-size:12.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 12px rgba(0,0,0,0.2)";
        p.innerHTML = '<i class="ti ti-player-play" style="color:#7fe0d6"></i> Guided demo';
        p.onclick = DEMO.start;
        document.body.appendChild(p);
      }
      p.style.display = "flex";
    }
  };
  window.DEMO = DEMO;

  function boot() { if (!window.APP) { return setTimeout(boot, 60); } DEMO.start(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
