/* Guided demo ribbon — walkthrough sequenced to the RFI script.
   Removable: the × hides it (a floating "Guided demo" pill re-opens). Delete this
   file + its <script> + #demo-ribbon to remove entirely. */
(function () {
  function q(sel) { return document.querySelector(sel); }
  function click(sel) { var e = q(sel); if (e) e.click(); }
  function tab(name) { click('.ctab[data-tab="' + name + '"]'); }
  function closeCopilot() { if (window.COPILOT && window.COPILOT.close) window.COPILOT.close(); }
  function retro() { window.APP.setRole("analyst"); if (window.APP.isPrepay()) window.APP.setMode("retrospective"); }

  function ensureRecords(id, channel) { if (!window.APP.recordsRequestFor(id)) window.APP.requestRecords(id, { channel: channel || "portal", items: "Progress notes and E/M documentation supporting the level billed." }); }

  // Sequenced by PWS element to pair with the recorded audio: ELEMENT 1 (1.1–1.2,
  // purpose-built architecture + rule inventory) → ELEMENT 2 (2.1–2.2, CMS pricing
  // & updates, in audio order) → ELEMENT 3 (3.1–3.2, healthcare-trained AI models,
  // in audio order) → close. Element 1 order is intentionally left as-is.
  var STEPS = [
    // ===== ELEMENT 1 · Purpose-built healthcare architecture & rule inventory (1.1–1.2) =====
    // Orientation (1.1.i)
    { t: "Two personas, one workspace", n: "PIVOT puts program integrity in one workspace. Top-right you switch personas — analyst Dana Whitmore and supervisor Karen Boyd — and the experience adapts to each. Global search spans leads, providers, businesses, rules and healthcare standards. The Prepay / Retrospective toggle moves between stopping a claim before it pays and recovering after. And four areas: Home (each persona's top items), Casework (the staff inbox by risk), Insights (dashboards), and Library (the rules and pricing logic).", a: function () { retro(); closeCopilot(); window.APP.nav("home"); } },

    // Core healthcare entities (1.1.ii)
    { t: "A consolidated lead file", n: "Open a flagged claim and everything sits in one file. The subject tiles on the left summarize the core entities — the primary subject under review, plus the provider, beneficiary, and the billing entity behind them. Overview gives the risk, confidence and an explainable-AI “why this was flagged.”", a: function () { retro(); window.APP.openAllegation("20481"); tab("overview"); } },
    { t: "Every entity has a profile", n: "Each core entity has its own profile. The provider report card scores each composite group against the peer norm — click a spoke to drill into the attributes — and the outlier comparison ranks this provider against its peers, alongside its claims, anomalous visits, open leads and exposure.", a: function () { retro(); window.APP.openProvider("PR001"); } },
    { t: "Configuring the entities — Payer Setup", n: "Behind the entities is Payer Setup — where service categories, reference codes, providers, networks and fee schedules are configured. These feed directly into the deterministic processing paths, so the right benefit, pricing and coverage logic is applied consistently.", a: function () { retro(); closeCopilot(); window.APP.nav("payersetup"); } },
    { t: "The member — a 360° view", n: "Each beneficiary has a 360° member view: profile and enrollment, the Patient Aligned Care Team and primary-care provider, line of business, their claims, and prior authorizations — the whole member in one place. Click a claim to open its record.", a: function () { retro(); closeCopilot(); window.APP.nav("member"); } },
    { t: "Screened against exclusions", n: "Entities are screened continuously. Pacific Sands, a chain affiliate, carries an OIG LEIE exclusion right on its profile — barred from federal health-care programs — so every claim paid during the exclusion is recoverable in full. An automatic finding, independent of coding.", a: function () { retro(); window.APP.openProvider("PR301"); } },
    { t: "When the subject isn't the provider", n: "The subject of investigation isn't always a provider. Lead #20805 is a pharmacy — its Claim tab is an NCPDP prescription claim with NDC-level drug lines, days-supply and DAW: a brand billed under DAW-1 with no dispensing record. A companion beneficiary lead (#20806) flags one member ID billed across six providers in three states. Same workflow — provider, pharmacy, or beneficiary.", a: function () { retro(); window.APP.openAllegation("20805"); tab("claim"); } },
    { t: "…and dental (837D)", n: "The same claim model covers dental too. Lead #20274 is an 837D dental claim — the Claim tab shows the CDT procedure lines behind the same standards toggle (X12 837 / HL7 FHIR). Professional, institutional, dental or pharmacy — one consolidated record.", a: function () { retro(); window.APP.openAllegation("20274"); tab("claim"); } },
    { t: "How entities interrelate", n: "The Network shows how entities relate — coordinated rings versus isolated anomalies. Rio Grande Surgical shares a billing TIN with Alamo: one entity, coordinated behavior. Insights › Businesses follows the money to the holding company or billing unit connecting them, and the Heatmap shows utilization and exposure by specialty and region.", a: function () { retro(); window.APP.openAllegation("20517"); tab("network"); } },

    // Healthcare standards on the claim (1.1.iii)
    { t: "How claims arrive — EDI", n: "Before any of this, claims arrive as EDI. Insights › EDI shows the intake health — transaction-set volumes (837P/I/D, 835, 834, 270/271, 999), acceptance and acknowledgment stats (999 · TA1 · 277CA), and the top rejection reasons — plus the pipeline architecture from ingest through validation, enrichment, the models, case management and remittance. Rejected transactions never reach adjudication, so the analytics run on a clean, standards-validated stream.", a: function () { retro(); closeCopilot(); window.APP.nav("edi"); } },
    { t: "One claim, three standards", n: "The Claim tab is the full record a reviewer works from — the diagnoses, every service line with its line-level adjudication, the benefit and contract terms governing those lines, and the 835 remittance reconciling submitted → allowed → paid. The standards toggle shows the very same claim as the X12 837 it arrived on and the HL7 FHIR ExplanationOfBenefit it maps to.", a: function () { retro(); window.APP.openAllegation("20481"); tab("claim"); } },
    { t: "Why a line is flagged", n: "Evidence lists every claim line, flagged and clean, tied to the exact rule or model that fired. On this residential claim the H0018 per-diem line is highlighted — length of stay past medical necessity, and patient-days billed beyond what the staffed beds can physically hold. Click any line to expand what tripped it.", a: function () { retro(); window.APP.openAllegation("20544"); tab("evidence"); } },
    { t: "Coding — the NCCI crosswalk", n: "The Coding tab runs the claim through CMS coding edits — NCCI procedure-to-procedure pairs, unit limits, and modifier validity. Here 43235 is bundled into 43239 and billed with modifier 59 to bypass the edit: a column-2 component that is not separately payable.", a: function () { retro(); window.APP.openAllegation("20517"); tab("coding"); } },
    { t: "Utilization — medical necessity", n: "Utilization checks the level of care and length of stay against evidence-based clinical care guidelines, and for facilities whether the patient-days billed fit the licensed bed capacity. Was the care necessary — and could it even have happened.", a: function () { retro(); window.APP.openAllegation("20544"); tab("utilization"); } },
    { t: "Analysis — the evidence behind the score", n: "Analysis is the behavioral evidence: the provider's billing distribution versus its peer group — here the share of level-5 visits — the exposure by anomaly type, and volume over time. The pattern that tripped the model, not just the single claim.", a: function () { retro(); window.APP.openAllegation("20481"); tab("analysis"); } },

    // Lead → Case workflow (1.1.iv)
    { t: "The lead lifecycle", n: "The workflow tracker traces a lead through six steps — Flagged, Assigned, Under review, Decision, Supervisor review, and Case. An analyst claims an unassigned lead with “Assign to me” and starts review before any decision can be recorded.", a: function () { retro(); window.APP.openAllegation("20481"); tab("overview"); } },
    { t: "Requesting the record", n: "Missing documentation? Request it — by fax, secure email, or a provider-portal invite. The invite hands off to the provider's own screen, where they upload the records; on submit the file flows straight back into the lead's evidence and the request closes as Received.", a: function () { retro(); ensureRecords("20481", "portal"); window.APP.openPortal("20481"); } },
    { t: "Record a decision", n: "Once a lead is under review, the analyst records the outcome by its consequence — Dismiss (clean, payment stands) or Confirm / Escalate (improper, propose where the case should land). A coded reason and an optional AI justification memo attach, then submit routes it to the supervisor. The case itself is created only on approval.", a: function () { retro(); closeCopilot(); var me = window.APP.ROLES[window.APP.state.role].name; window.APP.assignCase("20318", me); window.APP.startLeadReview("20318"); window.APP.openAllegation("20318"); tab("decision"); var seg = document.querySelector('.seg[data-d="c"]'); if (seg) seg.click(); } },
    { t: "Supervisor review", n: "Switch to Karen Boyd and the workspace changes. Confirmed leads wait under Casework › Approvals; only the supervisor's approval creates or updates the case and releases the recovery — the analyst can't move the money. Approve, or return with a note for revision.", a: function () { closeCopilot(); window.APP.setRole("supervisor"); window.APP.nav("approvals"); } },
    { t: "The case & its lifecycle", n: "On the case page, the case workflow tracker runs opened → development → supervisor review → disposition → closed, alongside the case narrative, its constituent leads and total exposure. Closing with a coded reason, and referral to OIG or law enforcement, are supervisor-only. The full Lead timeline and History tab keep the record for a handoff or an appeal.", a: function () { window.APP.setRole("supervisor"); window.APP.openProvider("PR204"); } },

    // The rulebook & code libraries (1.2)
    { t: "The rulebook", n: "Library › Rules catalogs every rule, grouped by regulatory source, entity type, fraud type, detection level or severity. Open one and it's fully transparent — the decision logic it applies, the exact claim fields and 837 segments it reads, and what it emits: a flag, a disposition, the CARC it drives. No black box.", a: function () { retro(); closeCopilot(); window.APP.nav("rules"); var rr = document.querySelector('.rule-row[data-rule="rule_em_level"]'); if (rr) rr.click(); } },
    { t: "From rule to lead", n: "And a rule connects back to the claims it fires on. From the NCCI edit we jump straight to the example lead — Rio Grande's unbundling — with a provenance banner on the Coding tab showing exactly why the edit applied. Rulebook to real claim, in one click.", a: function () { retro(); window.APP.state.highlightRule = "rule_ncci_43235_43239"; window.APP.openAllegation("20517"); } },
    { t: "Code libraries", n: "And every claim is read against versioned reference sets — CPT/HCPCS, ICD-10-CM/PCS, revenue codes, modifiers, CARC/RARC and provider taxonomy — each with its edition and update cycle, in Library › Code libraries. The rules and the pricer resolve codes through these, kept current on their published schedules.", a: function () { retro(); closeCopilot(); window.APP.nav("codelibraries"); } },

    // ===== ELEMENT 2 · CMS pricing logic & update process (2.1–2.2) · audio order =====
    { t: "Pricing methodologies", n: "Library › Pricing lists the CMS methodologies the platform supports — IPPS/DRG, OPPS/APC, MPFS, DMEPOS, ambulance, clinical lab, ASP drug and the institutional pricers (IRF, LTCH, IPF, SNF, ASC, ESRD, home health) — and how the right one is selected from the claim's date of service, provider and facility attributes, locality, site of service and fee schedule.", a: function () { retro(); closeCopilot(); window.APP.nav("methodologies"); } },
    { t: "Pricing — the DRG grouper", n: "On an inpatient claim the Calculation view opens the MS-DRG grouper. Here the submitted DRG 030 is flagged invalid for the coded craniotomy and regrouped to DRG 026 — priced through IPPS to $28,595.58, with the relative weight, wage index, labor/non-labor split, DSH and IME components and the ordered pricer log all shown.", a: function () { retro(); window.APP.openAllegation("20901"); tab("pricing"); setTimeout(function () { var seg = document.querySelector('.pr-seg[data-pr="calculation"]'); if (seg) seg.click(); }, 40); } },
    { t: "Pricing — outpatient APC", n: "On an outpatient claim the Calculation view opens the APC grouper and the Outpatient Code Editor. Each service line gets an Ambulatory Payment Classification and a CMS status indicator: separately-payable lines price at the APC rate; a packaged line correctly returns a zero-dollar allowance instead of a separate payment; and mutually-exclusive or non-covered lines are denied. Coding validation and reimbursement logic, shown together.", a: function () { retro(); window.APP.openAllegation("20544"); tab("pricing"); setTimeout(function () { var seg = document.querySelector('.pr-seg[data-pr="calculation"]'); if (seg) seg.click(); }, 40); } },
    { t: "Pricing — show the math (professional)", n: "Professional claims are priced on the Medicare Physician Fee Schedule. Flip to the Calculation view and the pricer opens: the work, practice-expense and malpractice RVUs × the geographic practice cost indices × the conversion factor, with site-of-service and modifiers, and the ordered pricer log. Displaying the formula and its components makes the allowed amount independently reviewable — not a black box.", a: function () { retro(); window.APP.openAllegation("20481"); tab("pricing"); setTimeout(function () { var seg = document.querySelector('.pr-seg[data-pr="calculation"]'); if (seg) seg.click(); }, 40); } },
    { t: "Keeping CMS current", n: "Day-one pricing only matters if it stays current. Library › Releases carries a CMS content release repository — each source publication, package, effective date, impacted pricer/rule set, status and validation — plus effective-dated pricing: the same code across two periods, with the date of service auto-selecting the rate. A July 1 2026 claim uses the Q3 ASP file; an earlier one keeps the prior quarter.", a: function () { retro(); closeCopilot(); window.APP.nav("releases"); } },

    // ===== ELEMENT 3 · Healthcare-trained AI models & pattern recognition (3.1–3.2) · audio order =====
    { t: "The model library", n: "Library › Models is the registry behind the analytics — anomaly, predictive, clustering, NLP and ensemble models, each with its version, status, training method, the healthcare task it performs, its feature driver table and measured performance. The AI is catalogued, versioned and governed — not a black box.", a: function () { retro(); closeCopilot(); window.Views.models.demoOpen("registry"); } },
    { t: "Creating a model", n: "The library is pre-populated with 54 ML models, and users can create more. Choose an approach — Predictive Analysis, Random Forest, K-means, or an AI model — select the training data and columns, train, and deploy to prepay. For an AI model on physical-therapy data, the system auto-adds surgical features when it detects a PT provider billing for surgery.", a: function () { retro(); closeCopilot(); window.Views.models.demoOpen("model"); } },
    { t: "Risk intelligence — the external picture", n: "Each entity carries a categorized risk-intelligence dossier — sanctions, licensure, ownership, adverse media, network, litigation and identity signals — each with its source and date, an overall external-risk score, and a plain-language AI summary with a chronological feed. Corroboration from outside the claims data, un-attributed.", a: function () { retro(); window.APP.openProvider("PR301"); setTimeout(function () { var el = [].slice.call(document.querySelectorAll('.card')).filter(function (c) { return /Risk intelligence/.test(c.textContent); })[0]; if (el) el.scrollIntoView({ block: "center" }); }, 60); } },
    { t: "Emerging-rule discovery", n: "The models don't just score claims — they surface new rules. Library › Discovery proposes candidate rules from the patterns the models keep seeing: the source pattern, the proposed logic, the data it needs, a suggested trigger, and a replay estimating the impact in claims and dollars. A reviewer approves, returns or rejects — and an approved candidate flows into the release pipeline. Human-in-the-loop rule governance.", a: function () { retro(); closeCopilot(); window.APP.nav("discovery"); } },
    { t: "Creating a feature", n: "When a running model surfaces an anomaly — a Sleep-Apnea model flagging expensive dental orthotics — users create a feature to capture it. A dual-classification feature ties the orthotic codes to a required prior sleep study, flagging any orthotic with no prior study. Several of the 88 recommended features measure whether a prior procedure was performed.", a: function () { retro(); closeCopilot(); window.Views.models.demoOpen("feature"); } },
    { t: "Agentic assist & correspondence", n: "The Investigative Assistant is agentic: three role-specialized agents — Investigative (entity · network · OSINT), Claims (billing · coding · pricing) and Policy (rules · thresholds · authorities) — each read the case through their lens and return grounded findings with the sources they read. It also drafts correspondence — records requests, suspension notices, overpayment determinations — populated with the case specifics, ready to review, attach to the case, or export. The AI drafts; the analyst adopts.", a: function () { retro(); window.APP.openAllegation("20481"); if (window.COPILOT) window.COPILOT.open("agents"); } },
    { t: "Human-in-the-loop — the legitimate catch", n: "Not every flag is fraud. This dialysis lead is flagged for frequency, but the record shows a standing ESRD order — thrice-weekly is appropriate. The analyst dismisses it: clean, payment stands, logged for model retraining. The tool supports judgment, not a wrong accusation.", a: function () { retro(); window.APP.openAllegation("20463"); tab("evidence"); } },

    // ===== Close =====
    { t: "Prepay — prevent, don't chase", n: "Flip the toggle to Prepay and the same models score claims before payment. The analyst decides Pay · Hold · Deny with a coded reason — a chain readmission is denied up front, so the improper payment never leaves the VA. Retrospective recovers; prepay prevents.", a: function () { window.APP.setRole("analyst"); window.APP.setMode("prepay"); window.APP.nav("queue"); } },
    { t: "The full loop", n: "That's the loop — the workspace, the core entities, the healthcare standards on the claim, the lead-to-case workflow, and the rulebook behind it — across prepay and retrospective. Every surface exports to CSV, Excel and PDF.", a: function () { retro(); closeCopilot(); window.APP.nav("analytics"); } }
  ];

  var DEMO = {
    i: 0,
    start: function () { DEMO.show(); DEMO.go(0); },
    show: function () { q("#demo-ribbon").style.display = "block"; var p = q("#demo-pill"); if (p) p.style.display = "none"; },
    hide: function () { q("#demo-ribbon").style.display = "none"; DEMO.pill(); window.APP.auditLog("DEMO_HIDDEN", "Guided demo ribbon dismissed"); },
    go: function (n) {
      DEMO.i = Math.max(0, Math.min(STEPS.length - 1, n));
      var s = STEPS[DEMO.i];
      try { if (s.a) s.a(); } catch (e) {}
      DEMO.render();
    },
    next: function () { if (DEMO.i < STEPS.length - 1) DEMO.go(DEMO.i + 1); },
    prev: function () { if (DEMO.i > 0) DEMO.go(DEMO.i - 1); },
    render: function () {
      var s = STEPS[DEMO.i], n = DEMO.i + 1, N = STEPS.length;
      var dots = STEPS.map(function (_, k) { return '<span data-go="' + k + '" style="width:7px;height:7px;border-radius:50%;cursor:pointer;background:' + (k === DEMO.i ? "#17b3a6" : "rgba(255,255,255,0.25)") + '"></span>'; }).join("");
      q("#demo-ribbon").innerHTML =
        '<div style="max-width:var(--page-max);margin:0 auto;padding:7px 24px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="display:flex;align-items:center;gap:7px;white-space:nowrap"><i class="ti ti-player-play" style="color:#7fe0d6"></i><span style="font-size:12px;font-weight:500;color:#fff">Guided demo</span><span style="font-size:11px;color:#93a7bf">' + n + '/' + N + '</span></div>' +
        '<div style="flex:1;display:flex;justify-content:center;align-items:center;gap:5px">' + dots + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">' +
        '<button id="demo-prev" class="btn" style="padding:4px 9px;font-size:12px;background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.25)"' + (DEMO.i === 0 ? " disabled" : "") + '><i class="ti ti-chevron-left"></i></button>' +
        '<button id="demo-next" class="btn" style="padding:4px 11px;font-size:12px;background:#17b3a6;color:#04342c;border-color:#17b3a6"' + (DEMO.i === N - 1 ? " disabled" : "") + '>Next <i class="ti ti-chevron-right"></i></button>' +
        '<button id="demo-close" title="Hide demo" class="btn" style="padding:4px 7px;font-size:12px;background:transparent;color:#93a7bf;border-color:rgba(255,255,255,0.2)"><i class="ti ti-x"></i></button>' +
        '</div></div>' +
        '<div style="font-size:12.5px;color:#cfe0f0;margin-top:5px;line-height:1.45"><span style="font-weight:500;color:#fff">' + s.t + '.</span> ' + s.n + '</div>' +
        '</div>';
      q("#demo-prev").onclick = DEMO.prev;
      q("#demo-next").onclick = DEMO.next;
      q("#demo-close").onclick = DEMO.hide;
      q("#demo-ribbon").querySelectorAll("[data-go]").forEach(function (d) { d.onclick = function () { DEMO.go(+d.getAttribute("data-go")); }; });
    },
    pill: function () {
      var p = q("#demo-pill");
      if (!p) {
        p = document.createElement("button");
        p.id = "demo-pill";
        p.style.cssText = "position:fixed;bottom:18px;left:18px;z-index:200;background:#10243b;color:#fff;border:0.5px solid rgba(255,255,255,0.2);border-radius:22px;padding:8px 14px;font-size:12.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 12px rgba(0,0,0,0.2)";
        p.innerHTML = '<i class="ti ti-player-play" style="color:#7fe0d6"></i> Guided demo';
        p.onclick = DEMO.start;
        document.body.appendChild(p);
      }
      p.style.display = "flex";
    }
  };
  window.DEMO = DEMO;

  function boot() { if (!window.APP || !window.APP.ready) { return setTimeout(boot, 100); } DEMO.start(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
