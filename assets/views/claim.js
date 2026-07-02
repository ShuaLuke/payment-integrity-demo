/* Claim detail + decision view */
(function () {
  window.Views = window.Views || {};

  function sharesTin(prov) {
    return window.DP.listProviders().filter(function (p) { return p.tin === prov.tin; }).length > 1;
  }

  window.Views.claim = {
    render: function (mount, params) {
      var id = params.id || window.APP.state.allegationId;
      var a = window.DP.getAllegation(id);
      if (!a) { mount.innerHTML = '<div class="page"><p>Allegation not found.</p></div>'; return; }
      var p = a.provider || {}, cl = a.claim, ve = a.veteran;
      var dec = window.APP.decisionFor(id);
      var ring = p.tin && sharesTin(p);

      var lines = cl ? cl.lines.map(function (l) {
        var flagged = (l.violatesRuleIds || []).length > 0;
        return '<tr' + (flagged ? ' class="flag-row"' : '') + '>' +
          '<td class="mono">' + l.cpt + '</td><td>' + window.APP.esc(l.description) + '</td>' +
          '<td>' + (l.modifiers.length ? '<span class="mono" style="background:var(--high-bg);color:var(--high-tx);padding:1px 5px;border-radius:4px">' + l.modifiers.join(",") + '</span>' : '—') + '</td>' +
          '<td class="right">' + l.units + '</td><td class="right">$' + l.billed + '</td><td class="right">$' + l.paid + '</td>' +
          '<td style="color:var(--high-tx);font-size:10.5px;white-space:nowrap">' + (flagged ? '<i class="ti ti-flag"></i> flagged' : '') + '</td></tr>';
      }).join("") : "";

      var factors = (a.xai && a.xai.factors || []).map(function (f) {
        return '<div class="fact"><div class="l">' + window.APP.esc(f.label) + '</div><div class="v">' + window.APP.esc(f.value) +
          (f.benchmark ? ' <span style="color:var(--high-tx)">vs ' + window.APP.esc(f.benchmark) + '</span>' : '') + '</div></div>';
      }).join("");

      var rulesHtml = (a.rules || []).map(function (r) {
        return '<div style="display:flex;gap:9px;align-items:flex-start"><i class="ti ti-gavel" style="color:var(--high);margin-top:2px"></i><div><div style="font-size:12px;font-weight:500">' + window.APP.esc(r.name) + ' <span class="mono" style="font-weight:400;color:var(--text2)">' + window.APP.esc(r.code) + '</span> <span class="tag">' + window.APP.esc(r.source) + '</span></div><div style="font-size:11.5px;color:var(--text2)">' + window.APP.esc(r.description) + '</div></div></div>';
      }).join("");
      if (a.model) rulesHtml += '<div style="display:flex;gap:9px;align-items:center;padding-top:2px"><i class="ti ti-brain" style="color:var(--accent-d)"></i><div style="font-size:11.5px;color:var(--text2)">Pattern model: <span style="color:var(--ink);font-weight:500">' + window.APP.esc(a.model.name) + '</span> (' + window.APP.esc(a.model.type) + ')</div></div>';
      if (!rulesHtml) rulesHtml = '<div style="font-size:11.5px;color:var(--text2)">No rules fired — behavioral pattern flagged by ' + (a.model ? window.APP.esc(a.model.name) : "the pattern engine") + '.</div>';

      // evidence documents (available to view, not gated behind a request)
      var docs = [{ key: "mr", label: "Medical record", icon: "file-text", meta: "on file" }];
      if (cl) { docs.push({ key: "claim", label: "Claim (" + cl.type + ")", icon: "file-invoice", meta: cl.claimNumber }); docs.push({ key: "ra", label: "Remittance (835)", icon: "receipt", meta: window.DP.usd(cl.paidAmount) }); }
      docs.push({ key: "auth", label: "Authorization / referral", icon: "clipboard-check", meta: "on file" });
      var docsHtml = docs.map(function (d) {
        return '<div class="doc-row" data-doc="' + d.key + '" style="display:flex;align-items:center;gap:7px;padding:6px 8px;border:0.5px solid var(--border);border-radius:6px;cursor:pointer;font-size:11.5px"><i class="ti ti-' + d.icon + '" style="color:var(--accent-d)"></i><span style="flex:1">' + d.label + '</span><span class="muted" style="font-size:10px">' + d.meta + '</span><i class="ti ti-chevron-right" style="color:var(--text3);font-size:14px"></i></div>';
      }).join("");

      // similar adjudicated cases (precedent)
      var sims = window.DP.getSimilarAdjudicated(a.fwaType, 3);
      var simConfirmed = sims.filter(function (s) { return s.outcome === "Confirmed"; }).length;
      var simsHtml = sims.length ? sims.map(function (s) {
        var conf = s.outcome === "Confirmed";
        return '<div class="prec-row" data-prec="' + s.id + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:0.5px solid var(--border2);cursor:pointer">' +
          '<span class="pill ' + (conf ? "p-conf" : "p-dis") + '">' + s.outcome + '</span>' +
          '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">' + window.APP.esc(s.provider) + ' <span class="muted" style="font-weight:400">· ' + window.APP.esc(s.specialty) + '</span></div><div style="font-size:11px;color:var(--text2)">' + window.APP.esc(s.note) + '</div></div>' +
          '<div style="text-align:right;white-space:nowrap"><div style="font-size:12px;font-weight:500">' + (conf ? window.DP.usd(s.recovered) + " recovered" : "—") + '</div><div class="mono" style="font-size:10px;color:var(--text3)">#' + s.id + ' · ' + s.adjudicatedDate + '</div></div></div>';
      }).join("") : '<div class="muted" style="font-size:11.5px;padding-top:6px">No prior adjudicated cases of this type.</div>';

      mount.innerHTML =
        '<div class="page">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
        '<span class="btn" id="c-back" style="padding:5px 9px"><i class="ti ti-arrow-left"></i> Work queue</span>' +
        '<span class="page-title">Allegation #' + id + '</span><span id="c-status">' + window.UI.statusPill(a.status) + '</span>' +
        '<span style="font-size:11px;color:var(--text2);display:inline-flex;align-items:center;gap:4px"><i class="ti ti-lock"></i> Locked to you</span></div>' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
        // left rail
        '<div style="width:200px;flex:none;display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:6px">Provider</div>' +
        '<div id="c-prov" style="font-weight:600;font-size:13px;color:var(--accent-d);cursor:pointer">' + window.APP.esc(p.name) + ' <i class="ti ti-external-link" style="font-size:11px"></i></div><div style="font-size:11px;color:var(--text2);margin-bottom:7px">' + window.APP.esc(p.taxonomyLabel || "") + ' · ' + (p.taxonomyCode || "") + '</div>' +
        '<div class="mono" style="font-size:11px;line-height:1.6">NPI ' + p.npi + '<br>TIN ' + (ring ? '<span style="background:var(--high-bg);color:var(--high-tx);padding:0 3px;border-radius:3px">' + p.tin + '</span>' : p.tin) + '</div>' +
        (ring ? '<div style="font-size:11px;color:var(--high);margin-top:5px;display:flex;align-items:center;gap:4px"><i class="ti ti-affiliate"></i>Shared TIN — provider ring</div>' : '') +
        '<div style="font-size:11px;color:var(--text2);margin-top:6px">' + window.APP.esc(p.city || "") + ', ' + (p.state || "") + ' · ' + (p.claimCount || 0) + ' claims · ' + (p.openAllegations || 0) + ' open</div>' +
        '<div style="font-size:11.5px;color:var(--accent-d);margin-top:7px;cursor:pointer;display:flex;align-items:center;gap:4px" id="c-net"><i class="ti ti-share-3"></i>View in network</div></div>' +
        (ve ? '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:6px">Veteran</div><div style="font-weight:500;font-size:12.5px">' + window.APP.esc(ve.name) + '</div><div class="mono" style="font-size:11px;color:var(--text2);line-height:1.6">DOB ' + ve.dob + ' · ' + ve.sex + '<br>' + ve.memberId + '</div></div>' : '') +
        '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:7px">Evidence on file</div>' +
        '<div id="c-docs" style="display:flex;flex-direction:column;gap:5px">' + docsHtml + '</div>' +
        '<div id="c-doc" style="margin-top:8px"></div>' +
        '<button class="btn" id="c-req" style="margin-top:8px;width:100%;font-size:11px"><i class="ti ti-plus"></i>Request additional records</button>' +
        '<div id="c-support" style="margin-top:6px"></div></div>' +
        '</div>' +
        // main
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px">' +
        '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">' +
        stat("Risk", '<span style="color:' + bandColor(a.riskScore) + '">' + a.riskScore + ' <span style="font-size:10px;font-weight:500">' + bandLabel(a.riskScore) + '</span></span>') +
        stat("Confidence", a.confidence + "%") + stat("Exposure", window.DP.usd(a.exposurePost)) +
        stat("Source", '<span style="font-size:12.5px">' + (a.source === "Both" ? "AI + Rule" : a.source === "Pattern Recognition" ? "AI" : "Rule") + '</span>') +
        stat("FWA type", '<span style="font-size:12.5px">' + a.fwaType + '</span>') +
        '</div>' +
        (a.xai ? '<div class="xai"><div class="xai-h"><i class="ti ti-sparkles" style="color:var(--accent-d)"></i><span class="t">Why this was flagged</span><span style="font-size:10.5px;color:#5f8a80;margin-left:auto">Explainable AI</span></div>' +
        '<div style="padding:11px 12px"><div style="font-size:12.5px;line-height:1.6;margin-bottom:' + (factors ? "9px" : "0") + '">' + window.APP.esc(a.xai.summary) + '</div>' +
        (factors ? '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:7px">' + factors + '</div>' : '') + '</div></div>' : '') +
        (cl ? '<div class="card" style="padding:0;overflow:hidden"><div style="padding:9px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--border2)"><span style="font-weight:500;font-size:13px">Claim <span class="mono" style="font-weight:400;color:var(--text2)">' + cl.claimNumber + '</span></span><span style="font-size:11px;color:var(--text2)">' + cl.type + ' · DOS ' + cl.dateOfService + ' · Dx ' + (cl.diagnosisCodes.join(",") || "—") + ' · ' + cl.claimStatus + ' / ' + cl.paymentType + '</span></div>' +
        '<table><thead><tr><th>CPT</th><th>Description</th><th>Mod</th><th class="right">Units</th><th class="right">Billed</th><th class="right">Paid</th><th></th></tr></thead><tbody>' + lines + '</tbody></table></div>' : '') +
        '<div class="card"><div style="font-weight:500;font-size:13px;margin-bottom:8px">Rule engine outcomes</div><div style="display:flex;flex-direction:column;gap:7px">' + rulesHtml + '</div></div>' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:500;font-size:13px">Similar adjudicated cases</div><span class="muted" style="font-size:11px">' + a.fwaType + ' · ' + simConfirmed + '/' + sims.length + ' confirmed</span></div>' + simsHtml + '<div id="c-prec"></div></div>' +
        '<div class="card"><div style="font-weight:500;font-size:13px;margin-bottom:8px">Case timeline</div>' + timelineHtml(id, a, cl) + '</div>' +
        '<div class="card" id="c-decision"></div>' +
        '</div></div></div>';

      document.getElementById("c-back").addEventListener("click", function () { window.APP.nav("queue"); });
      document.getElementById("c-net").addEventListener("click", function () { window.APP.nav("network"); });
      document.getElementById("c-prov").addEventListener("click", function () { window.APP.openProvider(p.id); });
      mount.querySelectorAll(".prec-row").forEach(function (row) {
        row.addEventListener("click", function () {
          var pr = window.DP.getPrecedent(row.getAttribute("data-prec"));
          if (!pr) return;
          document.getElementById("c-prec").innerHTML = precDetail(pr);
          window.APP.auditLog("PRECEDENT_VIEWED", "Adjudicated case #" + pr.id);
        });
      });
      mount.querySelectorAll(".doc-row").forEach(function (row) {
        row.addEventListener("click", function () {
          var key = row.getAttribute("data-doc");
          document.getElementById("c-doc").innerHTML = docContent(key, id, a, cl);
          window.APP.auditLog(key === "mr" ? "MEDICAL_RECORD_VIEWED" : "EVIDENCE_VIEWED", "Allegation #" + id + (key === "mr" ? "" : " · " + key));
        });
      });
      document.getElementById("c-req").addEventListener("click", function () {
        window.APP.auditLog("RECORDS_REQUESTED", "Allegation #" + id + " · additional records");
        document.getElementById("c-support").innerHTML = '<div style="background:var(--surface);border:0.5px solid var(--border);border-radius:7px;padding:7px 9px;font-size:11px;color:var(--text2)"><i class="ti ti-clock"></i> Additional records requested from provider.</div>';
      });

      renderDecision(id, a, dec);
    }
  };

  function renderDecision(id, a, dec) {
    var box = document.getElementById("c-decision");
    if (dec && dec.reviewState !== "returned") {
      var label = { confirm: "Confirm", dismiss: "Dismiss", escalate: "Escalate" }[dec.outcome];
      var icon, color, msg;
      if (dec.reviewState === "pending") {
        icon = "clock-hour-4"; color = "#3a5578"; msg = label + " submitted — pending supervisor review (Karen Boyd)";
      } else if (dec.reviewState === "approved") {
        if (dec.outcome === "confirm") { icon = "circle-check"; color = "var(--low)"; msg = "Confirmed · " + window.DP.usd(a.exposurePost) + " submitted for recovery · approved by Karen Boyd"; }
        else { icon = "arrow-up-right"; color = "var(--med)"; msg = "Escalated · Investigation created · approved by Karen Boyd"; }
      } else { icon = "circle-x"; color = "var(--text2)"; msg = "Dismissed · false positive logged for model retraining"; }
      var svPanel = "";
      if (dec.reviewState === "pending" && window.APP.isSupervisor()) {
        svPanel = '<div style="border-top:0.5px solid var(--border2);margin-top:10px;padding-top:10px">' +
          '<div style="font-weight:500;font-size:12.5px;margin-bottom:7px"><i class="ti ti-user-shield"></i> Supervisor review (Karen Boyd)</div>' +
          '<div style="display:flex;gap:8px;align-items:center"><input id="sv-note" class="input" placeholder="Return note (optional)…" style="flex:1">' +
          '<button class="btn" id="sv-ret"><i class="ti ti-corner-up-left"></i> Return</button>' +
          '<button class="btn primary" id="sv-appr" style="background:var(--low);border-color:var(--low)"><i class="ti ti-check"></i> Approve</button></div></div>';
      }
      box.innerHTML = '<div style="font-weight:500;font-size:13px;margin-bottom:9px">Decision</div><div style="display:flex;align-items:flex-start;gap:10px"><i class="ti ti-' + icon + '" style="color:' + color + ';font-size:22px"></i><div><div style="font-weight:500;font-size:13px">' + msg + '</div>' + (dec.rationale ? '<div style="font-size:11.5px;color:var(--text2);margin-top:4px">' + window.APP.esc(dec.rationale) + '</div>' : '') + '<div style="font-size:11px;color:var(--text3);margin-top:5px">Logged to audit trail · ' + window.APP.fmtTs(dec.ts) + '</div></div></div>' + svPanel;
      if (dec.reviewState === "pending" && window.APP.isSupervisor()) {
        document.getElementById("sv-appr").addEventListener("click", function () { window.APP.supervisorAction(id, "approve"); window.APP.openAllegation(id); });
        document.getElementById("sv-ret").addEventListener("click", function () { window.APP.supervisorAction(id, "return", document.getElementById("sv-note").value); window.APP.openAllegation(id); });
      }
      return;
    }
    // no final decision yet → analyst records one; supervisor can't act as analyst
    if (window.APP.isSupervisor()) {
      box.innerHTML = '<div style="font-weight:500;font-size:13px;margin-bottom:9px">Decision</div><div class="muted" style="font-size:12px"><i class="ti ti-user-shield"></i> Awaiting analyst decision. Switch to the Analyst role to record a decision.</div>';
      return;
    }
    var returnedNote = (dec && dec.reviewState === "returned") ? (dec.returnNote || "(no note)") : null;
    box.innerHTML =
      '<div style="font-weight:500;font-size:13px;margin-bottom:9px">Decision</div>' +
      (returnedNote !== null ? '<div style="background:var(--med-bg);border:0.5px solid #e7c99a;border-radius:7px;padding:8px 10px;font-size:11.5px;color:var(--med-tx);margin-bottom:10px"><i class="ti ti-corner-up-left"></i> Returned by supervisor (Karen Boyd): ' + window.APP.esc(returnedNote) + ' — please revise and resubmit.</div>' : '') +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<div class="seg" data-d="c"><i class="ti ti-check"></i> Confirm<div class="sub">recommend recovery</div></div>' +
      '<div class="seg" data-d="d"><i class="ti ti-x"></i> Dismiss<div class="sub">false positive</div></div>' +
      '<div class="seg" data-d="e"><i class="ti ti-arrow-up-right"></i> Escalate<div class="sub">to investigation</div></div></div>' +
      '<div id="c-hint" style="font-size:11.5px;color:var(--text2);margin-bottom:8px;min-height:16px"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><span style="font-size:11px;color:var(--text2)">Rationale (logged for audit &amp; model retraining)</span><button id="c-draft" class="btn" style="padding:4px 9px;font-size:11px"><i class="ti ti-sparkles"></i>Draft with AI</button></div>' +
      '<textarea id="c-rat" class="input" placeholder="Document your rationale…"></textarea>' +
      '<button id="c-submit" class="btn primary" style="margin-top:9px" disabled><i class="ti ti-send"></i>Submit decision</button>';

    var choice = null;
    var outMap = { c: "confirm", d: "dismiss", e: "escalate" };
    var hints = { c: "Confirms improper payment — " + window.DP.usd(a.exposurePost) + " moves to Submitted for recovery.", d: "Logged as a false positive — outcome feeds model retraining.", e: "Creates an Investigation for further review." };
    box.querySelectorAll(".seg").forEach(function (s) {
      s.addEventListener("click", function () {
        choice = s.getAttribute("data-d");
        box.querySelectorAll(".seg").forEach(function (x) { x.className = "seg"; });
        s.className = "seg on-" + choice;
        document.getElementById("c-hint").textContent = hints[choice];
        document.getElementById("c-submit").disabled = false;
      });
    });
    document.getElementById("c-draft").addEventListener("click", function () {
      if (!choice) { document.getElementById("c-hint").textContent = "Pick a decision first, then draft."; return; }
      // stream into the textarea's .value for the "live" feel
      var ta = document.getElementById("c-rat");
      var t = window.AI.draftRationale(a, outMap[choice]), i = 0;
      ta.value = "";
      var iv = setInterval(function () { i += 3; ta.value = t.slice(0, i); if (i >= t.length) { clearInterval(iv); ta.value = t; } }, 12);
    });
    document.getElementById("c-submit").addEventListener("click", function () {
      if (!choice) return;
      var rationale = document.getElementById("c-rat").value;
      window.APP.applyDecision(id, outMap[choice], rationale);
      document.getElementById("c-status").innerHTML = window.UI.statusPill(window.DP.raw.allegations.find(function (x) { return x.id === id; }).status);
      renderDecision(id, window.DP.getAllegation(id), window.APP.decisionFor(id));
    });
  }

  function stat(l, v) { return '<div class="card" style="padding:8px 9px"><div class="l" style="font-size:10.5px;color:var(--text2)">' + l + '</div><div style="font-size:16px;font-weight:600;margin-top:2px">' + v + '</div></div>'; }
  function bandColor(r) { return r >= 80 ? "var(--high-tx)" : r >= 50 ? "var(--med-tx)" : "var(--low-tx)"; }
  function bandLabel(r) { return r >= 80 ? "High" : r >= 50 ? "Medium" : "Low"; }

  function precDetail(pr) {
    var conf = pr.outcome === "Confirmed";
    return '<div style="background:var(--surface);border:0.5px solid var(--border);border-radius:7px;padding:10px 12px;margin-top:8px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span class="pill ' + (conf ? "p-conf" : "p-dis") + '">' + pr.outcome + '</span><span style="font-weight:500;font-size:12.5px">' + window.APP.esc(pr.provider) + '</span><span class="mono" style="font-size:10.5px;color:var(--text3)">#' + pr.id + '</span></div>' +
      '<div style="font-size:11.5px;color:var(--text2);line-height:1.55">' + window.APP.esc(pr.note) + '</div>' +
      '<div style="display:flex;gap:16px;font-size:11px;color:var(--text2);margin-top:7px"><span>Specialty: <span style="color:var(--ink)">' + window.APP.esc(pr.specialty) + '</span></span><span>Exposure: <span style="color:var(--ink)">' + window.DP.usd(pr.exposure) + '</span></span>' + (conf ? '<span>Recovered: <span style="color:var(--low-tx);font-weight:500">' + window.DP.usd(pr.recovered) + '</span></span>' : '') + '</div>' +
      '<div class="mono" style="font-size:10.5px;color:var(--text3);margin-top:5px">Adjudicated ' + pr.adjudicatedDate + ' · ' + window.APP.esc(pr.analyst) + '</div></div>';
  }

  function timelineHtml(id, a, cl) {
    var ev = [];
    if (cl) ev.push({ d: cl.dateOfService, t: "Claim submitted", s: cl.claimNumber + " · " + cl.type + " · paid " + window.DP.usd(cl.paidAmount), ic: "file-invoice", c: "var(--text2)" });
    ev.push({ d: a.createdDate, t: "Flagged — " + a.fwaType, s: "by " + (a.model ? a.model.name : a.source) + " · risk " + a.riskScore + " · confidence " + a.confidence + "%", ic: "flag", c: "var(--high)" });
    if (a.assignee) ev.push({ d: a.createdDate, t: "Assigned", s: "to " + a.assignee, ic: "user", c: "var(--text2)" });
    window.APP.state.audit.slice().reverse().forEach(function (e) {
      if (e.detail.indexOf("#" + id) >= 0 && e.action.indexOf("SESSION") < 0) ev.push({ d: window.APP.fmtTs(e.ts), t: labelize(e.action), s: e.detail.replace("Allegation #" + id, "").replace(/^ · /, ""), ic: iconFor(e.action), c: "var(--accent-d)" });
    });
    ev.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    return '<div style="position:relative;padding-left:6px">' + ev.map(function (e, i) {
      return '<div style="display:flex;gap:10px;align-items:flex-start;padding-bottom:' + (i === ev.length - 1 ? "0" : "10px") + '">' +
        '<div style="display:flex;flex-direction:column;align-items:center"><i class="ti ti-' + e.ic + '" style="color:' + e.c + ';font-size:15px"></i>' + (i === ev.length - 1 ? "" : '<div style="width:1px;flex:1;background:var(--border);min-height:14px;margin-top:2px"></div>') + '</div>' +
        '<div style="flex:1"><div style="font-size:12px;font-weight:500">' + window.APP.esc(e.t) + '</div><div style="font-size:11px;color:var(--text2)">' + window.APP.esc(e.s) + '</div></div>' +
        '<div class="mono" style="font-size:10px;color:var(--text3);white-space:nowrap">' + e.d + '</div></div>';
    }).join("") + '</div>';
  }
  function labelize(a) { return a.replace(/_/g, " ").toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); }); }
  function iconFor(a) {
    if (a.indexOf("CONFIRM") >= 0 || a.indexOf("APPROVED") >= 0) return "circle-check";
    if (a.indexOf("DISMISS") >= 0) return "circle-x";
    if (a.indexOf("ESCALATE") >= 0 || a.indexOf("INVESTIGATION") >= 0) return "arrow-up-right";
    if (a.indexOf("RETURN") >= 0) return "corner-up-left";
    if (a.indexOf("RECOVERY") >= 0) return "cash";
    if (a.indexOf("REVIEW") >= 0) return "clock-hour-4";
    if (a.indexOf("RECORD") >= 0 || a.indexOf("EVIDENCE") >= 0) return "file-text";
    return "point";
  }

  // synthetic document viewer content
  function docBox(title, body, tone) {
    var bg = tone === "good" ? "var(--low-bg)" : "var(--surface)", bd = tone === "good" ? "#bfe0c9" : "var(--border)", tx = tone === "good" ? "var(--low-tx)" : "var(--text2)";
    return '<div style="background:' + bg + ';border:0.5px solid ' + bd + ';border-radius:7px;padding:9px 11px"><div style="font-weight:500;font-size:11.5px;color:' + tx + ';margin-bottom:4px"><i class="ti ti-file-description"></i> ' + title + '</div><div style="font-size:11px;color:var(--text2);line-height:1.55">' + body + '</div></div>';
  }
  function docContent(key, id, a, cl) {
    if (key === "mr") {
      if (id === "20463") return docBox("Nephrology progress note", "Dx <span class='mono'>N18.6</span> end-stage renal disease. Standing order: in-center hemodialysis 3×/week (Mon/Wed/Fri). Vascular access: AV fistula, functioning. The billed <span class='mono'>90935</span> frequency is consistent with the documented dialysis regimen.", "good");
      if (a.fwaType === "Upcoding") return docBox("Clinical note", "Established-patient visit for a stable chronic condition. History and exam are focused; medical decision-making is straightforward. Documentation does <b>not</b> support the high-complexity level (<span class='mono'>99215</span>) billed.");
      return docBox("Clinical note", "Encounter documentation on file for the billed date of service. Content is being reviewed against the billed codes.");
    }
    if (key === "claim" && cl) return docBox("Claim " + cl.claimNumber, cl.type + " · DOS " + cl.dateOfService + " · Dx " + (cl.diagnosisCodes.join(",") || "—") + ". Line items: " + cl.lines.map(function (l) { return l.cpt + (l.modifiers.length ? "-" + l.modifiers.join(",") : "") + " ($" + l.paid + ")"; }).join(", ") + ". Billed " + window.DP.usd(cl.billedAmount) + " · paid " + window.DP.usd(cl.paidAmount) + ".");
    if (key === "ra" && cl) return docBox("Remittance advice (835)", "Payment of " + window.DP.usd(cl.paidAmount) + " on " + cl.dateOfService + ". Status: paid in full, no prior adjustments. This is a post-payment review — funds have already been disbursed.");
    if (key === "auth") return docBox("Authorization / referral", "Community Care referral on file for the billed service, valid through 2025. Authorized scope is being validated against the billed procedure(s).");
    return docBox("Document", "No preview available.");
  }
})();
