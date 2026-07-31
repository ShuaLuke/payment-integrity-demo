/* Model registry — the AI/ML models behind PIVOT's analytics (Element 3.1). A
   governed catalog: type, version, status, the healthcare task, how it was
   trained, its feature DRIVER TABLE (each input + calculation methodology), the
   data period, and performance. Read-only, deterministic (DP.getModelRegistry). */
(function () {
  window.Views = window.Views || {};
  var selectedId = null;

  var STAT = {
    production: ["var(--low-bg)", "var(--low-tx)", "player-play", "Production"],
    training: ["var(--med-bg)", "var(--med-tx)", "loader", "Training"],
    candidate: ["var(--accent-l)", "var(--accent-d)", "flask", "Candidate"]
  };
  var TYPE_ICON = {
    "Anomaly Detection": "chart-dots", "Predictive (supervised)": "trending-up",
    "Clustering (unsupervised)": "affiliate", "Natural Language Processing": "message-language", "Ensemble": "stack-2"
  };
  function statPill(s) { var c = STAT[s] || ["var(--surface)", "var(--text2)", "point", s]; return '<span class="tag" style="background:' + c[0] + ';color:' + c[1] + '"><i class="ti ti-' + c[2] + '"></i> ' + c[3] + '</span>'; }
  function block(icon, title, sub, inner) {
    return '<div class="card" style="margin:0 0 8px;background:var(--surface)"><div style="font-weight:600;font-size:12px;margin-bottom:6px"><i class="ti ti-' + icon + '" style="color:var(--accent-d)"></i> ' + title + (sub ? ' <span class="muted" style="font-weight:400;font-size:10.5px">· ' + sub + '</span>' : '') + '</div>' + inner + '</div>';
  }

  window.Views.models = {
    render: function (mount) {
      var models = window.DP.getModelRegistry();
      var order = window.DP.MODEL_TYPE_ORDER;
      if (!selectedId || !models.some(function (m) { return m.id === selectedId; })) selectedId = models[0].id;
      var sel = models.filter(function (m) { return m.id === selectedId; })[0];

      var byStatus = { production: 0, training: 0, candidate: 0 };
      models.forEach(function (m) { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });
      var chips = [
        chip("robot", models.length + " models"),
        chip("player-play", byStatus.production + " in production"),
        chip("loader", byStatus.training + " training"),
        chip("flask", byStatus.candidate + " candidate")
      ].join("");

      // ---- left: models grouped by type ----
      var groups = order.filter(function (t) { return models.some(function (m) { return m.type === t; }); });
      var listHtml = groups.map(function (t) {
        var rows = models.filter(function (m) { return m.type === t; }).map(function (m) {
          var on = m.id === selectedId;
          return '<button class="mdl-row" data-id="' + m.id + '" style="width:100%;text-align:left;border:none;border-left:3px solid ' + (on ? "var(--accent)" : "transparent") + ';background:' + (on ? "var(--accent-l)" : "transparent") + ';padding:9px 12px;cursor:pointer;border-bottom:0.5px solid var(--border2)">' +
            '<div style="font-weight:' + (on ? "600" : "500") + ';font-size:12px">' + window.APP.esc(m.name) + '</div>' +
            '<div style="display:flex;gap:5px;align-items:center;margin-top:4px;flex-wrap:wrap">' + statPill(m.status) + '<span class="mono" style="font-size:10px;color:var(--text3)">' + window.APP.esc(m.version) + '</span>' + (m.prepayEnabled ? '<span class="tag" style="background:var(--surface);font-size:10px"><i class="ti ti-bolt"></i> prepay</span>' : '') + '</div>' +
            '</button>';
        }).join("");
        return '<div style="padding:8px 12px 4px;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;background:var(--surface);border-bottom:0.5px solid var(--border2)"><i class="ti ti-' + (TYPE_ICON[t] || "point") + '"></i> ' + window.APP.esc(t) + '</div>' + rows;
      }).join("");

      mount.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div style="font-weight:600;font-size:14px"><i class="ti ti-robot" style="color:var(--accent-d)"></i> Model registry <span class="muted" style="font-weight:400;font-size:11.5px">· the AI / ML models behind the analytics</span></div>' +
        '<span class="tag" style="background:var(--surface)"><i class="ti ti-shield-check"></i> Governed &amp; versioned</span></div>' +
        '<div style="font-size:11.5px;color:var(--text2);margin-top:6px">Every model is catalogued with its type, version, status, the healthcare task it performs, how it was trained, its feature driver table, the data period it learned from, and its measured performance — so the analytics stay explainable and auditable.</div>' +
        '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap">' + chips + '</div></div>' +
        '<div style="display:grid;grid-template-columns:300px 1fr;gap:10px;align-items:start">' +
        '<div class="card" style="padding:0;overflow:hidden">' + listHtml + '</div>' +
        '<div id="mdl-detail">' + detailHtml(sel) + '</div>' +
        '</div></div>';

      mount.querySelectorAll(".mdl-row").forEach(function (b) {
        b.addEventListener("click", function () { selectedId = b.getAttribute("data-id"); window.Views.models.render(mount); });
      });
    }
  };

  function chip(icon, label) { return '<span class="tag" style="background:var(--surface)"><i class="ti ti-' + icon + '"></i> ' + window.APP.esc(label) + '</span>'; }

  function detailHtml(m) {
    if (!m) return '<div class="card muted" style="font-size:12px">Select a model.</div>';
    var esc = window.APP.esc;

    // ---- properties
    var kv = function (k, v) { return '<div style="display:flex;gap:8px;padding:4px 0;font-size:11.5px;border-top:0.5px solid var(--border2)"><span style="color:var(--text2);min-width:120px;flex:none">' + k + '</span><span style="flex:1">' + v + '</span></div>'; };
    var propsInner = kv("Type", esc(m.type)) +
      kv("Version", '<span class="mono">' + esc(m.version) + '</span>') +
      kv("Status", statPill(m.status)) +
      kv("Training method", esc(m.trainingMethod)) +
      kv("Prepay-enabled", m.prepayEnabled ? '<span style="color:var(--accent-d)"><i class="ti ti-bolt"></i> Yes — runs before payment</span>' : '<span style="color:var(--text3)">No — post-pay / advisory</span>') +
      kv("Training data period", esc(m.dataPeriod)) +
      kv("Last trained", '<span class="mono">' + esc(m.lastTrained) + '</span>');

    // ---- feature driver table
    var fRows = (m.features || []).map(function (x) {
      return '<tr><td style="font-weight:500;white-space:nowrap">' + esc(x.name) + '</td><td style="color:var(--text2)">' + esc(x.methodology) + '</td></tr>';
    }).join("");
    var featInner = '<div style="overflow-x:auto"><table style="width:100%"><thead><tr><th style="width:32%">Feature</th><th>Calculation methodology</th></tr></thead><tbody>' + fRows + '</tbody></table></div>';

    // ---- performance
    var perf = m.performance || {};
    var pLabel = { auc: "AUC", precision: "Precision", recall: "Recall", flagRate: "Flag rate", topOneAccuracy: "Top-1 accuracy", silhouette: "Silhouette", clusters: "Clusters", coverage: "Coverage", agreement: "Agreement", faithfulness: "Faithfulness", groundedness: "Groundedness", humanRating: "Human rating" };
    var perfCards = Object.keys(perf).map(function (k) {
      return '<div style="flex:1;min-width:96px;background:#fff;border:0.5px solid var(--border);border-radius:7px;padding:8px 10px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">' + esc(pLabel[k] || k) + '</div><div style="font-weight:600;font-size:15px">' + esc(perf[k]) + '</div></div>';
    }).join("");
    var perfInner = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + perfCards + '</div>' +
      '<div style="font-size:10.5px;color:var(--text3);margin-top:8px"><i class="ti ti-info-circle"></i> Representative offline-evaluation metrics on held-out synthetic claims.</div>';

    // ---- versions
    var vRows = (m.versions || []).map(function (v) {
      return '<div style="display:flex;gap:8px;align-items:baseline;padding:5px 0;border-top:0.5px solid var(--border2)">' +
        '<span class="mono" style="font-size:10.5px;color:var(--text3);min-width:44px">' + esc(v.version) + '</span>' +
        '<span class="mono" style="font-size:10.5px;color:var(--text3);min-width:76px">' + esc(v.date) + '</span>' +
        '<span style="font-size:11px;flex:1;color:var(--text2)">' + esc(v.change) + '</span></div>';
    }).join("");
    var verInner = vRows || '<div style="font-size:11px;color:var(--text3)">No prior versions on file.</div>';

    return '<div style="display:flex;flex-direction:column">' +
      '<div class="card" style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;line-height:1.35"><i class="ti ti-' + (TYPE_ICON[m.type] || "point") + '" style="color:var(--accent-d)"></i> ' + esc(m.name) + '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap">' + statPill(m.status) + '<span class="mono" style="font-size:11px;color:var(--text2)">' + esc(m.version) + '</span><span class="tag" style="background:var(--surface)">' + esc(m.type) + '</span></div></div>' +
      '</div>' +
      '<div style="font-size:11.5px;color:var(--text);line-height:1.6;margin-top:8px"><b>Healthcare task:</b> ' + esc(m.healthcareTask) + '</div></div>' +
      block("adjustments", "Model properties", "type · training · versioning", propsInner) +
      block("table", "Feature driver table", "each input and the calculation behind it", featInner) +
      block("gauge", "Performance", "offline evaluation", perfInner) +
      block("history", "Version history", null, verInner) +
      '</div>';
  }
})();
