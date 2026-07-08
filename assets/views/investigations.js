/* Cases — provider-level case list. One row per provider with open leads;
   a Case aggregates all that provider's Leads (flagged claims). Clicking a
   row opens the provider Case detail (report card + rolled-up leads).
   View key stays "investigations" for router/state stability. */
(function () {
  window.Views = window.Views || {};
  window.Views.investigations = {
    render: function (mount) {
      var mode = window.APP.mode();
      var cases = window.DP.listCases({ mode: mode });
      var openCases = cases.filter(function (c) { return c.openCount > 0; });
      var openLeads = cases.reduce(function (s, c) { return s + c.openCount; }, 0);
      var exposure = cases.reduce(function (s, c) { return s + (c.exposure || 0); }, 0);
      var leadWord = mode === "prepay" ? "pending claims" : "leads";

      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Cases</div>' +
        '<div class="page-sub">One case per provider — aggregates all their ' + leadWord + ' (flagged claims). New leads auto-attach to the provider\'s case.</div></div>' +
        '<div class="kpis" style="grid-template-columns:repeat(3,150px);margin:0">' +
        '<div class="kpi"><div class="l">Open cases</div><div class="v">' + openCases.length + '</div></div>' +
        '<div class="kpi"><div class="l">Open ' + leadWord + '</div><div class="v">' + openLeads + '</div></div>' +
        '<div class="kpi"><div class="l">Exposure</div><div class="v">' + window.DP.usdShort(exposure) + '</div></div></div></div>' +
        (cases.length ?
          '<div class="card" style="padding:0;overflow:hidden"><table><thead><tr>' +
          '<th>Risk</th><th>Provider (case)</th><th>Case status</th><th class="right">Leads</th><th>Type</th><th>Assignee</th><th class="right">Exposure</th></tr></thead><tbody>' +
          cases.map(function (c) {
            var p = c.provider;
            var caseCls = c.status === "Under investigation" ? "p-esc" : c.status === "Closed" ? "p-dis" : "p-new";
            var types = c.fwaTypes.slice(0, 2).map(function (t) { return '<span class="tag fwa">' + window.APP.esc(t) + '</span>'; }).join(" ") + (c.fwaTypes.length > 2 ? ' <span class="muted" style="font-size:10px">+' + (c.fwaTypes.length - 2) + '</span>' : "");
            return '<tr class="row" data-pid="' + c.providerId + '"><td>' + window.UI.riskChip(c.riskScore) + '</td>' +
              '<td><div style="font-weight:500">' + window.APP.esc(c.name) + '</div><div class="mono" style="font-size:10.5px;color:var(--text3)">CASE-' + c.providerId + ' · NPI ' + (p.npi || "—") + ' · ' + window.APP.esc(p.state || "") + '</div></td>' +
              '<td><span class="pill ' + caseCls + '">' + c.status + '</span></td>' +
              '<td class="right"><span style="font-weight:500">' + c.openCount + '</span><span class="muted" style="font-size:10.5px"> / ' + c.leadCount + '</span></td>' +
              '<td>' + (types || '<span class="muted">—</span>') + '</td>' +
              '<td style="color:' + (c.assignee ? "var(--ink)" : "var(--text3)") + ';font-size:11.5px">' + window.APP.esc(c.assignee || "Unassigned") + '</td>' +
              '<td class="right" style="font-weight:500">' + window.DP.usd(c.exposure || 0) + '</td></tr>';
          }).join("") + '</tbody></table></div>'
          : '<div class="card" style="text-align:center;padding:32px"><i class="ti ti-folder-open" style="font-size:28px;color:var(--text3)"></i><div style="font-size:13px;color:var(--text2);margin-top:8px">No open cases.</div><div style="font-size:11.5px;color:var(--text3);margin-top:3px">A case opens automatically for any provider with a flagged ' + (mode === "prepay" ? "pending claim" : "lead") + '.</div></div>') +
        '</div>';
      mount.querySelectorAll("tr.row").forEach(function (tr) { tr.addEventListener("click", function () { window.APP.openProvider(tr.getAttribute("data-pid")); }); });
    }
  };
})();
