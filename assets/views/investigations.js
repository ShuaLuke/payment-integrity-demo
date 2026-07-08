/* Cases — provider-level case list. A case exists for a provider once ≥1 of its
   leads is reviewed & confirmed (or escalated); it aggregates that provider's
   confirmed leads, and the provider's still-open leads "feed in" until confirmed.
   Cases are a post-payment / confirmed concept, so this view is always
   retrospective. Row → provider Case detail. View key stays "investigations". */
(function () {
  window.Views = window.Views || {};
  window.Views.investigations = {
    render: function (mount) {
      var cases = window.DP.listCases({ mode: "retrospective" });
      var caseLeads = cases.reduce(function (s, c) { return s + c.leadCount; }, 0);
      var feeding = cases.reduce(function (s, c) { return s + c.openCount; }, 0);
      var exposure = cases.reduce(function (s, c) { return s + (c.exposure || 0); }, 0);

      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Cases</div>' +
        '<div class="page-sub">A case opens when a lead is reviewed &amp; confirmed. One case per provider — multiple confirmed leads roll into it; the provider\'s still-open leads feed in until they\'re confirmed.</div></div>' +
        '<div class="kpis" style="grid-template-columns:repeat(4,150px);margin:0">' +
        '<div class="kpi"><div class="l">Open cases</div><div class="v">' + cases.length + '</div></div>' +
        '<div class="kpi"><div class="l">Confirmed leads</div><div class="v">' + caseLeads + '</div></div>' +
        '<div class="kpi"><div class="l">Open leads feeding in</div><div class="v">' + feeding + '</div></div>' +
        '<div class="kpi"><div class="l">Confirmed exposure</div><div class="v">' + window.DP.usdShort(exposure) + '</div></div></div></div>' +
        (cases.length ?
          '<div class="card" style="padding:0;overflow:hidden"><table><thead><tr>' +
          '<th>Risk</th><th>Provider (case)</th><th>Case status</th><th class="right">Confirmed leads</th><th class="right">Open feeding in</th><th>Type</th><th>Assignee</th><th class="right">Exposure</th></tr></thead><tbody>' +
          cases.map(function (c) {
            var p = c.provider;
            var caseCls = c.status === "Under investigation" ? "p-esc" : "p-new";
            var types = c.fwaTypes.slice(0, 2).map(function (t) { return '<span class="tag fwa">' + window.APP.esc(t) + '</span>'; }).join(" ") + (c.fwaTypes.length > 2 ? ' <span class="muted" style="font-size:10px">+' + (c.fwaTypes.length - 2) + '</span>' : "");
            return '<tr class="row" data-pid="' + c.providerId + '"><td>' + window.UI.riskChip(c.riskScore) + '</td>' +
              '<td><div style="font-weight:500">' + window.APP.esc(c.name) + '</div><div class="mono" style="font-size:10.5px;color:var(--text3)">CASE-' + c.providerId + ' · NPI ' + (p.npi || "—") + ' · ' + window.APP.esc(p.state || "") + '</div></td>' +
              '<td><span class="pill ' + caseCls + '">' + c.status + '</span></td>' +
              '<td class="right" style="font-weight:600">' + c.leadCount + '</td>' +
              '<td class="right">' + (c.openCount ? '<span class="muted">+' + c.openCount + '</span>' : '<span class="muted" style="color:var(--text3)">—</span>') + '</td>' +
              '<td>' + (types || '<span class="muted">—</span>') + '</td>' +
              '<td style="color:' + (c.assignee ? "var(--ink)" : "var(--text3)") + ';font-size:11.5px">' + window.APP.esc(c.assignee || "Unassigned") + '</td>' +
              '<td class="right" style="font-weight:500">' + window.DP.usd(c.exposure || 0) + '</td></tr>';
          }).join("") + '</tbody></table></div>'
          : '<div class="card" style="text-align:center;padding:32px"><i class="ti ti-folder-open" style="font-size:28px;color:var(--text3)"></i><div style="font-size:13px;color:var(--text2);margin-top:8px">No cases yet.</div><div style="font-size:11.5px;color:var(--text3);margin-top:3px">Confirm or escalate a lead in the work queue to open a provider case.</div></div>') +
        '</div>';
      mount.querySelectorAll("tr.row").forEach(function (tr) { tr.addEventListener("click", function () { window.APP.openProvider(tr.getAttribute("data-pid")); }); });
    }
  };
})();
