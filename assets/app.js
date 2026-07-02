/* PIVOT app shell — router, state, audit trail, decision/case-flow. window.APP */
(function () {
  var mount;
  var APP = {
    state: { view: "queue", allegationId: null, filters: {}, decisions: {}, audit: [], investigations: [], role: "analyst" },

    ROLES: { analyst: { name: "Dana Whitmore", title: "Analyst", initials: "DW" }, supervisor: { name: "Karen Boyd", title: "Supervisor", initials: "KB" } },
    isSupervisor: function () { return APP.state.role === "supervisor"; },
    setRoleHeader: function () {
      var r = APP.ROLES[APP.state.role];
      var n = document.getElementById("role-name"), t = document.getElementById("role-title"), av = document.getElementById("role-avatar");
      if (n) n.textContent = r.name; if (t) t.textContent = r.title; if (av) av.textContent = r.initials;
    },
    toggleRole: function () { APP.setRole(APP.state.role === "analyst" ? "supervisor" : "analyst"); },
    setRole: function (role) {
      if (APP.state.role === role) return;
      APP.state.role = role;
      APP.setRoleHeader();
      APP.auditLog("ROLE_SWITCH", "Now acting as " + APP.ROLES[role].name + " (" + APP.ROLES[role].title + ")");
      var v = APP.state.view;
      if (role === "analyst" && v === "approvals") v = "queue";
      if (role === "supervisor" && v === "queue") v = "approvals";
      APP.nav(v, { id: APP.state.allegationId });
    },

    fmtTs: function (d) {
      d = d || new Date();
      var p = function (n) { return String(n).padStart(2, "0"); };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    },
    esc: function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); },

    auditLog: function (action, detail) {
      APP.state.audit.unshift({ ts: new Date(), action: action, detail: detail, user: "Dana Whitmore" });
      var b = document.getElementById("audit-badge");
      if (b) { b.textContent = APP.state.audit.length; b.style.display = APP.state.audit.length ? "inline-block" : "none"; }
    },

    kpis: function () {
      var k = Object.assign({}, window.DP.getKpis());
      var add = 0;
      Object.keys(APP.state.decisions).forEach(function (id) {
        var dec = APP.state.decisions[id];
        // recovery counts only after a supervisor approves the confirmation
        if (dec.outcome === "confirm" && dec.reviewState === "approved") { var a = window.DP.getAllegation(id); if (a) add += a.exposurePost || 0; }
      });
      k.submittedForRecovery = k.submittedForRecovery + add;
      return k;
    },

    // Analyst submits a decision. Confirm/Escalate route to the supervisor queue;
    // Dismiss is analyst-final. Recovery/investigation only fire on supervisor approval.
    applyDecision: function (id, outcome, rationale) {
      var a = window.DP.raw.allegations.find(function (x) { return x.id === id; });
      if (!a) return;
      var final = outcome === "dismiss";
      var status = final ? "Dismissed" : "Pending review";
      var reviewState = final ? "final" : "pending";
      a.status = status; a.assignee = a.assignee || "Dana Whitmore";
      APP.state.decisions[id] = { outcome: outcome, rationale: rationale, ts: new Date(), status: status, reviewState: reviewState };
      APP.auditLog("DECISION_" + outcome.toUpperCase(), "Allegation #" + id + " · " + (final ? "Dismissed (false positive)" : outcome) + (rationale ? " · rationale recorded" : ""));
      if (!final) APP.auditLog("SUBMITTED_FOR_REVIEW", "Allegation #" + id + " · " + outcome + " → supervisor (Karen Boyd)");
      APP.updateSupBadge();
    },

    // Supervisor approves or returns a pending decision.
    supervisorAction: function (id, action, note) {
      var dec = APP.state.decisions[id]; if (!dec) return;
      var a = window.DP.raw.allegations.find(function (x) { return x.id === id; });
      if (action === "approve") {
        dec.reviewState = "approved";
        a.status = dec.outcome === "confirm" ? "Confirmed" : "Escalated";
        dec.status = a.status;
        APP.auditLog("SUPERVISOR_APPROVED", "Allegation #" + id + " · " + a.status + " · approver Karen Boyd");
        if (dec.outcome === "confirm") APP.auditLog("RECOVERY_SUBMITTED", "Allegation #" + id + " · " + window.DP.usd(a.exposurePost || 0));
        if (dec.outcome === "escalate") { APP.state.investigations.push(id); APP.auditLog("INVESTIGATION_OPENED", "Allegation #" + id + " · " + a.providerId); }
      } else {
        dec.reviewState = "returned"; dec.returnNote = note || "";
        a.status = "Returned"; dec.status = "Returned";
        APP.auditLog("SUPERVISOR_RETURNED", "Allegation #" + id + (note ? " · " + note : ""));
      }
      APP.updateSupBadge();
    },

    pendingReviews: function () {
      return Object.keys(APP.state.decisions)
        .filter(function (id) { return APP.state.decisions[id].reviewState === "pending"; })
        .map(function (id) { return { id: id, dec: APP.state.decisions[id], a: window.DP.getAllegation(id) }; });
    },
    updateSupBadge: function () {
      var n = APP.pendingReviews().length;
      var b = document.getElementById("sup-badge");
      if (b) { b.textContent = n; b.style.display = (n && APP.isSupervisor()) ? "inline-block" : "none"; }
      var sb = document.getElementById("sub-appr-badge");
      if (sb) sb.innerHTML = n ? '<span class="tag" style="background:#c77d11;color:#fff">' + n + '</span>' : "";
    },

    decisionFor: function (id) { return APP.state.decisions[id] || null; },

    // ---- information architecture: 4 areas, each with sub-views ----
    SUBS: {
      home: [],
      casework: [{ v: "queue", l: "Work queue", role: "analyst" }, { v: "approvals", l: "Approvals", role: "supervisor" }, { v: "investigations", l: "Investigations" }],
      insights: [{ v: "analytics", l: "Overview" }, { v: "network", l: "Network" }, { v: "heatmap", l: "Heatmap" }],
      library: [{ v: "rules", l: "Rules" }, { v: "audit", l: "Audit" }]
    },
    VIEW_AREA: { home: "home", queue: "casework", claim: "casework", investigations: "casework", approvals: "casework", provider: "insights", analytics: "insights", network: "insights", heatmap: "insights", rules: "library", audit: "library" },
    subsFor: function (area) { return (APP.SUBS[area] || []).filter(function (s) { return !s.role || s.role === APP.state.role; }); },
    areaOf: function (view) { return APP.VIEW_AREA[view] || "casework"; },
    openArea: function (area) {
      if (area === "home") return APP.nav("home");
      if (area === "casework") return APP.nav(APP.isSupervisor() ? "approvals" : "queue");
      var subs = APP.subsFor(area);
      APP.nav(subs.length ? subs[0].v : area);
    },

    nav: function (view, params) {
      APP.state.view = view;
      var area = APP.areaOf(view);
      document.querySelectorAll(".navitem").forEach(function (n) {
        n.classList.toggle("active", n.getAttribute("data-area") === area);
      });
      APP.renderSubnav(area, view);
      window.scrollTo(0, 0);
      var V = window.Views[view];
      if (V) V.render(mount, params || {});
    },
    renderSubnav: function (area, view) {
      var el = document.getElementById("subnav"); if (!el) return;
      var subs = APP.subsFor(area);
      if (area === "home" || subs.length < 1) { el.style.display = "none"; return; }
      var wsLabel = APP.isSupervisor() && area === "casework" ? '<span style="font-size:11px;color:var(--accent-d);font-weight:500;margin-right:14px"><i class="ti ti-user-shield"></i> Supervisor workspace</span>' : "";
      el.style.display = "block";
      el.innerHTML = '<div style="max-width:1180px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:2px">' + wsLabel +
        subs.map(function (s) {
          var active = s.v === view || (view === "claim" && s.v === "queue") || (view === "provider" && s.v === "analytics");
          return '<button class="subtab' + (active ? " active" : "") + '" data-view="' + s.v + '">' + s.l + (s.v === "approvals" ? ' <span id="sub-appr-badge"></span>' : "") + '</button>';
        }).join("") + '</div>';
      el.querySelectorAll(".subtab").forEach(function (b) { b.addEventListener("click", function () { APP.nav(b.getAttribute("data-view")); }); });
      APP.updateSupBadge();
    },

    openAllegation: function (id) { APP.state.allegationId = id; APP.nav("claim", { id: id }); },
    openProvider: function (id) { APP.state.providerId = id; APP.nav("provider", { id: id }); },

    boot: function () {
      mount = document.getElementById("view");
      document.getElementById("disclaimer").textContent = window.DP.disclaimer;
      document.querySelectorAll(".navitem").forEach(function (n) {
        n.addEventListener("click", function () { APP.openArea(n.getAttribute("data-area")); });
      });
      var rs = document.getElementById("role-switch");
      if (rs) rs.addEventListener("click", APP.toggleRole);
      APP.setRoleHeader();
      APP.auditLog("SESSION_START", "Analyst signed in · PIV authenticated");
      APP.nav("home");
    }
  };
  window.APP = APP;

  // helpers shared by views
  window.UI = {
    riskChip: function (r) {
      var b = window.DP.band(r), cls = b === "high" ? "rh" : b === "med" ? "rm" : "rl",
        lbl = b === "high" ? "High" : b === "med" ? "Medium" : "Low";
      return '<span class="chip ' + cls + '"><span class="s">' + r + '</span> ' + lbl + '</span>';
    },
    statusPill: function (s) {
      var m = { "New": "p-new", "Assigned": "p-asg", "Under review": "p-rev", "Recommended close": "p-rec", "Confirmed": "p-conf", "Dismissed": "p-dis", "Escalated": "p-esc", "Pending review": "p-pend", "Returned": "p-ret" };
      return '<span class="pill ' + (m[s] || "p-asg") + '">' + s + '</span>';
    },
    srcTag: function (s) { return '<span class="muted" style="font-size:10.5px">' + (s === "Pattern Recognition" ? "AI" : s === "Rules Engine" ? "Rule" : "AI+Rule") + '</span>'; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", APP.boot);
  else APP.boot();
})();
