/* EDI dashboard — the intake health of the claims pipeline: X12 transaction-set
   volumes, acknowledgment stats and rejection reasons, plus a workflow/architecture
   diagram of how a transaction moves from ingest to remediation. Read-only,
   deterministic (DP.getEdiDashboard). Un-attributed. */
(function () {
  window.Views = window.Views || {};

  function kpi(label, val, sub) {
    return '<div class="card" style="flex:1;min-width:150px;margin:0"><div style="font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">' + label + '</div>' +
      '<div style="font-weight:600;font-size:22px;margin-top:2px">' + val + '</div>' + (sub ? '<div style="font-size:11px;color:var(--text2);margin-top:1px">' + sub + '</div>' : '') + '</div>';
  }
  function num(n) { return n.toLocaleString(); }

  // 14-day inbound-claim volume sparkline
  function sparkline(data) {
    var w = 220, h = 40, max = Math.max.apply(null, data), min = Math.min.apply(null, data);
    var pts = data.map(function (v, i) { var x = (i / (data.length - 1)) * w; var y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3; return x.toFixed(1) + "," + y.toFixed(1); }).join(" ");
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" style="max-width:100%"><polyline points="' + pts + '" fill="none" stroke="var(--accent-d)" stroke-width="1.6"/></svg>';
  }

  // architecture / workflow diagram — ingest → validate → normalize → enrich →
  // analytics/models → case management → remediation. Static, un-attributed.
  function archDiagram() {
    var stages = [
      { t: "Ingest", s: "837P / I / D", i: "download" },
      { t: "Validate", s: "999 · TA1 · 277CA", i: "checkup" },
      { t: "Normalize", s: "X12 → canonical", i: "transform" },
      { t: "Enrich", s: "code libraries · external intel", i: "database-import" },
      { t: "Analytics", s: "rules · AI models", i: "cpu" },
      { t: "Case mgmt", s: "leads → cases → decision", i: "briefcase" },
      { t: "Remediate", s: "835 · pay/deny · letters", i: "mail-forward" }
    ];
    var n = stages.length, boxW = 150, boxH = 66, gap = 34, pad = 12;
    var totalW = n * boxW + (n - 1) * gap + pad * 2, h = 120;
    var x0 = pad, cy = 46;
    var parts = stages.map(function (st, i) {
      var x = x0 + i * (boxW + gap);
      var box = '<g>' +
        '<rect x="' + x + '" y="' + cy + '" width="' + boxW + '" height="' + boxH + '" rx="9" fill="#0f2033" />' +
        '<text x="' + (x + 12) + '" y="' + (cy + 26) + '" fill="#ffffff" font-size="13" font-weight="600" font-family="IBM Plex Sans,sans-serif">' + st.t + '</text>' +
        '<text x="' + (x + 12) + '" y="' + (cy + 46) + '" fill="#8fb7c9" font-size="10.5" font-family="IBM Plex Sans,sans-serif">' + st.s + '</text>' +
        '</g>';
      var arrow = i < n - 1 ? '<g><line x1="' + (x + boxW) + '" y1="' + (cy + boxH / 2) + '" x2="' + (x + boxW + gap) + '" y2="' + (cy + boxH / 2) + '" stroke="#17b3a6" stroke-width="2"/><polygon points="' + (x + boxW + gap) + ',' + (cy + boxH / 2) + ' ' + (x + boxW + gap - 7) + ',' + (cy + boxH / 2 - 4) + ' ' + (x + boxW + gap - 7) + ',' + (cy + boxH / 2 + 4) + '" fill="#17b3a6"/></g>' : "";
      return box + arrow;
    }).join("");
    // feedback loop: outcomes feed model retraining
    var loop = '<g><path d="M ' + (x0 + (n - 1) * (boxW + gap) + boxW / 2) + ' ' + (cy + boxH) + ' C ' + (x0 + (n - 1) * (boxW + gap) + boxW / 2) + ' ' + (cy + boxH + 34) + ', ' + (x0 + 4 * (boxW + gap) + boxW / 2) + ' ' + (cy + boxH + 34) + ', ' + (x0 + 4 * (boxW + gap) + boxW / 2) + ' ' + (cy + boxH + 6) + '" fill="none" stroke="#93a7bf" stroke-width="1.3" stroke-dasharray="4 3"/>' +
      '<polygon points="' + (x0 + 4 * (boxW + gap) + boxW / 2) + ',' + (cy + boxH + 6) + ' ' + (x0 + 4 * (boxW + gap) + boxW / 2 - 4) + ',' + (cy + boxH + 14) + ' ' + (x0 + 4 * (boxW + gap) + boxW / 2 + 4) + ',' + (cy + boxH + 14) + '" fill="#93a7bf"/>' +
      '<text x="' + (x0 + 4.5 * (boxW + gap)) + '" y="' + (cy + boxH + 30) + '" fill="#5f6b7a" font-size="10" font-family="IBM Plex Sans,sans-serif">decisions feed model retraining (HIL)</text></g>';
    return '<div style="overflow-x:auto"><svg viewBox="0 0 ' + totalW + ' ' + h + '" width="' + totalW + '" height="' + h + '" style="min-width:' + totalW + 'px">' +
      '<text x="' + x0 + '" y="20" fill="var(--text3)" font-size="10.5" font-family="IBM Plex Sans,sans-serif" style="text-transform:uppercase;letter-spacing:.04em">INGEST → VALIDATE → NORMALIZE → ENRICH → ANALYTICS → CASE MANAGEMENT → REMEDIATE</text>' +
      parts + loop + '</svg></div>';
  }

  window.Views.edi = {
    render: function (mount) {
      var d = window.DP.getEdiDashboard();
      var esc = window.APP.esc;

      var setRows = d.sets.map(function (s) {
        var dirIcon = s.direction === "inbound" ? "arrow-down-left" : s.direction === "outbound" ? "arrow-up-right" : "arrows-left-right";
        var barW = Math.round(s.acceptRate);
        var rejPill = s.rejected ? '<span class="tag" style="background:var(--high-bg);color:var(--high-tx)">' + num(s.rejected) + ' rej</span>' : '<span class="tag" style="background:var(--low-bg);color:var(--low-tx)">0 rej</span>';
        return '<tr><td class="mono" style="font-weight:600">' + s.code + '</td><td>' + esc(s.name) + '</td>' +
          '<td style="font-size:11px;color:var(--text2)"><i class="ti ti-' + dirIcon + '"></i> ' + s.direction + '</td>' +
          '<td class="right mono">' + num(s.volume) + '</td>' +
          '<td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;min-width:60px;height:6px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="width:' + barW + '%;height:100%;background:var(--accent-d)"></div></div><span class="mono" style="font-size:10.5px;min-width:38px">' + s.acceptRate + '%</span></div></td>' +
          '<td class="right">' + rejPill + '</td>' +
          '<td class="right mono" style="font-size:11px">' + (s.ackHrs ? s.ackHrs + "h" : "—") + '</td></tr>';
      }).join("");

      var rejHtml = d.rejReasons.map(function (r) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:0.5px solid var(--border2)">' +
          '<span class="mono" style="font-size:10.5px;color:var(--accent-d);min-width:104px">' + esc(r.code) + '</span>' +
          '<span style="flex:1;font-size:11.5px">' + esc(r.label) + '</span>' +
          '<div style="width:80px;height:6px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="width:' + r.pct + '%;height:100%;background:var(--med-tx)"></div></div>' +
          '<span class="mono" style="font-size:10.5px;min-width:30px;text-align:right">' + r.pct + '%</span></div>';
      }).join("");

      mount.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div style="font-weight:600;font-size:14px"><i class="ti ti-transfer" style="color:var(--accent-d)"></i> EDI transactions <span class="muted" style="font-weight:400;font-size:11.5px">· claims-pipeline intake health</span></div>' +
        '<span class="tag" style="background:var(--surface)">' + esc(d.standard) + '</span></div>' +
        '<div style="font-size:11px;color:var(--text2);margin-top:4px">' + esc(d.asOf) + ' · acknowledgments (999 / TA1 / 277CA) and status by X12 transaction set.</div></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        kpi("Transactions", num(d.totals.transactions), d.asOf) +
        kpi("Inbound claims", num(d.totals.inboundClaims), "837P / I / D") +
        kpi("Acceptance rate", d.totals.acceptRate + "%", "on first pass") +
        kpi("Rejected", num(d.totals.rejected), "returned for correction") +
        kpi("Avg ack time", d.totals.avgAckHrs + "h", d.totals.ta1Errors + " TA1 interchange errors") +
        '</div>' +
        '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px"><div style="font-weight:500;font-size:12.5px"><i class="ti ti-chart-line" style="color:var(--accent-d)"></i> Inbound claim volume <span class="muted" style="font-weight:400;font-size:10.5px">· trailing 14 days</span></div>' + sparkline(d.trend) + '</div></div>' +
        '<div class="card" style="padding:0;overflow:hidden"><div style="padding:10px 12px;font-weight:500;font-size:12.5px;border-bottom:0.5px solid var(--border2)"><i class="ti ti-list" style="color:var(--accent-d)"></i> Transaction sets</div>' +
        '<div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Set</th><th>Name</th><th>Dir</th><th class="right">Volume</th><th>Accept rate</th><th class="right">Rejected</th><th class="right">Ack</th></tr></thead><tbody>' + setRows + '</tbody></table></div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-alert-triangle" style="color:var(--med-tx)"></i> Top rejection reasons</div>' + rejHtml + '</div>' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-shield-check" style="color:var(--accent-d)"></i> Acknowledgment posture</div>' +
        '<div style="font-size:11.5px;color:var(--text2);line-height:1.7;padding-top:2px">Every inbound interchange returns a <b class="mono">TA1</b> (interchange) and <b class="mono">999</b> (functional) acknowledgment; claims additionally return a <b class="mono">277CA</b> claim-acknowledgment. Rejected transactions are returned for correction and never enter adjudication — so the analytics run on a clean, standards-validated claim stream.</div></div>' +
        '</div>' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:8px"><i class="ti ti-sitemap" style="color:var(--accent-d)"></i> Pipeline architecture <span class="muted" style="font-weight:400;font-size:10.5px">· how a transaction moves from ingest to remediation</span></div>' +
        archDiagram() +
        '<div style="font-size:10.5px;color:var(--text3);margin-top:8px"><i class="ti ti-info-circle"></i> Representative workflow. Standards-validated intake feeds enrichment (code libraries, external intelligence), the rules + AI models, and case management; adjudication outcomes remit via 835 and feed model retraining under human-in-the-loop governance.</div></div>' +
        '</div>';
    }
  };
})();
