/* Deterministic "Gen AI" — the AIProvider seam. Pre-scripted, streamed to feel live.
   Backlog: swap for a live Gemini call via a serverless proxy (no UI change).
   Attaches to window.AI. */
(function () {
  function draftRationale(a, outcome) {
    var p = a.provider || {}, exp = window.DP.usd(a.exposurePost || 0);
    var C = {
      confirm: "Confirmed " + a.fwaType.toLowerCase() + ". " + p.name + " (NPI " + (p.npi || "—") +
        ") shows the flagged pattern with supporting rule and peer evidence; documentation does not justify the billed services. " +
        "Recommend recovery of " + exp + " in improper post-payment amounts and update of the provider risk profile.",
      dismiss: "Reviewed and dismissed. On examination of the record, the flagged pattern is clinically and contractually supported; no improper payment is identified. " +
        "Logging as a false positive so the outcome feeds model retraining and reduces similar low-confidence flags.",
      escalate: "Escalating to Investigation. The pattern combined with network signals (shared identifiers / referrals) suggests coordinated behavior warranting a full investigation beyond single-claim recovery."
    };
    // scenario-specific overrides
    if (a.id === "20517") {
      C.confirm = "Confirmed unbundling. Rio Grande Surgical Partners (NPI 1487653920) billed 43235 with modifier 59 alongside 43239 on 28 of 31 paired claims, bypassing the NCCI PTP edit with no documentation of a distinct procedural service. Component 43235 ($410/claim) is not separately payable in the same session. Recommend recovery of $11,480.";
      C.escalate = "Escalating to Investigation. The 90% modifier-59 override rate combined with a shared billing TIN (00-6820473) with Alamo Internal Medicine (PR001) suggests coordinated behavior warranting a full investigation.";
    }
    if (a.id === "20463") {
      C.dismiss = "Reviewed and dismissed. The medical record confirms end-stage renal disease (N18.6) with a standing order for thrice-weekly in-center hemodialysis — 36 sessions/quarter is clinically appropriate. No improper payment. Logged as a false positive to condition-adjust the frequency model for ESRD.";
    }
    if (a.id === "20481") {
      C.confirm = "Confirmed upcoding. Alamo Internal Medicine bills 99215 on ~90% of established-patient visits vs a 14% specialty-peer median (5.8σ), with linked diagnoses showing low clinical complexity. Recommend recovery of the overpayment differential (~$22,815) and a targeted claim review.";
    }
    return C[outcome] || "";
  }

  // Simple intent-matched copilot answers grounded in the allegation/provider.
  function copilot(a, question) {
    var q = (question || "").toLowerCase();
    var p = a.provider || {};
    var band = window.DP.band(a.riskScore);
    var lvl = band === "high" ? "high" : band === "med" ? "moderate" : "low";
    if (q.indexOf("peer") >= 0 || q.indexOf("compare") >= 0) {
      if (a.id === "20481") return "Alamo Internal Medicine bills 99215 on ~90% of established-patient visits. The Internal-Medicine peer median is 14% (range 9–18% across 6 TX peers). That places this provider ~5.8σ above the peer group — the single strongest driver of the risk score.";
      return p.name + " scores " + a.riskScore + "/100 (" + lvl + ") for " + a.fwaType.toLowerCase() + ", above the peer norm for its specialty. See the Network view for shared-identifier context.";
    }
    if (q.indexOf("recommend") >= 0 || q.indexOf("action") >= 0 || q.indexOf("should") >= 0) {
      if (a.id === "20463") return "Recommendation: request the medical record first. The confidence is low (61%) and frequency alone drives the flag. If the record shows an ESRD dialysis regimen, dismiss as a false positive — recovering here would be an error.";
      if (a.id === "20517") return "Recommendation: confirm and escalate. Two rules fired (NCCI PTP + modifier-59) and the shared-TIN link to PR001 raises this above a single-claim recovery — an Investigation is warranted.";
      return "Recommendation: given a " + lvl + " risk score of " + a.riskScore + " with " + a.confidence + "% confidence, confirm if the rule/peer evidence holds, and escalate if network signals suggest coordination.";
    }
    if (q.indexOf("why") >= 0 || q.indexOf("flag") >= 0 || q.indexOf("explain") >= 0) {
      return a.xai ? a.xai.summary : "This item was flagged as " + a.fwaType.toLowerCase() + " with a risk of " + a.riskScore + "/100.";
    }
    if (q.indexOf("draft") >= 0 || q.indexOf("rationale") >= 0) {
      return draftRationale(a, "confirm");
    }
    if (q.indexOf("exposure") >= 0 || q.indexOf("recover") >= 0 || q.indexOf("amount") >= 0 || q.indexOf("dollar") >= 0) {
      return "Estimated post-payment exposure is " + window.DP.usd(a.exposurePost || 0) + ". If confirmed, that amount moves to Submitted for recovery.";
    }
    return "This is a " + a.fwaType.toLowerCase() + " allegation on " + p.name + " with risk " + a.riskScore + "/100 and " + a.confidence + "% confidence. Ask me to summarize the risk, compare to peers, recommend an action, or draft a rationale.";
  }

  // Typewriter streamer for the "live" feel.
  function stream(el, text, done) {
    el.textContent = "";
    var i = 0;
    var iv = setInterval(function () {
      i += 3; el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(iv); el.textContent = text; if (done) done(); }
    }, 12);
    return iv;
  }

  window.AI = { draftRationale: draftRationale, copilot: copilot, stream: stream };
})();
