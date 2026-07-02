/* Work queue view */
(function () {
  window.Views = window.Views || {};
  window.Views.queue = {
    render: function (mount) {
      var k = window.APP.kpis();
      var fwaTypes = Object.keys(window.DP.getAnomalyBreakdown()).sort();
      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Work queue</div><div class="page-sub">Flagged claims routed for post-payment review</div></div></div>' +
        '<div class="kpis">' +
        kpi("Open allegations", window.DP.getKpis().openAllegations) +
        kpi("Exposure (open queue)", window.DP.usd(window.DP.getKpis().exposurePost)) +
        kpi("Submitted for recovery", window.DP.usdShort(k.submittedForRecovery)) +
        kpi("Verified recoupment", window.DP.usdShort(k.verifiedRecoupment)) +
        '</div>' +
        '<div class="filters">' +
        '<div class="searchbox"><i class="ti ti-search"></i><input id="q-search" class="input" placeholder="Search provider, type, NPI…"></div>' +
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--text2)">Escalate ≥</span><input id="q-thr" type="range" min="0" max="100" value="0" step="1" style="width:120px"><span id="q-thrv" class="mono" style="font-size:12.5px;font-weight:500;min-width:22px">0</span></div>' +
        '<select id="q-fwa" class="input" style="width:auto"><option value="">All FWA types</option>' + fwaTypes.map(function (f) { return '<option>' + f + '</option>'; }).join("") + '</select>' +
        '</div>' +
        '<div class="card" style="padding:0;overflow:hidden">' +
        '<table><thead><tr><th>Risk</th><th>Allegation</th><th>Provider</th><th class="right">Exposure</th><th>Status</th><th>Assignee</th></tr></thead><tbody id="q-body"></tbody></table>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--text2)"><span id="q-count"></span><span>Teal bar = one of the 3 demo scenarios</span></div>' +
        '</div>';

      function draw() {
        var f = {
          query: document.getElementById("q-search").value,
          minRisk: +document.getElementById("q-thr").value,
          fwaType: document.getElementById("q-fwa").value || null
        };
        var rows = window.DP.listAllegations(f);
        var body = document.getElementById("q-body");
        body.innerHTML = rows.map(function (r) {
          return '<tr class="row" data-id="' + r.id + '"' + (r.hero ? ' data-hero="1"' : '') + '>' +
            '<td>' + window.UI.riskChip(r.riskScore) + '</td>' +
            '<td><div style="display:flex;gap:6px;align-items:center"><span class="mono" style="font-weight:500">#' + r.id + '</span><span class="tag">' + r.claimType + '</span></div>' +
            '<div style="margin-top:3px;display:flex;gap:6px;align-items:center"><span class="tag fwa">' + r.fwaType + '</span>' + window.UI.srcTag(r.source) + '</div></td>' +
            '<td><div style="font-weight:500">' + window.APP.esc(r.providerName) + '</div><div class="mono" style="font-size:10.5px;color:var(--text3)">NPI ' + r.providerNpi + ' · ' + r.providerState + '</div></td>' +
            '<td class="right" style="font-weight:500">' + window.DP.usd(r.exposurePost) + '</td>' +
            '<td>' + window.UI.statusPill(r.status) + '</td>' +
            '<td style="color:' + (r.assignee ? 'var(--ink)' : 'var(--text3)') + '">' + (r.assignee || "Unassigned") + '</td>' +
            '</tr>';
        }).join("");
        document.getElementById("q-count").textContent = "Showing " + rows.length + " of " + window.DP.raw.allegations.length;
        body.querySelectorAll("tr.row").forEach(function (tr) {
          tr.addEventListener("click", function () { window.APP.openAllegation(tr.getAttribute("data-id")); });
        });
      }
      document.getElementById("q-thr").addEventListener("input", function () { document.getElementById("q-thrv").textContent = this.value; draw(); });
      document.getElementById("q-search").addEventListener("input", draw);
      document.getElementById("q-fwa").addEventListener("change", draw);
      draw();
    }
  };
  function kpi(l, v) { return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div></div>'; }
})();
