/* Provider 360 profile */
(function () {
  window.Views = window.Views || {};
  window.Views.provider = {
    render: function (mount, params) {
      var id = params.id || window.APP.state.providerId;
      var p = window.DP.getProvider(id);
      if (!p) { mount.innerHTML = '<div class="page"><p>Provider not found.</p></div>'; return; }
      var allegs = window.DP.listAllegationsByProvider(id);
      var claims = window.DP.listClaimsByProvider(id);
      var exposure = allegs.reduce(function (s, a) { return s + (a.exposurePost || 0); }, 0);
      var ring = window.DP.listProviders().filter(function (x) { return x.tin === p.tin; }).length > 1;
      var bench = window.DP.getPeerBenchmark("internal_medicine_em");
      var showPeer = typeof p.em99215ShareComputed === "number" && p.peerGroup === "internal_medicine_tx";

      mount.innerHTML =
        '<div class="page">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="btn" id="pv-back" style="padding:5px 9px"><i class="ti ti-arrow-left"></i> Back</span>' +
        '<span class="page-title">' + window.APP.esc(p.name) + '</span>' + window.UI.riskChip(p.riskScore || 0) + '</div>' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="width:220px;flex:none;display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:6px">Provider</div>' +
        '<div style="font-size:11px;color:var(--text2);margin-bottom:7px">' + window.APP.esc(p.taxonomyLabel || "") + ' · ' + (p.taxonomyCode || "") + '</div>' +
        '<div class="mono" style="font-size:11px;line-height:1.7">NPI ' + p.npi + '<br>TIN ' + (ring ? '<span style="background:var(--high-bg);color:var(--high-tx);padding:0 3px;border-radius:3px">' + p.tin + '</span>' : p.tin) + '</div>' +
        (ring ? '<div style="font-size:11px;color:var(--high);margin-top:5px"><i class="ti ti-affiliate"></i> Shared TIN — provider ring</div>' : '') +
        '<div style="font-size:11px;color:var(--text2);margin-top:6px">' + window.APP.esc(p.city || "") + ', ' + (p.state || "") + '</div>' +
        '<div style="font-size:11.5px;color:var(--accent-d);margin-top:8px;cursor:pointer" id="pv-net"><i class="ti ti-share-3"></i> View in network</div></div>' +
        (showPeer ? '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:7px">Peer scorecard · 99215 share</div>' +
          bar("This provider", p.em99215ShareComputed, true) + bar("Peer median", bench.median99215Share, false) +
          '<div style="font-size:10.5px;color:var(--text2);margin-top:5px">Internal Medicine · TX · ' + bench.peerCount + ' peers</div></div>' : '') +
        '</div>' +
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px">' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
        kpi("Claims", p.claimCount || claims.length) + kpi("Open allegations", allegs.length) +
        kpi("Flagged exposure", window.DP.usd(exposure)) + kpi("Total paid", window.DP.usd(p.totalPaid || 0)) + '</div>' +
        '<div class="card" style="padding:0;overflow:hidden"><div style="padding:11px 13px 6px;font-weight:500;font-size:13px">Allegations (' + allegs.length + ')</div>' +
        '<table><thead><tr><th>Risk</th><th>FWA type</th><th>Status</th><th class="right">Exposure</th></tr></thead><tbody>' +
        (allegs.length ? allegs.sort(function (a, b) { return b.riskScore - a.riskScore; }).map(function (a) {
          return '<tr class="row" data-id="' + a.id + '"><td>' + window.UI.riskChip(a.riskScore) + '</td><td><span class="tag fwa">' + a.fwaType + '</span> <span class="mono" style="font-size:10.5px;color:var(--text3)">#' + a.id + '</span></td><td>' + window.UI.statusPill(a.status) + '</td><td class="right" style="font-weight:500">' + window.DP.usd(a.exposurePost || 0) + '</td></tr>';
        }).join("") : '<tr><td colspan="4" class="muted" style="padding:12px">No allegations.</td></tr>') +
        '</tbody></table></div>' +
        '<div class="card" style="padding:0;overflow:hidden"><div style="padding:11px 13px 6px;font-weight:500;font-size:13px">Recent claims <span class="muted" style="font-weight:400;font-size:11px">· showing ' + Math.min(claims.length, 8) + ' of ' + claims.length + '</span></div>' +
        '<table><thead><tr><th>Claim</th><th>Type</th><th>DOS</th><th class="right">Paid</th></tr></thead><tbody>' +
        claims.slice(0, 8).map(function (c) { return '<tr><td class="mono" style="font-size:11px">' + c.claimNumber + '</td><td>' + c.type + '</td><td class="mono" style="font-size:11px">' + c.dateOfService + '</td><td class="right">' + window.DP.usd(c.paidAmount) + '</td></tr>'; }).join("") +
        '</tbody></table></div>' +
        '</div></div></div>';

      document.getElementById("pv-back").addEventListener("click", function () { window.APP.nav("queue"); });
      document.getElementById("pv-net").addEventListener("click", function () { window.APP.nav("network"); });
      mount.querySelectorAll("tr.row").forEach(function (tr) { tr.addEventListener("click", function () { window.APP.openAllegation(tr.getAttribute("data-id")); }); });
    }
  };
  function kpi(l, v) { return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div></div>'; }
  function bar(label, share, self) {
    return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span' + (self ? ' style="font-weight:500;color:var(--high-tx)"' : '') + '>' + label + '</span><span style="font-weight:500' + (self ? ';color:var(--high-tx)' : '') + '">' + Math.round(share * 100) + '%</span></div><div style="height:8px;background:var(--border2);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + Math.round(share * 100) + '%;background:' + (self ? "var(--high)" : "var(--accent)") + '"></div></div></div>';
  }
})();
