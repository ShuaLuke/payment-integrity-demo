/* Customer Care — 360° member view (Element 1.1.iv). Profile, PACT, line of
   business, claims and prior authorizations for a beneficiary. Read-only,
   deterministic (DP.getMember360). Un-attributed. */
(function () {
  window.Views = window.Views || {};
  window.Views.member = {
    render: function (mount, params) {
      var vid = (params && params.id) || (window.APP.state && window.APP.state.memberId) || "V0001";
      window.APP.state.memberId = vid;
      var d = window.DP.getMember360(vid); if (!d) { mount.innerHTML = '<div class="page"><p>Member not found.</p></div>'; return; }
      var esc = window.APP.esc, m = window.DP.usd, p = d.profile;
      var kv = function (k, v) { return '<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:11.5px;border-top:0.5px solid var(--border2)"><span style="color:var(--text2)">' + k + '</span><span style="text-align:right">' + esc(v) + '</span></div>'; };
      var claims = d.claims.length ? d.claims.map(function (c) {
        return '<tr class="mbr-claim" data-id="' + c.id + '" style="cursor:pointer"><td class="mono" style="font-size:10.5px">' + esc(c.number) + '</td><td>' + esc(c.type) + '</td><td class="mono" style="font-size:10.5px">' + esc(c.dos) + '</td><td>' + esc(c.status) + '</td><td class="right">' + m(c.paid) + '</td></tr>';
      }).join("") : '<tr><td colspan="5" class="muted" style="font-size:11.5px;padding:8px">No claims on file for this member.</td></tr>';
      var auths = d.priorAuths.map(function (a) { return '<tr><td class="mono" style="font-size:10.5px">' + esc(a.id) + '</td><td>' + esc(a.service) + '</td><td><span class="tag" style="background:var(--low-bg);color:var(--low-tx)">' + esc(a.status) + '</span></td><td class="mono" style="font-size:10.5px;color:var(--text2)">' + esc(a.valid) + '</td></tr>'; }).join("");
      mount.innerHTML =
        '<div class="page"><div style="display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div class="avatar" style="width:42px;height:42px;font-size:15px;background:var(--accent)">' + esc((p.name || "?").split(" ").map(function (x) { return x[0]; }).slice(0, 2).join("")) + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:16px">' + esc(p.name) + '</div><div style="font-size:11.5px;color:var(--text2)">Member ' + esc(p.memberId) + ' · ' + esc(p.sex) + ' · DOB ' + esc(p.dob) + ' · ' + esc(p.city) + ', ' + esc(p.state) + '</div></div>' +
        '<span class="tag" style="background:var(--surface)"><i class="ti ti-user-heart"></i> 360° member view</span></div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-id" style="color:var(--accent-d)"></i> Profile</div>' +
        kv("Enrollment", p.enrollment) + kv("Line of business", d.lineOfBusiness) + kv("Home", p.city + ", " + p.state) + '</div>' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-users" style="color:var(--accent-d)"></i> Patient Aligned Care Team (PACT)</div>' +
        kv("Care team", d.pact.team) + kv("Primary care provider", d.pact.pcp) + kv("Care management", d.pact.rn) + '</div>' +
        '</div>' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-file-invoice" style="color:var(--accent-d)"></i> Claims <span class="muted" style="font-weight:400;font-size:11px">· click to open the claim record</span></div>' +
        '<div style="overflow-x:auto"><table style="width:100%;font-size:11.5px"><thead><tr><th>Claim</th><th>Type</th><th>DOS</th><th>Status</th><th class="right">Paid</th></tr></thead><tbody>' + claims + '</tbody></table></div></div>' +
        '<div class="card"><div style="font-weight:500;font-size:12.5px;margin-bottom:4px"><i class="ti ti-clipboard-check" style="color:var(--accent-d)"></i> Prior authorizations</div>' +
        '<div style="overflow-x:auto"><table style="width:100%;font-size:11.5px"><thead><tr><th>Auth</th><th>Service</th><th>Status</th><th>Valid</th></tr></thead><tbody>' + auths + '</tbody></table></div></div>' +
        '<div style="font-size:10.5px;color:var(--text3)"><i class="ti ti-info-circle"></i> Synthetic member for the demo. The claim header links the member and provider to diagnoses, status, cost-share and payment on the Claim record.</div>' +
        '</div></div>';
      mount.querySelectorAll(".mbr-claim").forEach(function (row) {
        row.addEventListener("click", function () {
          var cid = row.getAttribute("data-id");
          var a = (window.DP.raw.allegations || []).filter(function (x) { return x.claimId === cid; })[0];
          if (a) window.APP.openAllegation(a.id); else window.EXPORT.toast("No lead is associated with this claim.");
        });
      });
    }
  };
})();
