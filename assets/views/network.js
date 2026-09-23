/* Network view — the two collusion scenarios (shared-TIN ring, residential chain),
   each drawn with the layered Collusion graph + narrative. */
(function () {
  window.Views = window.Views || {};

  window.Views.network = {
    render: function (mount) {
      var scnBtn = function (id, label, sub) { return '<button class="nscn" data-scn="' + id + '" style="border:none;background:none;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;color:var(--text2);font-family:var(--sans);display:flex;flex-direction:column;align-items:flex-start;line-height:1.2"><span style="font-weight:500">' + label + '</span><span style="font-size:9.5px;color:var(--text3)">' + sub + '</span></button>'; };
      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Provider network</div><div class="page-sub">Two known collusion patterns — pick a scenario. Click any provider to open its report card.</div></div>' +
        '<div style="display:flex;gap:10px;align-items:center">' +
        '<div style="display:flex;background:var(--surface);border:0.5px solid var(--border);border-radius:8px;padding:2px">' + scnBtn("ring", "Shared-TIN ring", "one billing entity") + scnBtn("chain", "Residential chain", "AZ → CA → NV") + '</div>' +
        window.EXPORT.group("nw") +
        '</div></div>' +
        '<div class="canvas" id="n-canvas"></div>' +
        '<div class="legend" id="n-legend"></div>' +
        '<div id="n-boxes" style="display:flex;gap:10px;margin-top:4px"></div>' +
        '</div>';

      var current = "ring";
      function setActive(scn) { mount.querySelectorAll(".nscn").forEach(function (b) { var on = b.getAttribute("data-scn") === scn; b.style.background = on ? "var(--card)" : "none"; b.style.color = on ? "var(--ink)" : "var(--text2)"; b.style.boxShadow = on ? "0 1px 2px rgba(16,36,59,.08)" : "none"; }); }
      function paint(scn) {
        current = scn; setActive(scn);
        var focus = scn === "chain" ? "PR300" : "PR001";
        document.getElementById("n-legend").innerHTML = window.Collusion.legendHtml(window.Collusion.analyze(focus), { showFocus: false });
        document.getElementById("n-boxes").innerHTML = scn === "chain" ? boxesChain() : boxesRing();
        window.Collusion.render(document.getElementById("n-canvas"), focus, { height: 440, showFocus: false });
      }
      mount.querySelectorAll(".nscn").forEach(function (b) { b.onclick = function () { paint(b.getAttribute("data-scn")); }; });
      window.EXPORT.wire("nw", {
        csv: function () { var d = netData(current); window.EXPORT.csv("collusion-network-" + current, d.eHead, d.eRows); },
        xls: function () { var d = netData(current); window.EXPORT.xls("collusion-network-" + current, "Edges", d.eHead, d.eRows); },
        pdf: function () {
          var d = netData(current), s = window.Collusion.analyze(d.focus);
          var summary = s.kind === "chain"
            ? window.APP.esc(s.registration || "") + " — " + s.providerCount + " facilities across " + s.states.join("/") + ", shared officer " + window.APP.esc(s.officer || "") + ", " + s.sharedPct + "% shared veterans, separate TINs (hidden common ownership)."
            : s.providerCount + " providers operating as one billing entity — shared TIN " + (s.tin || "") + ", " + s.referralCount + " referrals, " + s.sharedPct + "% shared veterans.";
          window.EXPORT.pdf("Collusion network — " + (current === "chain" ? "residential chain" : "shared-TIN ring"),
            "<div class='card'>" + window.EXPORT.htmlEsc(summary) + "</div><h2>Providers</h2>" + window.EXPORT.tableHtml(d.pHead, d.pRows) +
            "<h2>Shared-identifier edges</h2>" + window.EXPORT.tableHtml(["Type", "Source", "Target", "Detail"], d.eRows.map(function (e) { return [e[0], e[2], e[4], e[5]]; })));
        }
      });
      paint("ring");
    }
  };

  // export data for the current scenario's collusion subgraph
  function netData(scn) {
    var focus = scn === "chain" ? "PR300" : "PR001";
    var net = window.DP.getCollusionNetwork(focus), provs = net.providers.filter(Boolean);
    var nameOf = {}; provs.forEach(function (p) { nameOf[p.id] = p.name; });
    var pHead = ["ID", "Name", "NPI", "TIN", "State", "Risk", "Role"];
    var pRows = provs.map(function (p) { return [p.id, p.name, p.npi, p.tin, p.state, p.riskScore, p.role]; });
    var eHead = ["Type", "Source", "Source name", "Target", "Target name", "Detail"];
    var eRows = net.links.map(function (e) { var pr = e.props || {}; var det = pr.tin || pr.officer || pr.registration || (pr.sharedVeterans ? pr.sharedVeterans + " shared veterans" : "") || (pr.veteranId ? "veteran " + pr.veteranId : "") || ""; return [e.type, e.source, nameOf[e.source] || e.source, e.target, nameOf[e.target] || e.target, det]; });
    return { focus: focus, pHead: pHead, pRows: pRows, eHead: eHead, eRows: eRows };
  }

  function boxesRing() {
    var s = window.Collusion.analyze("PR001");
    return '<div style="flex:1">' + window.Collusion.narrativeHtml(s) + '</div>' +
      '<div style="flex:1;background:var(--low-bg);border:0.5px solid #bfe0c9;border-radius:8px;padding:10px 12px"><div style="display:flex;align-items:center;gap:6px;font-weight:500;font-size:12.5px;color:var(--low-tx)"><i class="ti ti-circle-check"></i>Benign by contrast</div><div style="font-size:11.5px;color:#2f5a44;margin-top:3px;line-height:1.5">Coastal Kidney Care also bills one veteran heavily (<span style="font-weight:500">36 dialysis claims</span>), but it shares no TIN, owner, referrals or patients with another provider, so it has no network to draw. High volume alone isn\'t a ring. Hover a provider or veteran above to trace the ring\'s threads.</div></div>';
  }
  function boxesChain() {
    var s = window.Collusion.analyze("PR300");
    return '<div style="flex:1">' + window.Collusion.narrativeHtml(s) + '</div>' +
      '<div style="flex:1;background:var(--surface);border:0.5px solid var(--border);border-radius:8px;padding:10px 12px"><div style="display:flex;align-items:center;gap:6px;font-weight:500;font-size:12.5px;color:var(--ink)"><i class="ti ti-route"></i>How to read it</div><div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5">Read it top to bottom: the <b>owner</b>, the <b>facilities</b> it controls, and the <b>veterans</b> billed by more than one of them. Each facility bills under a <span style="font-weight:500">separate TIN</span>, which keeps the common ownership hidden from single-claim review. Hover a veteran to trace their path across states, hover a facility to see who it shares, and click a facility to open its report card.</div></div>';
  }

})();
