/* Pricing methodologies — the CMS pricing methodologies the platform supports and
   how the right one is selected for a claim (Element 2.1.i). Read-only, deterministic
   (DP.getPricingMethodologies). Un-attributed. */
(function () {
  window.Views = window.Views || {};

  window.Views.methodologies = {
    render: function (mount) {
      var d = window.DP.getPricingMethodologies();
      var esc = window.APP.esc;
      var rows = d.methodologies.map(function (mm) {
        return '<tr><td style="font-weight:600">' + esc(mm.name) + '</td>' +
          '<td class="mono" style="font-size:10.5px">' + esc(mm.claimType) + '</td>' +
          '<td style="font-size:11px;color:var(--text2)">' + esc(mm.basis) + '</td>' +
          '<td style="font-size:11px">' + esc(mm.note) + '</td>' +
          '<td><span class="tag" style="background:var(--low-bg);color:var(--low-tx)"><i class="ti ti-player-play"></i> ' + esc(mm.status) + '</span></td></tr>';
      }).join("");
      var factors = d.selectionFactors.map(function (f) { return '<div style="display:flex;gap:7px;padding:5px 0;border-top:0.5px solid var(--border2);font-size:11.5px"><i class="ti ti-arrow-right" style="color:var(--accent-d);margin-top:2px"></i><span>' + esc(f) + '</span></div>'; }).join("");
      mount.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div style="font-weight:600;font-size:14px"><i class="ti ti-calculator" style="color:var(--accent-d)"></i> Pricing methodologies <span class="muted" style="font-weight:400;font-size:11.5px">· CMS pricing across inpatient, outpatient, professional, drug &amp; DME</span></div>' +
        '<span class="tag" style="background:var(--surface)">' + d.methodologies.length + ' methodologies</span></div>' +
        '<div style="font-size:11.5px;color:var(--text2);margin-top:6px">Our solution supports CMS methodologies across the claim spectrum. Each claim is priced by the methodology selected from its own attributes — no manual routing.</div></div>' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-route" style="color:var(--accent-d)"></i> How the methodology is selected</div>' + factors + '</div>' +
        '<div class="card" style="padding:0;overflow:hidden"><div style="padding:10px 12px;font-weight:500;font-size:12.5px;border-bottom:0.5px solid var(--border2)"><i class="ti ti-list" style="color:var(--accent-d)"></i> Supported methodologies</div>' +
        '<div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Methodology</th><th>Claim type</th><th>Pricing basis</th><th>Applies to</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
        '<div style="font-size:10.5px;color:var(--text3)"><i class="ti ti-info-circle"></i> Representative methodology set. The claim-level calculation (RVU/GPCI, DRG grouper, APC status indicators, per-diem) is shown on each claim\'s Pricing → Calculation view.</div>' +
        '</div>';
    }
  };
})();
