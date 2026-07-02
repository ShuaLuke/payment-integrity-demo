/* Investigations — escalated cases */
(function () {
  window.Views = window.Views || {};
  window.Views.investigations = {
    render: function (mount) {
      var rows = window.DP.listInvestigations().sort(function (a, b) { return b.riskScore - a.riskScore; });
      var exposure = rows.reduce(function (s, a) { return s + (a.exposurePost || 0); }, 0);
      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Investigations</div><div class="page-sub">Escalated cases under active investigation</div></div>' +
        '<div class="kpis" style="grid-template-columns:repeat(2,140px);margin:0"><div class="kpi"><div class="l">Open</div><div class="v">' + rows.length + '</div></div><div class="kpi"><div class="l">Exposure</div><div class="v">' + window.DP.usdShort(exposure) + '</div></div></div></div>' +
        (rows.length ?
          '<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Risk</th><th>Provider</th><th>FWA type</th><th>Source</th><th>Assignee</th><th class="right">Exposure</th></tr></thead><tbody>' +
          rows.map(function (a) {
            var p = window.DP.getProvider(a.providerId);
            return '<tr class="row" data-id="' + a.id + '"><td>' + window.UI.riskChip(a.riskScore) + '</td>' +
              '<td><div style="font-weight:500">' + window.APP.esc(p.name) + '</div><div class="mono" style="font-size:10.5px;color:var(--text3)">INV-' + a.id + ' · NPI ' + p.npi + '</div></td>' +
              '<td><span class="tag fwa">' + a.fwaType + '</span></td><td>' + window.UI.srcTag(a.source) + '</td>' +
              '<td style="color:' + (a.assignee ? "var(--ink)" : "var(--text3)") + '">' + (a.assignee || "Unassigned") + '</td>' +
              '<td class="right" style="font-weight:500">' + window.DP.usd(a.exposurePost || 0) + '</td></tr>';
          }).join("") + '</tbody></table></div>'
          : '<div class="card" style="text-align:center;padding:32px"><i class="ti ti-folder-open" style="font-size:28px;color:var(--text3)"></i><div style="font-size:13px;color:var(--text2);margin-top:8px">No open investigations.</div><div style="font-size:11.5px;color:var(--text3);margin-top:3px">Escalate an allegation (with supervisor approval) to open one.</div></div>') +
        '</div>';
      mount.querySelectorAll("tr.row").forEach(function (tr) { tr.addEventListener("click", function () { window.APP.openAllegation(tr.getAttribute("data-id")); }); });
    }
  };
})();
