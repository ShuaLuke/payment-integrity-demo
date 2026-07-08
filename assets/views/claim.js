/* Claim detail + decision view — restructured into tabs:
   Overview · Evidence · Analysis · Network · Decision. Decision is mode-aware
   (retrospective: Confirm/Dismiss/Escalate · prepay: Pay/Hold/Deny). */
(function () {
  window.Views = window.Views || {};
  var curTab = "overview", lastId = null, ctx = null;

  function sharesTin(prov) {
    return window.DP.listProviders().filter(function (p) { return p.tin === prov.tin; }).length > 1;
  }

  window.Views.claim = {
    render: function (mount, params) {
      var id = params.id || window.APP.state.allegationId;
      var a = window.DP.getAllegation(id);
      if (!a) { mount.innerHTML = '<div class="page"><p>Lead not found.</p></div>'; return; }
      var p = a.provider || {}, cl = a.claim, ve = a.veteran;
      var prepay = (a.mode === "prepay");
      var dec = prepay ? window.APP.prepayDecisionFor(id) : window.APP.decisionFor(id);
      var ring = p.tin && sharesTin(p);
      if (id !== lastId) { curTab = "overview"; lastId = id; }
      ctx = { id: id, a: a, cl: cl, p: p, prepay: prepay };

      // evidence documents (shared by the left-rail index and the Evidence tab)
      var docsHtml = evidenceDocs(a, cl).map(function (d) { return docRowHtml(d, "doc-row"); }).join("");

      var kind = prepay ? "Pending claim" : "Lead";
      var undecided = !dec;
      // Descriptive header: "Lead #20481 · Alamo Internal Medicine — Upcoding"
      var headText = kind + " #" + id + (p.name ? " · " + p.name : "") + (a.fwaType ? " — " + a.fwaType : "");

      mount.innerHTML =
        '<div class="page">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
        '<span class="btn" id="c-back" style="padding:5px 9px"><i class="ti ti-arrow-left"></i> ' + window.APP.esc(window.APP.backLabel()) + '</span>' +
        '<span class="page-title">' + window.APP.esc(headText) + '</span><span id="c-status">' + window.UI.statusPill(a.status) + '</span>' +
        '<span style="font-size:11px;color:var(--text2);display:inline-flex;align-items:center;gap:4px"><i class="ti ti-lock"></i> Locked to you</span>' +
        '<span style="flex:1"></span>' + window.EXPORT.group("c") + '<button class="btn primary" id="c-summarize" style="font-size:12px"><i class="ti ti-file-analytics"></i> Summarize for adjudication</button></div>' +
        '<div class="split" style="display:flex;gap:12px;align-items:flex-start">' +
        // ---- left rail (identity + evidence) ----
        '<div class="rail" style="width:200px;flex:none;display:flex;flex-direction:column;gap:10px">' +
        '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:6px">Provider</div>' +
        '<div id="c-prov" style="font-weight:600;font-size:13px;color:var(--accent-d);cursor:pointer">' + window.APP.esc(p.name) + ' <i class="ti ti-external-link" style="font-size:11px"></i></div><div style="font-size:11px;color:var(--text2);margin-bottom:7px">' + window.APP.esc(p.taxonomyLabel || "") + ' · ' + (p.taxonomyCode || "") + '</div>' +
        '<div class="mono" style="font-size:11px;line-height:1.6">NPI ' + p.npi + '<br>TIN ' + (ring ? '<span style="background:var(--high-bg);color:var(--high-tx);padding:0 3px;border-radius:3px">' + p.tin + '</span>' : p.tin) + '</div>' +
        (ring ? '<div style="font-size:11px;color:var(--high);margin-top:5px;display:flex;align-items:center;gap:4px"><i class="ti ti-affiliate"></i>Shared TIN — provider ring</div>' : '') +
        '<div style="font-size:11px;color:var(--text2);margin-top:6px">' + window.APP.esc(p.city || "") + ', ' + (p.state || "") + ' · ' + (p.claimCount || 0) + ' claims · ' + (p.openAllegations || 0) + ' open</div>' +
        '<div style="font-size:11.5px;color:var(--accent-d);margin-top:7px;cursor:pointer;display:flex;align-items:center;gap:4px" id="c-net"><i class="ti ti-share-3"></i>View in network</div></div>' +
        (window.APP.isSupervisor() ? '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:6px">Assignment</div><div style="font-size:11.5px;color:var(--text2);margin-bottom:6px">Currently: <span style="color:var(--ink);font-weight:500">' + (a.assignee || "Unassigned") + '</span></div><select id="c-assign" class="input" style="font-size:12px">' + assignOptions(a.assignee) + '</select></div>' : '') +
        (ve ? '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:6px">Veteran</div><div style="font-weight:500;font-size:12.5px">' + window.APP.esc(ve.name) + '</div><div class="mono" style="font-size:11px;color:var(--text2);line-height:1.6">DOB ' + ve.dob + ' · ' + ve.sex + '<br>' + ve.memberId + '</div></div>' : '') +
        '<div class="card"><div class="l" style="font-size:10.5px;color:var(--text2);margin-bottom:7px">Evidence on file</div>' +
        '<div id="c-docs" style="display:flex;flex-direction:column;gap:5px">' + docsHtml + '</div>' +
        '<div id="c-doc" style="margin-top:8px"></div>' +
        '<button class="btn" id="c-req" style="margin-top:8px;width:100%;font-size:11px"><i class="ti ti-plus"></i>Request additional records</button>' +
        '<div id="c-support" style="margin-top:6px"></div></div>' +
        '</div>' +
        // ---- main column: tabs ----
        '<div style="flex:1;min-width:0">' +
        tabBar(curTab, undecided) +
        '<div id="c-tabpanel"></div>' +
        notesCardHtml(id) +
        '</div>' +
        '</div></div>';

      document.getElementById("c-back").addEventListener("click", function () { window.APP.goBack(); });
      document.getElementById("c-net").addEventListener("click", function () { window.APP.nav("network"); });
      var asg = document.getElementById("c-assign");
      if (asg) asg.addEventListener("change", function () { window.APP.assignCase(id, this.value === "__unassigned__" ? null : this.value); rerender(id); });
      document.getElementById("c-prov").addEventListener("click", function () { window.APP.openProvider(p.id); });
      mount.querySelectorAll(".doc-row").forEach(function (row) {
        row.addEventListener("click", function () {
          var key = row.getAttribute("data-doc");
          document.getElementById("c-doc").innerHTML = docContent(key, id, a, cl);
          window.APP.auditLog(key === "mr" ? "MEDICAL_RECORD_VIEWED" : "EVIDENCE_VIEWED", kind + " #" + id + (key === "mr" ? "" : " · " + key));
        });
      });
      document.getElementById("c-req").addEventListener("click", function () {
        var saved = (window.APP.state.recordsRequestText || {})[id];
        var def = saved || defaultRecordsRequest(a);
        document.getElementById("c-support").innerHTML =
          '<div style="background:var(--surface);border:0.5px solid var(--border);border-radius:7px;padding:8px 9px">' +
          '<div style="font-size:10.5px;color:var(--text2);margin-bottom:4px">Records to request <span style="color:var(--text3)">(editable per case)</span></div>' +
          '<textarea id="c-req-text" class="input" style="min-height:54px;font-size:11.5px">' + window.APP.esc(def) + '</textarea>' +
          '<button class="btn primary" id="c-req-send" style="margin-top:6px;width:100%;font-size:11px"><i class="ti ti-send"></i> Send request to provider</button></div>';
        document.getElementById("c-req-send").addEventListener("click", function () {
          var txt = document.getElementById("c-req-text").value.trim() || def;
          (window.APP.state.recordsRequestText = window.APP.state.recordsRequestText || {})[id] = txt;
          window.APP.auditLog("RECORDS_REQUESTED", kind + " #" + id + " · " + txt);
          document.getElementById("c-support").innerHTML = '<div style="background:var(--surface);border:0.5px solid var(--border);border-radius:7px;padding:7px 9px;font-size:11px;color:var(--text2)"><i class="ti ti-clock"></i> Requested from provider: <span style="color:var(--ink)">' + window.APP.esc(txt) + '</span></div>';
        });
      });
      var sumBtn = document.getElementById("c-summarize");
      if (sumBtn) sumBtn.addEventListener("click", function () { if (window.COPILOT) window.COPILOT.summarize(id); });
      wireExport(id, a, cl, p, prepay, kind);
      mount.querySelectorAll(".ctab").forEach(function (b) { b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); }); });

      showTab(curTab);
      wireNotes(id);
      renderStickyBar(id, a, dec, prepay);
    },

    // called by the copilot's adjudication brief to jump straight to the decision
    gotoDecision: function (action) {
      showTab("decision");
      setTimeout(function () {
        if (action === "request-records") { var rq = document.getElementById("c-req"); if (rq) { rq.scrollIntoView({ behavior: "smooth", block: "center" }); rq.click(); } return; }
        // accept both action names (from the AI brief) and raw seg codes (from the sticky bar)
        var map = { confirm: "c", "confirm-escalate": "c", dismiss: "d", escalate: "e", pay: "pay", hold: "hold", deny: "deny", c: "c", d: "d", e: "e" };
        var seg = document.querySelector('.seg[data-d="' + (map[action] || action) + '"]');
        if (seg) seg.click();
        var dc = document.getElementById("c-decision"); if (dc) dc.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 70);
    }
  };

  // ---------- tabs ----------
  function tabBar(active, undecided) {
    var tabs = [["overview", "Overview"], ["evidence", "Evidence"], ["analysis", "Analysis"], ["network", "Network"], ["decision", "Decision"]];
    return '<div style="display:flex;gap:2px;border-bottom:0.5px solid var(--border);margin-bottom:10px">' +
      tabs.map(function (t) { return '<button class="ctab' + (t[0] === active ? " active" : "") + '" data-tab="' + t[0] + '">' + t[1] + (t[0] === "decision" && undecided ? ' <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);vertical-align:middle;margin-left:2px"></span>' : "") + '</button>'; }).join("") +
      '</div>';
  }

  // ---------- case notes / annotations (audit-logged "color commentary") ----------
  function notesCardHtml(id) {
    var notes = window.APP.getComments(id);
    return '<div class="card" id="c-notes" style="margin-top:12px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:10px;flex-wrap:wrap">' +
      '<div style="font-weight:500;font-size:13px"><i class="ti ti-messages" style="color:var(--accent-d)"></i> Case notes &amp; annotations <span class="muted" style="font-weight:400;font-size:11px">· running commentary on this lead — every note is logged to the audit trail</span></div>' +
      '<span class="muted" style="font-size:11px" id="c-notes-count">' + notes.length + ' note' + (notes.length === 1 ? '' : 's') + '</span></div>' +
      '<div id="c-notes-list">' + notesListHtml(notes) + '</div>' +
      '<div style="display:flex;gap:8px;align-items:flex-start;margin-top:10px">' +
      '<textarea id="c-note-input" class="input" placeholder="Add a note or annotation… (⌘/Ctrl+Enter)" style="flex:1;min-height:40px"></textarea>' +
      '<button class="btn primary" id="c-note-add" style="white-space:nowrap"><i class="ti ti-send"></i> Add note</button></div>' +
      '</div>';
  }
  function notesListHtml(notes) {
    if (!notes.length) return '<div class="muted" style="font-size:12px;padding:6px 0">No notes yet — add the first annotation below.</div>';
    return notes.map(function (c) {
      var initials = String(c.user || "?").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      return '<div style="display:flex;gap:9px;padding:8px 0;border-top:0.5px solid var(--border2)">' +
        '<div class="avatar" style="width:26px;height:26px;flex:none;font-size:10px">' + initials + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-size:12px"><span style="font-weight:600">' + window.APP.esc(c.user) + '</span> <span class="muted" style="font-size:10.5px">· ' + window.APP.esc(c.role || "") + ' · ' + window.APP.fmtTs(c.ts) + '</span></div>' +
        '<div style="font-size:12.5px;color:var(--text);margin-top:2px;line-height:1.5">' + window.APP.esc(c.text) + '</div></div></div>';
    }).join("");
  }
  function wireNotes(id) {
    var add = document.getElementById("c-note-add"), input = document.getElementById("c-note-input");
    if (!add || !input) return;
    var submit = function () {
      if (!input.value.trim()) return;
      window.APP.addComment(id, input.value); input.value = "";
      var notes = window.APP.getComments(id);
      document.getElementById("c-notes-list").innerHTML = notesListHtml(notes);
      var cnt = document.getElementById("c-notes-count"); if (cnt) cnt.textContent = notes.length + " note" + (notes.length === 1 ? "" : "s");
    };
    add.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); });
  }

  function showTab(name) {
    curTab = name;
    var panel = document.getElementById("c-tabpanel"); if (!panel || !ctx) return;
    document.querySelectorAll(".ctab").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === name); });
    if (name === "overview") { panel.innerHTML = overviewHtml(ctx.a, ctx.prepay); var ovd = document.getElementById("c-ov-decide"); if (ovd) ovd.onclick = function () { showTab("decision"); }; wireWorkingRecord(ctx.id); }
    else if (name === "evidence") { panel.innerHTML = evidenceHtml(ctx.a, ctx.cl); wireEvidenceUploads(ctx.id); wireEvidenceDocs(ctx.id, ctx.a, ctx.cl); }
    else if (name === "analysis") { panel.innerHTML = analysisHtml(ctx.a); var rc = document.getElementById("c-openrc"); if (rc) rc.onclick = function () { window.APP.openProvider(ctx.p.id); }; }
    else if (name === "network") { panel.innerHTML = networkHtml(); renderCollusion(ctx.p, ctx.id); }
    else if (name === "decision") {
      panel.innerHTML = decisionHtml(ctx.id, ctx.a, ctx.cl);
      if (ctx.prepay) renderPrepayDecision(ctx.id, ctx.a);
      else renderDecision(ctx.id, ctx.a, window.APP.decisionFor(ctx.id));
      wirePrecedents(ctx.id);
    }
  }

  // ---------- Overview ----------
  function overviewHtml(a, prepay) {
    var factors = (a.xai && a.xai.factors || []).map(function (f) {
      return '<div class="fact"><div class="l">' + window.APP.esc(f.label) + '</div><div class="v">' + window.APP.esc(f.value) +
        (f.benchmark ? ' <span style="color:var(--high-tx)">vs ' + window.APP.esc(f.benchmark) + '</span>' : '') + '</div></div>';
    }).join("");
    var recTx = { pay: "var(--low-tx)", hold: "var(--med-tx)", deny: "var(--high-tx)" };
    var recBanner = prepay && a.recommendedAction ?
      '<div style="display:flex;align-items:center;gap:8px;background:var(--surface);border:0.5px solid var(--border);border-radius:8px;padding:9px 11px"><i class="ti ti-sparkles" style="color:var(--accent-d)"></i><div style="font-size:12px">Model recommends <span style="font-weight:600;color:' + recTx[a.recommendedAction] + '">' + ({ pay: "Pay", hold: "Hold for records", deny: "Deny" })[a.recommendedAction] + '</span> · ' + window.DP.usd(a.exposurePre || 0) + ' at risk. <span id="c-ov-decide" style="color:var(--accent-d);cursor:pointer;font-weight:500">Go to decision →</span></div></div>' : '';
    return '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">' +
      stat("Risk", '<span style="color:' + bandColor(a.riskScore) + '">' + a.riskScore + ' <span style="font-size:10px;font-weight:500">' + bandLabel(a.riskScore) + '</span></span>') +
      stat("Confidence", a.confidence + "%") +
      stat(prepay ? "At risk" : "Exposure", window.DP.usd(prepay ? a.exposurePre : a.exposurePost)) +
      stat("Source", '<span style="font-size:12.5px">' + window.APP.esc(a.source === "Both" ? "ML/AI + Rules" : window.DP.sourceOf(a)) + '</span>' + (a.manual ? ' <span class="tag" style="background:var(--med-bg);color:var(--med-tx)">manual</span>' : '')) +
      stat("FWA type", '<span style="font-size:12.5px">' + a.fwaType + '</span>') +
      '</div>' +
      (a.xai ? '<div class="xai"><div class="xai-h"><i class="ti ti-sparkles" style="color:var(--accent-d)"></i><span class="t">Why this was flagged</span><span style="font-size:10.5px;color:#5f8a80;margin-left:auto">Explainable AI</span></div>' +
        '<div style="padding:11px 12px"><div style="font-size:12.5px;line-height:1.6;margin-bottom:' + (factors ? "9px" : "0") + '">' + window.APP.esc(a.xai.summary) + '</div>' +
        (factors ? '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:7px">' + factors + '</div>' : '') + '</div></div>' : '') +
      recBanner +
      workingRecordCard(a, prepay) +
      '<div style="font-size:11.5px;color:var(--text2)"><i class="ti ti-info-circle"></i> Use the tabs above for the claim & rules (Evidence), decision-supporting graphs (Analysis), the collusion network (Network), and to record a decision.</div>' +
      '</div>';
  }

  // ---------- case working record (editable overlay, audit-logged) ----------
  function workingRecordCard(a, prepay) {
    var p = a.provider || {}, cl = a.claim, ve = a.veteran, id = a.id;
    var fields = [
      { f: "tin", label: "TIN", rec: p.tin || "", type: "text" },
      { f: "exposure", label: prepay ? "At-risk amount" : "Exposure", rec: (prepay ? a.exposurePre : a.exposurePost) || 0, type: "money" }
    ];
    if (cl) {
      fields.push({ f: "billed", label: "Billed", rec: cl.billedAmount || 0, type: "money" });
      fields.push({ f: "allowed", label: "Allowed", rec: cl.allowedAmount || 0, type: "money" });
      fields.push({ f: "paid", label: "Paid", rec: cl.paidAmount || 0, type: "money" });
      fields.push({ f: "claimNumber", label: "Claim #", rec: cl.claimNumber || "", type: "text" });
    }
    fields.push({ f: "providerName", label: "Provider", rec: p.name || "", type: "text" });
    if (ve) fields.push({ f: "veteranName", label: "Veteran", rec: ve.name || "", type: "text" });

    var w = window.APP.getWorking(id);
    var editCount = Object.keys(w).length;
    var grid = "display:grid;grid-template-columns:130px 1fr 1fr;gap:10px;align-items:center";
    var rows = fields.map(function (fl) {
      var edited = fl.f in w;
      var val = edited ? w[fl.f].value : fl.rec;
      var recDisp = fl.rec === "" ? "—" : (fl.type === "money" ? window.DP.usd(fl.rec) : window.APP.esc(String(fl.rec)));
      return '<div style="' + grid + ';padding:6px 0;border-top:0.5px solid var(--border2)">' +
        '<div style="font-size:11.5px;color:var(--text2)">' + fl.label + (edited ? ' <span class="tag" style="background:var(--med-bg);color:var(--med-tx)">edited</span>' : '') + '</div>' +
        '<div class="mono" style="font-size:11.5px;color:var(--text3)" title="claim of record — immutable">' + recDisp + '</div>' +
        '<input class="input wr-input" data-f="' + fl.f + '" data-label="' + window.APP.esc(fl.label) + '" data-rec="' + window.APP.esc(String(fl.rec)) + '" data-type="' + fl.type + '" type="' + (fl.type === "money" ? "number" : "text") + '" value="' + window.APP.esc(String(val)) + '" style="font-size:12px' + (edited ? ";border-color:var(--med);background:var(--med-bg)" : "") + '">' +
        '</div>';
    }).join("");
    return '<div class="card" id="c-working">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:10px;flex-wrap:wrap">' +
      '<div style="font-weight:500;font-size:13px"><i class="ti ti-edit" style="color:var(--accent-d)"></i> Case working record <span class="muted" style="font-weight:400;font-size:11px">· investigator\'s editable copy — the claim of record is unchanged; every edit is logged</span></div>' +
      '<span class="muted" style="font-size:11px" id="c-wr-count">' + (editCount ? editCount + " field" + (editCount === 1 ? "" : "s") + " edited" : "no edits") + '</span></div>' +
      '<div style="' + grid + ';font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em"><div>Field</div><div>Claim of record</div><div>Working value</div></div>' +
      rows +
      (editCount ? '<div style="margin-top:9px"><button class="btn" id="c-wr-reset" style="font-size:11px"><i class="ti ti-arrow-back-up"></i> Revert to claim of record</button></div>' : '') +
      '</div>';
  }
  function rerenderWorking(id) {
    var host = document.getElementById("c-working"); if (!host || !ctx) return;
    host.outerHTML = workingRecordCard(ctx.a, ctx.prepay);
    wireWorkingRecord(id);
  }
  function wireWorkingRecord(id) {
    document.querySelectorAll("#c-working .wr-input").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var f = inp.getAttribute("data-f"), label = inp.getAttribute("data-label"), type = inp.getAttribute("data-type"), recRaw = inp.getAttribute("data-rec");
        var val = type === "money" ? (+inp.value || 0) : inp.value;
        var rec = type === "money" ? (+recRaw || 0) : recRaw;
        if (String(val) === String(rec)) window.APP.clearWorking(id, f);
        else window.APP.setWorking(id, f, label, val, rec);
        rerenderWorking(id);
      });
    });
    var rb = document.getElementById("c-wr-reset");
    if (rb) rb.addEventListener("click", function () { window.APP.resetWorking(id); rerenderWorking(id); });
  }

  // ---------- Evidence ----------
  function evidenceHtml(a, cl) {
    var lines = cl ? cl.lines.map(function (l) {
      var flagged = (l.violatesRuleIds || []).length > 0;
      return '<tr' + (flagged ? ' class="flag-row"' : '') + '>' +
        '<td class="mono">' + l.cpt + '</td><td>' + window.APP.esc(l.description) + '</td>' +
        '<td>' + (l.modifiers.length ? '<span class="mono" style="background:var(--high-bg);color:var(--high-tx);padding:1px 5px;border-radius:4px">' + l.modifiers.join(",") + '</span>' : '—') + '</td>' +
        '<td class="right">' + l.units + '</td><td class="right">$' + l.billed + '</td><td class="right">$' + l.paid + '</td>' +
        '<td style="color:var(--high-tx);font-size:10.5px;white-space:nowrap">' + (flagged ? '<i class="ti ti-flag"></i> flagged' : '') + '</td></tr>';
    }).join("") : "";
    var rulesHtml = (a.rules || []).map(function (r) {
      return '<div style="display:flex;gap:9px;align-items:flex-start"><i class="ti ti-gavel" style="color:var(--high);margin-top:2px"></i><div><div style="font-size:12px;font-weight:500">' + window.APP.esc(r.name) + ' <span class="mono" style="font-weight:400;color:var(--text2)">' + window.APP.esc(r.code) + '</span> <span class="tag">' + window.APP.esc(r.source) + '</span></div><div style="font-size:11.5px;color:var(--text2)">' + window.APP.esc(r.description) + '</div></div></div>';
    }).join("");
    if (a.model) rulesHtml += '<div style="display:flex;gap:9px;align-items:center;padding-top:2px"><i class="ti ti-brain" style="color:var(--accent-d)"></i><div style="font-size:11.5px;color:var(--text2)">ML/AI model: <span style="color:var(--ink);font-weight:500">' + window.APP.esc(a.model.name) + '</span> (' + window.APP.esc(a.model.type) + ')</div></div>';
    if (!rulesHtml) rulesHtml = a.manual
      ? '<div style="font-size:11.5px;color:var(--text2)"><i class="ti ti-user-edit" style="color:var(--med)"></i> Analyst-created lead from <b>' + window.APP.esc(window.DP.sourceOf(a)) + '</b>' + (a.createdBy ? ' (' + window.APP.esc(a.createdBy) + ')' : '') + ' — no automated rule or model fired. Attach records on this tab to build the evidence.</div>'
      : '<div style="font-size:11.5px;color:var(--text2)">No rules fired — behavioral anomaly flagged by ' + (a.model ? window.APP.esc(a.model.name) : "the ML/AI models") + '.</div>';
    return '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<div class="card"><div style="font-weight:500;font-size:13px;margin-bottom:8px"><i class="ti ti-folder-open" style="color:var(--accent-d)"></i> Evidence on file <span class="muted" style="font-weight:400;font-size:11px">· click a record to review it</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' + evidenceDocs(a, cl).map(function (d) { return docRowHtml(d, "ev-doc-row"); }).join("") + '</div>' +
      '<div id="c-ev-doc" style="margin-top:9px"></div></div>' +
      (cl ? '<div class="card" style="padding:0;overflow:hidden"><div style="padding:9px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--border2)"><span style="font-weight:500;font-size:13px">Claim <span class="mono" style="font-weight:400;color:var(--text2)">' + cl.claimNumber + '</span></span><span style="font-size:11px;color:var(--text2)">' + cl.type + ' · DOS ' + cl.dateOfService + ' · Dx ' + (cl.diagnosisCodes.join(",") || "—") + ' · ' + cl.claimStatus + ' / ' + cl.paymentType + '</span></div>' +
        '<table><thead><tr><th>CPT</th><th>Description</th><th>Mod</th><th class="right">Units</th><th class="right">Billed</th><th class="right">Paid</th><th></th></tr></thead><tbody>' + lines + '</tbody></table></div>' : '') +
      '<div class="card"><div style="font-weight:500;font-size:13px;margin-bottom:8px">Rule engine outcomes</div><div style="display:flex;flex-direction:column;gap:7px">' + rulesHtml + '</div></div>' +
      '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:10px;flex-wrap:wrap">' +
      '<div style="font-weight:500;font-size:13px"><i class="ti ti-paperclip" style="color:var(--accent-d)"></i> Attached documents <span class="muted" style="font-weight:400;font-size:11px">· upload supporting records to the case (demo — files are not stored)</span></div>' +
      '<div><input type="file" id="c-upload-input" style="display:none"><button class="btn primary" id="c-upload-btn" style="font-size:12px"><i class="ti ti-upload"></i> Attach document</button></div></div>' +
      '<div id="c-uploads-list">' + uploadsListHtml(a.id) + '</div></div>' +
      '</div>';
  }
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : b >= 1024 ? Math.round(b / 1024) + " KB" : b + " B"; }
  function uploadsListHtml(id) {
    var ups = window.APP.getUploads(id);
    if (!ups.length) return '<div class="muted" style="font-size:11.5px;padding:4px 0">No documents attached yet. Use “Attach document” to add supporting records — every upload is logged to the audit trail.</div>';
    return ups.map(function (u) {
      return '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-top:0.5px solid var(--border2)"><i class="ti ti-file-description" style="color:var(--accent-d);font-size:17px"></i>' +
        '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:500">' + window.APP.esc(u.name) + '</div>' +
        '<div class="muted" style="font-size:10.5px">' + (u.size ? fmtSize(u.size) + " · " : "") + window.APP.esc(u.by || "") + " · " + window.APP.fmtTs(u.ts) + '</div></div>' +
        '<span class="tag" style="background:var(--low-bg);color:var(--low-tx)">attached</span></div>';
    }).join("");
  }
  function wireEvidenceDocs(id, a, cl) {
    var rows = document.querySelectorAll(".ev-doc-row");
    if (!rows.length) return;
    var kind = a.mode === "prepay" ? "Pending claim" : "Lead";
    var render = function (key) {
      var box = document.getElementById("c-ev-doc"); if (box) box.innerHTML = docContent(key, id, a, cl);
      document.querySelectorAll(".ev-doc-row").forEach(function (r) { r.style.borderColor = r.getAttribute("data-doc") === key ? "var(--accent-d)" : "var(--border)"; });
    };
    rows.forEach(function (r) {
      r.addEventListener("click", function () {
        var key = r.getAttribute("data-doc");
        render(key);
        window.APP.auditLog(key === "mr" ? "MEDICAL_RECORD_VIEWED" : "EVIDENCE_VIEWED", kind + " #" + id + (key === "mr" ? "" : " · " + key));
      });
    });
    render("mr"); // preview the medical record by default (no audit entry until the reviewer interacts)
  }
  function wireEvidenceUploads(id) {
    var btn = document.getElementById("c-upload-btn"), input = document.getElementById("c-upload-input");
    if (!btn || !input) return;
    btn.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () {
      var f = input.files && input.files[0]; if (!f) return;
      window.APP.addUpload(id, f.name, f.size); input.value = "";
      document.getElementById("c-uploads-list").innerHTML = uploadsListHtml(id);
    });
  }
  function defaultRecordsRequest(a) {
    var m = {
      "Upcoding": "Itemized progress notes and E/M documentation supporting the level billed.",
      "Unbundling": "Operative report and documentation of a distinct procedural service for the modifier-59 lines.",
      "Phantom billing": "Attendance logs, appointment records and proof of service for the billed dates.",
      "Residential length-of-stay abuse": "Admission/discharge records and medical-necessity documentation for the full length of stay.",
      "Deceased patient": "Date-of-death verification and service records for the dates billed.",
      "Kickback / self-referral": "Referral agreements, financial arrangements and ownership disclosures between the linked entities."
    };
    return m[a.fwaType] || "Itemized medical records and documentation supporting the billed services.";
  }

  // ---------- Analysis (decision-supporting graphs) ----------
  function card(title, body) { return '<div class="card"><div style="font-weight:500;font-size:13px;margin-bottom:8px">' + title + '</div>' + body + '</div>'; }
  function analysisHtml(a) {
    var p = a.provider;
    return '<div style="display:flex;flex-direction:column;gap:10px">' +
      exposureBreakdown(a) + emMix(p) + volumeChart(p, a) + reportCardSnippet(p) + '</div>';
  }
  function exposureBreakdown(a) {
    var cl = a.claim, prepay = a.mode === "prepay";
    var billed = cl ? cl.billedAmount : 0, allowed = cl ? cl.allowedAmount : 0, paid = cl ? cl.paidAmount : 0;
    var max = Math.max(billed, allowed, paid, prepay ? allowed : 0, 1);
    var bar = function (label, val, color) { var w = Math.round(val / max * 100); return '<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>' + label + '</span><span style="font-weight:600">' + window.DP.usd(val) + '</span></div><div style="height:9px;background:var(--border2);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + w + '%;background:' + color + '"></div></div></div>'; };
    var bars = bar("Billed (this claim)", billed, "#98a4b3") + bar("Allowed", allowed, "#6b7a8d") +
      (prepay ? bar("At risk (pending)", allowed, "var(--high)") : bar("Paid", paid, "var(--ink)"));
    var callout = prepay
      ? '<div style="background:var(--high-bg);border:0.5px solid #f3c9c9;border-radius:7px;padding:8px 10px;margin-top:6px;font-size:11.5px;color:var(--high-tx)"><b>' + window.DP.usd(a.exposurePre || allowed) + '</b> at risk — nothing is paid yet. Denying or holding this claim keeps that money from leaving.</div>'
      : '<div style="background:var(--high-bg);border:0.5px solid #f3c9c9;border-radius:7px;padding:8px 10px;margin-top:6px;font-size:11.5px;color:var(--high-tx)"><b>' + window.DP.usd(a.exposurePost || 0) + '</b> estimated improper across this provider’s flagged pattern (not just this one claim) — recoverable if confirmed.</div>';
    return card("Exposure breakdown", bars + callout);
  }
  function emMix(p) {
    var share = p.em99215ShareComputed; if (share == null) return "";
    var peer = (window.DP.getPeerBenchmark("internal_medicine_em") || {}).median99215Share || 0.14;
    var bar = function (label, val, color) { var w = Math.round(val * 100); return '<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>' + label + '</span><span style="font-weight:600">' + w + '%</span></div><div style="height:9px;background:var(--border2);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + w + '%;background:' + color + '"></div></div></div>'; };
    return card("E/M level mix vs peers", bar("This provider · 99215 share", share, "var(--high)") + bar("Specialty peer median", peer, "#6b7a8d") + '<div style="font-size:11px;color:var(--text2)">Share of established-patient visits billed at the highest level (99215). A large gap above the peer median is the upcoding signal.</div>');
  }
  function volumeChart(p, a) {
    var h = p.history || []; if (!h.length) return "";
    var max = Math.max.apply(null, h.map(function (m) { return m.claims; }).concat([1]));
    var W = 380, H = 92, bw = W / h.length;
    var bars = h.map(function (m, i) { var bh = Math.round(m.claims / max * (H - 20)); var x = i * bw; var flg = m.flagged > 0; return '<rect x="' + (x + 2) + '" y="' + (H - 16 - bh) + '" width="' + (bw - 4) + '" height="' + Math.max(bh, 1) + '" fill="' + (flg ? "var(--high)" : "#c2cad4") + '" rx="1.5"></rect>'; }).join("");
    var labels = h.map(function (m, i) { return (i % 3 === 0) ? '<text x="' + (i * bw + bw / 2) + '" y="' + (H - 3) + '" font-size="8" text-anchor="middle" fill="#8a95a3" font-family="IBM Plex Mono,monospace">' + m.month.slice(2) + '</text>' : ""; }).join("");
    var caption = a.fwaType === "Frequency / over-utilization" ? "Claim volume by month. The frequency flag is a single-patient spike, not a broad volume increase — open the medical record before recovering." : "Claim volume by month; red bars = months with flagged claims.";
    return card("Claim volume over time", '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" style="max-width:' + W + 'px;display:block">' + bars + labels + '</svg><div style="font-size:11px;color:var(--text2)">' + caption + '</div>');
  }
  function reportCardSnippet(p) {
    var gs = p.groupScores || []; if (!gs.length) return "";
    var rows = gs.map(function (g) {
      var w = Math.round(g.score / 100 * 100), pw = Math.round(g.peer / 100 * 100);
      return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span' + (g.outlier ? ' style="color:var(--high-tx);font-weight:500"' : '') + '>' + g.group + (g.outlier ? ' ▲' : '') + '</span><span class="mono" style="font-size:10.5px;color:var(--text3)">' + g.score + ' vs ' + g.peer + '</span></div><div style="height:7px;background:var(--border2);border-radius:4px;position:relative;overflow:hidden"><div style="position:absolute;left:' + pw + '%;top:0;bottom:0;width:1px;background:#98a4b3"></div><div style="height:100%;width:' + w + '%;background:' + (g.outlier ? "var(--high)" : "#c2cad4") + '"></div></div></div>';
    }).join("");
    return card("Provider report card", rows + '<div style="font-size:11px;color:var(--accent-d);cursor:pointer;margin-top:2px" id="c-openrc"><i class="ti ti-external-link"></i> Open full report card</div>');
  }

  // ---------- Network ----------
  function networkHtml() {
    return '<div class="card" id="c-collusion-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><div style="font-weight:500;font-size:13px"><i class="ti ti-affiliate" style="color:var(--high)"></i> Provider collusion network</div>' +
      '<span style="display:flex;gap:12px;align-items:center"><span class="muted" style="font-size:11px">claim → provider → network</span><span id="c-net-full" style="font-size:11.5px;color:var(--accent-d);cursor:pointer"><i class="ti ti-arrows-maximize"></i> Open full network</span></span></div>' +
      '<div id="c-collusion-narr" style="margin-bottom:9px"></div>' +
      '<div id="c-collusion-graph" style="background:var(--surface);border:0.5px solid var(--border);border-radius:8px;overflow:hidden"></div>' +
      '<div id="c-collusion-legend" class="legend" style="margin:8px 2px 0"></div></div>';
  }
  function renderCollusion(p, id) {
    var cardEl = document.getElementById("c-collusion-card");
    if (!cardEl || !window.Collusion || !p.id) { if (cardEl) cardEl.style.display = "none"; return; }
    var s = window.Collusion.analyze(p.id);
    document.getElementById("c-collusion-narr").innerHTML = window.Collusion.narrativeHtml(s);
    var graph = document.getElementById("c-collusion-graph"), legend = document.getElementById("c-collusion-legend");
    if (s && s.isRing) {
      window.Collusion.render(graph, p.id, { height: 300 });
      legend.innerHTML = collusionLegend(s);
    } else { graph.style.display = "none"; legend.style.display = "none"; }
    var full = document.getElementById("c-net-full");
    if (full) full.addEventListener("click", function () { window.APP.auditLog("NETWORK_VIEWED", "Claim #" + id + " · " + p.name); window.APP.nav("network"); });
  }
  function collusionLegend(s) {
    var out = [lgDot("#10243b", "Business entity"), lgDot("#0f6e56", "Provider in this case"), lgDot(s.kind === "chain" ? "#c6362f" : "#c77d11", "Linked provider"), lgDot("#378add", "Cross-billed veteran")];
    if (s.sharedTin) out.push(lgLine("#c6362f", 3, "Shared TIN"));
    if (s.sharedRegistration) out.push(lgLine("#b5730e", 2, "Same registration"));
    if (s.sharedOfficer) out.push(lgLine("#7a3aa0", 2, "Same officer"));
    if (s.referralCount) out.push(lgLine("#0f6e56", 2, "Referral"));
    out.push(lgLine("#8a95a3", 2, "Shared patients"));
    return out.join("");
  }
  function lgDot(color, label) { return '<span class="lg"><span class="dot" style="border-color:' + color + ';background:' + color + '26"></span>' + label + '</span>'; }
  function lgLine(color, w, label) { return '<span class="lg"><span style="width:16px;height:0;border-top:' + w + 'px solid ' + color + '"></span>' + label + '</span>'; }

  // ---------- Decision (mode-aware) ----------
  function decisionHtml(id, a, cl) {
    var sims = window.DP.getSimilarAdjudicated(a.fwaType, 3);
    var simConfirmed = sims.filter(function (s) { return s.outcome === "Confirmed"; }).length;
    var simsHtml = sims.length ? sims.map(function (s) {
      var conf = s.outcome === "Confirmed";
      return '<div class="prec-row" data-prec="' + s.id + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:0.5px solid var(--border2);cursor:pointer">' +
        '<span class="pill ' + (conf ? "p-conf" : "p-dis") + '">' + s.outcome + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">' + window.APP.esc(s.provider) + ' <span class="muted" style="font-weight:400">· ' + window.APP.esc(s.specialty) + '</span></div><div style="font-size:11px;color:var(--text2)">' + window.APP.esc(s.note) + '</div></div>' +
        '<div style="text-align:right;white-space:nowrap"><div style="font-size:12px;font-weight:500">' + (conf ? window.DP.usd(s.recovered) + " recovered" : "—") + '</div><div class="mono" style="font-size:10px;color:var(--text3)">#' + s.id + ' · ' + s.adjudicatedDate + '</div></div></div>';
    }).join("") : '<div class="muted" style="font-size:11.5px;padding-top:6px">No prior adjudicated cases of this type.</div>';
    return '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<div class="card" id="c-decision"></div>' +
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:500;font-size:13px">Similar adjudicated cases</div><span class="muted" style="font-size:11px">' + a.fwaType + ' · ' + simConfirmed + '/' + sims.length + ' confirmed</span></div>' + simsHtml + '<div id="c-prec"></div></div>' +
      '<div class="card"><div style="font-weight:500;font-size:13px;margin-bottom:8px">Case timeline</div>' + timelineHtml(id, a, cl) + '</div>' +
      '</div>';
  }
  function wirePrecedents(id) {
    document.querySelectorAll(".prec-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var pr = window.DP.getPrecedent(row.getAttribute("data-prec"));
        if (!pr) return;
        document.getElementById("c-prec").innerHTML = precDetail(pr);
        window.APP.auditLog("PRECEDENT_VIEWED", "Adjudicated case #" + pr.id);
      });
    });
  }

  // prepay: Pay / Hold / Deny
  function renderPrepayDecision(id, a) {
    var box = document.getElementById("c-decision");
    var dec = window.APP.prepayDecisionFor(id);
    if (dec) {
      var m = { pay: ["Cleared to pay", "var(--low-tx)", "circle-check"], hold: ["On hold — records requested", "var(--med-tx)", "clock-hour-4"], deny: ["Denied — payment prevented", "var(--high-tx)", "ban"] }[dec.action];
      box.innerHTML = '<div style="font-weight:500;font-size:13px;margin-bottom:9px">Pre-payment decision</div><div style="display:flex;align-items:center;gap:10px"><i class="ti ti-' + m[2] + '" style="color:' + m[1] + ';font-size:22px"></i><div><div style="font-weight:500;font-size:13px">' + m[0] + ' · ' + window.DP.usd(a.exposurePre || 0) + '</div><div style="font-size:11px;color:var(--text3);margin-top:4px">Logged to audit trail · ' + window.APP.fmtTs(dec.ts) + '</div></div></div>';
      return;
    }
    var rec = a.recommendedAction;
    var recTx = { pay: "var(--low-tx)", hold: "var(--med-tx)", deny: "var(--high-tx)" };
    box.innerHTML = '<div style="font-weight:500;font-size:13px;margin-bottom:9px">Pre-payment decision <span class="muted" style="font-weight:400;font-size:11px">· amount at risk ' + window.DP.usd(a.exposurePre || 0) + '</span></div>' +
      (rec ? '<div style="font-size:11.5px;color:var(--text2);margin-bottom:8px"><i class="ti ti-sparkles" style="color:var(--accent-d)"></i> Model recommends <span style="font-weight:600;color:' + recTx[rec] + '">' + ({ pay: "Pay", hold: "Hold for records", deny: "Deny" })[rec] + '</span>.</div>' : "") +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      ppseg("pay", "check", "Pay", "releases payment") + ppseg("hold", "clock-hour-4", "Hold", "request records") + ppseg("deny", "ban", "Deny", "stop payment") + '</div>' +
      '<div id="c-pphint" style="font-size:11.5px;color:var(--text2);margin-bottom:8px;min-height:16px"></div>' +
      '<button id="c-ppsubmit" class="btn primary" disabled><i class="ti ti-send"></i> Submit decision</button>';
    var choice = null;
    var segCls = { pay: "on-d", hold: "on-e", deny: "on-c" };
    var hints = { pay: "Releases " + window.DP.usd(a.exposurePre || 0) + " for payment — clean claim.", hold: "Holds the claim and requests supporting records before paying.", deny: "Denies the claim — " + window.DP.usd(a.exposurePre || 0) + " prevented from being paid." };
    box.querySelectorAll(".seg").forEach(function (s) {
      s.addEventListener("click", function () {
        choice = s.getAttribute("data-d");
        box.querySelectorAll(".seg").forEach(function (x) { x.className = "seg"; });
        s.className = "seg " + segCls[choice];
        document.getElementById("c-pphint").textContent = hints[choice];
        document.getElementById("c-ppsubmit").disabled = false;
      });
    });
    document.getElementById("c-ppsubmit").addEventListener("click", function () { if (!choice) return; window.APP.prepayDecide(id, choice); rerender(id); });
  }
  function ppseg(d, icon, label, sub) { return '<div class="seg" data-d="' + d + '"><i class="ti ti-' + icon + '"></i> ' + label + '<div class="sub">' + sub + '</div></div>'; }

  // retrospective: Confirm / Dismiss / Escalate
  function renderDecision(id, a, dec) {
    var box = document.getElementById("c-decision");
    if (dec && dec.reviewState !== "returned") {
      var label = { confirm: "Confirm", dismiss: "Dismiss", escalate: "Escalate" }[dec.outcome];
      var icon, color, msg;
      if (dec.reviewState === "pending") { icon = "clock-hour-4"; color = "#3a5578"; msg = label + " submitted — pending supervisor review (Karen Boyd)"; }
      else if (dec.reviewState === "approved") {
        if (dec.outcome === "confirm") { icon = "circle-check"; color = "var(--low)"; msg = "Confirmed · " + window.DP.usd(a.exposurePost) + " submitted for recovery · approved by Karen Boyd"; }
        else { icon = "arrow-up-right"; color = "var(--med)"; msg = "Escalated · Case opened · approved by Karen Boyd"; }
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
        document.getElementById("sv-appr").addEventListener("click", function () { window.APP.supervisorAction(id, "approve"); rerender(id); });
        document.getElementById("sv-ret").addEventListener("click", function () { window.APP.supervisorAction(id, "return", document.getElementById("sv-note").value); rerender(id); });
      }
      return;
    }
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
      '<div class="seg" data-d="e"><i class="ti ti-arrow-up-right"></i> Escalate<div class="sub">to a case</div></div></div>' +
      '<div id="c-hint" style="font-size:11.5px;color:var(--text2);margin-bottom:8px;min-height:16px"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><span style="font-size:11px;color:var(--text2)">Rationale (logged for audit &amp; model retraining)</span><button id="c-draft" class="btn" style="padding:4px 9px;font-size:11px"><i class="ti ti-sparkles"></i>Draft with AI</button></div>' +
      '<textarea id="c-rat" class="input" placeholder="Document your rationale…"></textarea>' +
      '<button id="c-submit" class="btn primary" style="margin-top:9px" disabled><i class="ti ti-send"></i>Submit decision</button>';
    var choice = null;
    var outMap = { c: "confirm", d: "dismiss", e: "escalate" };
    var hints = { c: "Confirms improper payment — " + window.DP.usd(a.exposurePost) + " moves to Submitted for recovery, and this lead opens (or joins) " + window.APP.esc(a.provider ? a.provider.name + "'s" : "the provider's") + " case.", d: "Logged as a false positive — outcome feeds model retraining. No case is opened.", e: "Escalates as coordinated behavior — opens (or joins) the provider's case for investigation." };
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
      var ta = document.getElementById("c-rat");
      var t = window.AI.draftRationale(a, outMap[choice]), i = 0;
      ta.value = "";
      var iv = setInterval(function () { i += 3; ta.value = t.slice(0, i); if (i >= t.length) { clearInterval(iv); ta.value = t; } }, 12);
    });
    document.getElementById("c-submit").addEventListener("click", function () {
      if (!choice) return;
      var rationale = document.getElementById("c-rat").value;
      window.APP.applyDecision(id, outMap[choice], rationale);
      rerender(id);
    });
  }

  // A sticky quick-decision bar so the analyst never has to scroll to act.
  function renderStickyBar(id, a, dec, prepay) {
    document.querySelectorAll(".c-sticky").forEach(function (n) { n.remove() });
    if (window.APP.isSupervisor()) return;
    // prepay: hide once triaged. retro: hide once decided, EXCEPT when a supervisor
    // returned it (the analyst still needs to revise & resubmit).
    if (prepay ? !!dec : (dec && dec.reviewState !== "returned")) return;
    var bar = document.createElement("div");
    bar.className = "c-sticky";
    bar.style.cssText = "position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:150;background:var(--ink);border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,0.22);display:flex;align-items:center;gap:7px;padding:7px 12px;font-family:var(--sans)";
    var btn = function (d, label, icon, bg, col) { return '<button class="sbtn" data-d="' + d + '" style="background:' + bg + ';color:' + col + ';border:none;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:var(--sans)"><i class="ti ti-' + icon + '"></i>' + label + '</button>'; };
    bar.innerHTML = '<span style="color:#93a7bf;font-size:12px;margin:0 3px">Decide:</span>' +
      (prepay
        ? btn("pay", "Pay", "check", "#fff", "#1f5a3d") + btn("hold", "Hold", "clock-hour-4", "rgba(255,255,255,0.12)", "#fff") + btn("deny", "Deny", "ban", "rgba(255,255,255,0.12)", "#fff")
        : btn("c", "Confirm", "check", "#fff", "#8b1a13") + btn("d", "Dismiss", "x", "rgba(255,255,255,0.12)", "#fff") + btn("e", "Escalate", "arrow-up-right", "rgba(255,255,255,0.12)", "#fff"));
    document.getElementById("view").appendChild(bar);
    bar.querySelectorAll(".sbtn").forEach(function (b) { b.onclick = function () { window.Views.claim.gotoDecision(b.getAttribute("data-d")); }; });
  }

  // ---------- export (CSV / Excel / PDF of the case) ----------
  function wireExport(id, a, cl, p, prepay, kind) {
    var clHead = ["CPT", "Description", "Modifiers", "Units", "Billed", "Allowed", "Paid", "Flagged"];
    var clRows = cl ? cl.lines.map(function (l) { return [l.cpt, l.description, (l.modifiers || []).join(" "), l.units, l.billed, l.allowed, l.paid, (l.violatesRuleIds || []).length ? "Yes" : "No"]; }) : [];
    window.EXPORT.wire("c", {
      csv: function () { window.EXPORT.csv("claim-" + id, clHead, clRows); },
      xls: function () { window.EXPORT.xls("claim-" + id, "Claim " + id, clHead, clRows); },
      pdf: function () {
        var ve = a.veteran, s = window.Collusion ? window.Collusion.analyze(p.id) : null;
        var body = window.EXPORT.kvHtml([
          ["Claim", cl ? cl.claimNumber : "—"], ["Provider", p.name], ["NPI", p.npi], ["Veteran", ve ? ve.name : "—"],
          ["Risk", a.riskScore + "/100"], ["Confidence", a.confidence + "%"], [prepay ? "At risk" : "Exposure", window.DP.usd((prepay ? a.exposurePre : a.exposurePost) || 0)],
          ["FWA type", a.fwaType], ["Status", a.status], ["Source", a.source === "Pattern Recognition" ? "ML/AI" : a.source === "Both" ? "ML/AI + Rules" : "Rules"]
        ]) +
          (a.xai ? "<h2>Why flagged (Explainable AI)</h2><div class='card'>" + window.EXPORT.htmlEsc(a.xai.summary) + "</div>" : "") +
          (cl ? "<h2>Claim line items</h2>" + window.EXPORT.tableHtml(clHead, clRows) : "") +
          ((a.rules && a.rules.length) ? "<h2>Rules fired</h2>" + window.EXPORT.tableHtml(["Code", "Rule", "Source"], a.rules.map(function (r) { return [r.code, r.name, r.source]; })) : "") +
          (s && s.isRing ? "<h2>Collusion network</h2><div class='card'>" + window.EXPORT.htmlEsc((s.kind === "chain" ? "Residential chain — " : "Provider ring — ") + s.providerCount + " providers, " + s.sharedPct + "% shared veterans" + (s.sharedTin ? ", shared TIN " + s.tin : s.sharedRegistration ? ", shared registration " + (s.registration || "") : "") + ".") + "</div>" : "");
        window.EXPORT.pdf(kind + " #" + id + " — " + a.fwaType, body);
      }
    });
  }

  function rerender(id) { window.Views.claim.render(document.getElementById("view"), { id: id }); }
  function assignOptions(cur) { return '<option value="__unassigned__"' + (!cur ? " selected" : "") + '>Unassigned</option>' + window.APP.ANALYSTS.map(function (n) { return '<option value="' + n + '"' + (cur === n ? " selected" : "") + '>' + n + '</option>'; }).join(""); }
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
    if (cl) ev.push({ d: cl.dateOfService, t: "Claim submitted", s: cl.claimNumber + " · " + cl.type + (a.mode === "prepay" ? " · pending payment" : " · paid " + window.DP.usd(cl.paidAmount)), ic: "file-invoice", c: "var(--text2)" });
    ev.push({ d: a.createdDate, t: "Flagged — " + a.fwaType, s: "by " + (a.model ? a.model.name : a.source) + " · risk " + a.riskScore + " · confidence " + a.confidence + "%", ic: "flag", c: "var(--high)" });
    if (a.assignee) ev.push({ d: a.createdDate, t: "Assigned", s: "to " + a.assignee, ic: "user", c: "var(--text2)" });
    window.APP.state.audit.slice().reverse().forEach(function (e) {
      if (e.detail.indexOf("#" + id) >= 0 && e.action.indexOf("SESSION") < 0) ev.push({ d: window.APP.fmtTs(e.ts), t: labelize(e.action), s: e.detail.replace(/(Flagged|Pending) claim #/, "").replace("#" + id, "").replace(/^ · /, ""), ic: iconFor(e.action), c: "var(--accent-d)" });
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
    if (a.indexOf("CONFIRM") >= 0 || a.indexOf("APPROVED") >= 0 || a.indexOf("PREPAY_PAY") >= 0) return "circle-check";
    if (a.indexOf("DISMISS") >= 0 || a.indexOf("PREPAY_DENY") >= 0) return "circle-x";
    if (a.indexOf("ESCALATE") >= 0 || a.indexOf("INVESTIGATION") >= 0) return "arrow-up-right";
    if (a.indexOf("RETURN") >= 0 || a.indexOf("PREPAY_HOLD") >= 0) return "corner-up-left";
    if (a.indexOf("RECOVERY") >= 0) return "cash";
    if (a.indexOf("REVIEW") >= 0) return "clock-hour-4";
    if (a.indexOf("RECORD") >= 0 || a.indexOf("EVIDENCE") >= 0) return "file-text";
    if (a.indexOf("SUMMARY") >= 0) return "file-analytics";
    if (a.indexOf("NETWORK") >= 0) return "affiliate";
    return "point";
  }

  function docBox(title, body, tone) {
    var bg = tone === "good" ? "var(--low-bg)" : "var(--surface)", bd = tone === "good" ? "#bfe0c9" : "var(--border)", tx = tone === "good" ? "var(--low-tx)" : "var(--text2)";
    return '<div style="background:' + bg + ';border:0.5px solid ' + bd + ';border-radius:7px;padding:9px 11px"><div style="font-weight:500;font-size:11.5px;color:' + tx + ';margin-bottom:4px"><i class="ti ti-file-description"></i> ' + title + '</div><div style="font-size:11px;color:var(--text2);line-height:1.55">' + body + '</div></div>';
  }
  // the evidence records on file for a lead (shared by the rail index + Evidence tab)
  function evidenceDocs(a, cl) {
    var prepay = a.mode === "prepay";
    var docs = [{ key: "mr", label: "Medical record", icon: "file-text", meta: "on file" }];
    if (cl) {
      docs.push({ key: "claim", label: "Claim (" + cl.type + ")", icon: "file-invoice", meta: cl.claimNumber });
      if (!prepay) docs.push({ key: "ra", label: "Remittance (835)", icon: "receipt", meta: window.DP.usd(cl.paidAmount) });
    }
    docs.push({ key: "auth", label: "Authorization / referral", icon: "clipboard-check", meta: "on file" });
    return docs;
  }
  function docRowHtml(d, cls) {
    return '<div class="' + cls + '" data-doc="' + d.key + '" style="display:flex;align-items:center;gap:7px;padding:6px 8px;border:0.5px solid var(--border);border-radius:6px;cursor:pointer;font-size:11.5px"><i class="ti ti-' + d.icon + '" style="color:var(--accent-d)"></i><span style="flex:1">' + d.label + '</span><span class="muted" style="font-size:10px">' + window.APP.esc(d.meta) + '</span><i class="ti ti-chevron-right" style="color:var(--text3);font-size:14px"></i></div>';
  }
  function docContent(key, id, a, cl) {
    if (key === "mr") {
      if (id === "20463") return docBox("Nephrology progress note", "Dx <span class='mono'>N18.6</span> end-stage renal disease. Standing order: in-center hemodialysis 3×/week (Mon/Wed/Fri). Vascular access: AV fistula, functioning. The billed <span class='mono'>90935</span> frequency is consistent with the documented dialysis regimen.", "good");
      if (a.fwaType === "Upcoding") return docBox("Clinical note", "Established-patient visit for a stable chronic condition. History and exam are focused; medical decision-making is straightforward. Documentation does <b>not</b> support the high-complexity level (<span class='mono'>99215</span>) billed.");
      return docBox("Clinical note", "Encounter documentation on file for the billed date of service. Content is being reviewed against the billed codes.");
    }
    if (key === "claim" && cl) return docBox("Claim " + cl.claimNumber, cl.type + " · DOS " + cl.dateOfService + " · Dx " + (cl.diagnosisCodes.join(",") || "—") + ". Line items: " + cl.lines.map(function (l) { return l.cpt + (l.modifiers.length ? "-" + l.modifiers.join(",") : "") + " ($" + l.paid + ")"; }).join(", ") + ". Billed " + window.DP.usd(cl.billedAmount) + (a.mode === "prepay" ? " · pending payment." : " · paid " + window.DP.usd(cl.paidAmount) + "."));
    if (key === "ra" && cl) return docBox("Remittance advice (835)", "Payment of " + window.DP.usd(cl.paidAmount) + " on " + cl.dateOfService + ". Status: paid in full, no prior adjustments. This is a post-payment review — funds have already been disbursed.");
    if (key === "auth") return docBox("Authorization / referral", "Community Care referral on file for the billed service, valid through 2025. Authorized scope is being validated against the billed procedure(s).");
    return docBox("Document", "No preview available.");
  }
})();
