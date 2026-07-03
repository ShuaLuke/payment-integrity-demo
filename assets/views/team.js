/* Team & assignments — supervisor roster, per-analyst caseload, unassigned pool, (re)assign */
(function () {
  window.Views = window.Views || {};
  var OPEN = ["New", "Assigned", "Under review", "Returned", "Pending review", "Recommended close"];
  var isOpen = function (a) { return OPEN.indexOf(a.status) >= 0; };

  window.Views.team = {
    render: function (mount) {
      var team = window.APP.ANALYSTS;
      var A = window.DP.raw.allegations;
      function forAnalyst(n) { return A.filter(function (a) { return a.assignee === n && isOpen(a); }); }
      var unassigned = A.filter(function (a) { return !a.assignee && isOpen(a); });
      var sel = window.APP.state.teamSel || team[0];

      function rosterRow(name, list, key) {
        var high = list.filter(function (a) { return a.riskScore >= 80; }).length;
        var exp = list.reduce(function (s, a) { return s + (a.exposurePost || 0); }, 0);
        var active = sel === key;
        return '<div class="tm-row" data-sel="' + key + '" style="display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;cursor:pointer;' + (active ? 'background:var(--accent-l);border:0.5px solid #bfe0d9' : 'border:0.5px solid transparent') + '">' +
          (key === "__unassigned__" ? '<div style="width:30px;height:30px;border-radius:50%;background:var(--surface);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text2)"><i class="ti ti-inbox"></i></div>' : '<div class="avatar" style="width:30px;height:30px;background:var(--ink);color:#fff">' + initials(name) + '</div>') +
          '<div style="flex:1"><div style="font-size:12.5px;font-weight:500">' + window.APP.esc(name) + '</div><div style="font-size:11px;color:var(--text2)">' + list.length + ' open · ' + high + ' high-risk</div></div>' +
          '<div style="text-align:right"><div style="font-size:12px;font-weight:500">' + window.DP.usdShort(exp) + '</div></div></div>';
      }

      var selName = sel === "__unassigned__" ? "Unassigned pool" : sel;
      var selList = (sel === "__unassigned__" ? unassigned : forAnalyst(sel)).sort(function (a, b) { return b.riskScore - a.riskScore; });
      var assignOpts = function (cur) { return '<option value="__unassigned__"' + (!cur ? " selected" : "") + '>Unassigned</option>' + team.map(function (n) { return '<option value="' + n + '"' + (cur === n ? " selected" : "") + '>' + n + '</option>'; }).join(""); };

      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Team &amp; assignments</div><div class="page-sub">Balance workload and assign flagged claims to analysts</div></div>' +
        '<span class="tag"><i class="ti ti-user-shield"></i> Supervisor · Karen Boyd</span></div>' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="width:280px;flex:none;display:flex;flex-direction:column;gap:6px">' +
        '<div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:2px">Analysts</div>' +
        team.map(function (n) { return rosterRow(n, forAnalyst(n), n); }).join("") +
        '<div class="l" style="font-size:10.5px;color:var(--text2);margin:8px 0 2px">Pool</div>' +
        rosterRow("Unassigned pool", unassigned, "__unassigned__") +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div class="card" style="padding:0;overflow:hidden"><div style="padding:11px 13px;display:flex;justify-content:space-between;align-items:center;border-bottom:0.5px solid var(--border2)"><div style="font-weight:500;font-size:13px">' + window.APP.esc(selName) + ' <span class="muted" style="font-weight:400;font-size:11px">· ' + selList.length + ' open</span></div></div>' +
        '<table><thead><tr><th>Risk</th><th>Flagged claim</th><th>Provider</th><th class="right">Exposure</th><th>Status</th><th>Assign to</th></tr></thead><tbody>' +
        (selList.length ? selList.map(function (a) {
          var p = window.DP.getProvider(a.providerId);
          return '<tr class="tm-case" data-id="' + a.id + '"><td>' + window.UI.riskChip(a.riskScore) + '</td>' +
            '<td><span class="mono" style="font-weight:500">#' + a.id + '</span> <span class="tag fwa">' + a.fwaType + '</span></td>' +
            '<td>' + window.APP.esc(p.name) + '</td><td class="right" style="font-weight:500">' + window.DP.usd(a.exposurePost || 0) + '</td>' +
            '<td>' + window.UI.statusPill(a.status) + '</td>' +
            '<td><select class="input tm-assign" data-id="' + a.id + '" style="width:auto;font-size:11.5px;padding:4px 6px" onclick="event.stopPropagation()">' + assignOpts(a.assignee) + '</select></td></tr>';
        }).join("") : '<tr><td colspan="6" class="muted" style="padding:16px;text-align:center">' + (sel === "__unassigned__" ? "No unassigned claims — everything's allocated." : "No open cases for this analyst.") + '</td></tr>') +
        '</tbody></table></div></div></div></div>';

      mount.querySelectorAll(".tm-row").forEach(function (r) { r.addEventListener("click", function () { window.APP.state.teamSel = r.getAttribute("data-sel"); window.Views.team.render(mount); }); });
      mount.querySelectorAll(".tm-case").forEach(function (r) { r.addEventListener("click", function () { window.APP.openAllegation(r.getAttribute("data-id")); }); });
      mount.querySelectorAll(".tm-assign").forEach(function (s) {
        s.addEventListener("change", function () {
          var v = this.value; window.APP.assignCase(this.getAttribute("data-id"), v === "__unassigned__" ? null : v);
          window.Views.team.render(mount);
        });
      });
    }
  };
  function initials(n) { return n.split(" ").map(function (x) { return x[0]; }).join("").slice(0, 2).toUpperCase(); }
})();
