/* Work queue view — the analyst's daily triage surface */
(function () {
  window.Views = window.Views || {};
  var OPEN = ["New", "Assigned", "Under review", "Returned", "Pending review", "Recommended close"];
  var STATUSES = ["New", "Assigned", "Under review", "Returned", "Pending review", "Confirmed", "Dismissed", "Escalated"];

  window.Views.queue = {
    render: function (mount) {
      var st = window.APP.state.qfilters || (window.APP.state.qfilters = { scope: "all", status: "", fwa: "", assignee: "", sort: "risk", minRisk: 0, query: "" });
      var meName = window.APP.ROLES[window.APP.state.role].name;
      var all = window.DP.listAllegations();
      var openCount = all.filter(function (r) { return OPEN.indexOf(r.status) >= 0; }).length;
      var openExp = all.filter(function (r) { return OPEN.indexOf(r.status) >= 0; }).reduce(function (s, r) { return s + r.exposurePost; }, 0);
      var k = window.APP.kpis();
      var fwaTypes = Object.keys(window.DP.getAnomalyBreakdown()).sort();
      var assignees = all.map(function (r) { return r.assignee; }).filter(function (v, i, arr) { return v && arr.indexOf(v) === i; }).sort();

      function seg(v, l) { return '<button class="qscope' + (st.scope === v ? " active" : "") + '" data-scope="' + v + '">' + l + '</button>'; }
      function opt(val, label, sel) { return '<option value="' + val + '"' + (sel === val ? " selected" : "") + '>' + label + '</option>'; }

      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Work queue</div><div class="page-sub">Flagged claims routed for post-payment review</div></div>' +
        '<div style="display:flex;gap:2px;background:var(--surface);border:0.5px solid var(--border);border-radius:8px;padding:2px">' + seg("all", "All open") + seg("my", "My cases") + seg("unassigned", "Unassigned") + '</div></div>' +
        '<div class="kpis">' +
        kpi("Open flagged claims", openCount) + kpi("Exposure (open queue)", window.DP.usd(openExp)) +
        kpi("Submitted for recovery", window.DP.usdShort(k.submittedForRecovery)) + kpi("Verified recoupment", window.DP.usdShort(k.verifiedRecoupment)) +
        '</div>' +
        '<div class="filters">' +
        '<div class="searchbox"><i class="ti ti-search"></i><input id="q-search" class="input" placeholder="Search provider, type, NPI…" value="' + window.APP.esc(st.query) + '"></div>' +
        '<select id="q-status" class="input" style="width:auto"><option value="">Open (default)</option>' + STATUSES.map(function (s) { return opt(s, s, st.status); }).join("") + '</select>' +
        '<select id="q-fwa" class="input" style="width:auto"><option value="">All FWA types</option>' + fwaTypes.map(function (f) { return opt(f, f, st.fwa); }).join("") + '</select>' +
        '<select id="q-assignee" class="input" style="width:auto"><option value="">Any assignee</option>' + opt("__none__", "Unassigned", st.assignee) + assignees.map(function (a) { return opt(a, a, st.assignee); }).join("") + '</select>' +
        '<select id="q-sort" class="input" style="width:auto"><option value="risk"' + (st.sort === "risk" ? " selected" : "") + '>Sort: Risk</option><option value="exposure"' + (st.sort === "exposure" ? " selected" : "") + '>Sort: Exposure</option><option value="newest"' + (st.sort === "newest" ? " selected" : "") + '>Sort: Newest</option></select>' +
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--text2)">Min risk</span><input id="q-thr" type="range" min="0" max="100" value="' + st.minRisk + '" step="1" style="width:100px"><span id="q-thrv" class="mono" style="font-size:12.5px;font-weight:500;min-width:22px">' + st.minRisk + '</span></div>' +
        '<button class="btn" id="q-clear" style="font-size:11.5px"><i class="ti ti-x"></i> Clear</button>' +
        '</div>' +
        '<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Risk</th><th>Flagged claim</th><th>Provider</th><th class="right">Exposure</th><th>Status</th><th>Assignee</th></tr></thead><tbody id="q-body"></tbody></table></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--text2)"><span id="q-count"></span><span>Teal bar = one of the 3 demo scenarios</span></div>' +
        '</div>';

      function draw() {
        var rows = window.DP.listAllegations();
        if (st.status) rows = rows.filter(function (r) { return r.status === st.status; });
        else rows = rows.filter(function (r) { return OPEN.indexOf(r.status) >= 0; });
        if (st.scope === "my") rows = rows.filter(function (r) { return r.assignee === meName; });
        if (st.scope === "unassigned") rows = rows.filter(function (r) { return !r.assignee; });
        if (st.assignee === "__none__") rows = rows.filter(function (r) { return !r.assignee; });
        else if (st.assignee) rows = rows.filter(function (r) { return r.assignee === st.assignee; });
        if (st.fwa) rows = rows.filter(function (r) { return r.fwaType === st.fwa; });
        if (st.minRisk) rows = rows.filter(function (r) { return r.riskScore >= st.minRisk; });
        if (st.query) { var q = st.query.toLowerCase(); rows = rows.filter(function (r) { return [r.providerName, r.fwaType, r.providerNpi, r.id].join(" ").toLowerCase().indexOf(q) >= 0; }); }
        rows.sort(function (a, b) { return st.sort === "exposure" ? b.exposurePost - a.exposurePost : st.sort === "newest" ? (a.createdDate < b.createdDate ? 1 : -1) : b.riskScore - a.riskScore; });

        document.getElementById("q-body").innerHTML = rows.map(function (r) {
          return '<tr class="row" data-id="' + r.id + '"' + (r.hero ? ' data-hero="1"' : '') + '>' +
            '<td>' + window.UI.riskChip(r.riskScore) + '</td>' +
            '<td><div style="display:flex;gap:6px;align-items:center"><span class="mono" style="font-weight:500">#' + r.id + '</span><span class="tag">' + r.claimType + '</span></div>' +
            '<div style="margin-top:3px;display:flex;gap:6px;align-items:center"><span class="tag fwa">' + r.fwaType + '</span>' + window.UI.srcTag(r.source) + '</div></td>' +
            '<td><div style="font-weight:500">' + window.APP.esc(r.providerName) + '</div><div class="mono" style="font-size:10.5px;color:var(--text3)">NPI ' + r.providerNpi + ' · ' + r.providerState + '</div></td>' +
            '<td class="right" style="font-weight:500">' + window.DP.usd(r.exposurePost) + '</td>' +
            '<td>' + window.UI.statusPill(r.status) + '</td>' +
            '<td style="color:' + (r.assignee ? "var(--ink)" : "var(--text3)") + '">' + (r.assignee || "Unassigned") + '</td></tr>';
        }).join("") || '<tr><td colspan="6" class="muted" style="padding:16px;text-align:center">No flagged claims match these filters.</td></tr>';
        document.getElementById("q-count").textContent = "Showing " + rows.length + (st.status ? "" : " open") + " of " + all.length;
        document.getElementById("q-body").querySelectorAll("tr.row").forEach(function (tr) { tr.addEventListener("click", function () { window.APP.openAllegation(tr.getAttribute("data-id")); }); });
      }

      mount.querySelectorAll(".qscope").forEach(function (b) { b.addEventListener("click", function () { st.scope = b.getAttribute("data-scope"); mount.querySelectorAll(".qscope").forEach(function (x) { x.classList.toggle("active", x === b); }); draw(); }); });
      document.getElementById("q-thr").addEventListener("input", function () { st.minRisk = +this.value; document.getElementById("q-thrv").textContent = this.value; draw(); });
      document.getElementById("q-search").addEventListener("input", function () { st.query = this.value; draw(); });
      document.getElementById("q-status").addEventListener("change", function () { st.status = this.value; draw(); });
      document.getElementById("q-fwa").addEventListener("change", function () { st.fwa = this.value; draw(); });
      document.getElementById("q-assignee").addEventListener("change", function () { st.assignee = this.value; draw(); });
      document.getElementById("q-sort").addEventListener("change", function () { st.sort = this.value; draw(); });
      document.getElementById("q-clear").addEventListener("click", function () { window.APP.state.qfilters = { scope: "all", status: "", fwa: "", assignee: "", sort: "risk", minRisk: 0, query: "" }; window.APP.nav("queue"); });
      draw();
    }
  };
  function kpi(l, v) { return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div></div>'; }
})();
