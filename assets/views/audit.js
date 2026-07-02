/* Audit trail — every analyst action, immutable log */
(function () {
  window.Views = window.Views || {};
  var ICON = {
    SESSION_START: "login", DECISION_CONFIRM: "circle-check", DECISION_DISMISS: "circle-x",
    DECISION_ESCALATE: "arrow-up-right", RECOVERY_SUBMITTED: "cash", INVESTIGATION_OPENED: "folder-plus",
    MEDICAL_RECORD_REQUESTED: "file-text", CLAIM_DATA_REQUESTED: "database", COPILOT_QUERY: "sparkles", EXPORT: "download"
  };
  window.Views.audit = {
    render: function (mount) {
      var log = window.APP.state.audit;
      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Audit trail</div><div class="page-sub">Every action is logged for compliance, investigations and oversight</div></div>' +
        '<span class="tag"><i class="ti ti-shield-lock"></i> ' + log.length + ' events · immutable</span></div>' +
        '<div class="card">' +
        (log.length ? log.map(function (e) {
          return '<div class="audit-row"><i class="ti ti-' + (ICON[e.action] || "point") + ' ic"></i>' +
            '<div style="flex:1"><div style="font-size:12.5px"><span style="font-weight:500">' + label(e.action) + '</span> — ' + window.APP.esc(e.detail) + '</div>' +
            '<div style="font-size:11px;color:var(--text3)">' + window.APP.esc(e.user) + '</div></div>' +
            '<div class="ts">' + window.APP.fmtTs(e.ts) + '</div></div>';
        }).join("") : '<div class="muted" style="font-size:12.5px">No actions yet.</div>') +
        '</div></div>';
    }
  };
  function label(a) { return a.replace(/_/g, " ").toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); }); }
})();
