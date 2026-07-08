# VA PIVOT Demo — Roadmap / Change List

Derived from the stakeholder demo-review meeting (Patel's notes + Josh + Wendy call). **North star: accelerate
the adjudication of pending claims.** Status of the live demo: analyst + supervisor workflow, network graph,
analytics, provider 360, rules library, audit, guided demo, Supabase login + persistence — all built & deployed.

Legend: **[now]** buildable with synthetic data · **[wendy]** needs Wendy's data (build synthetic placeholder now,
swap later) · **[ext]** external reference (TrackLight/Jack) · effort S/M/L.

**Working copy of record:** `~/dev/pivot-demo` (clone of `ShuaLuke/payment-integrity-demo`, live at
shualuke.github.io/payment-integrity-demo via GitHub Pages from `main`). The `Downloads/va pivot/pivot-demo` copy
is stale (sits at `937ad7b`, 10 commits behind) — do not build there. This roadmap lives in `Downloads/va pivot/`
(canonical planning doc) **and** is committed into the clone so it travels with the repo.

---

## ROUND 2 — Patel / Jack stakeholder review (2026-07-08)

Second review round. Re-sequenced below into build Phases A–F. **Re-baseline note:** Round 1's §1–§10 (below) is
mostly shipped through Sprint 3 (HEAD `b13555b`), so several Round-2 asks are already partly done — status is
called out per phase. Do the **Lead/Case rename (Phase A) first** so later network/AI/editing work isn't built on
soon-to-change vocabulary.

**Vocabulary shift (stakeholder's words):** Allegation → **"Lead"**, Investigation → **"Case"**. Change
user-facing copy/labels/nav only; keep internal object ids / data keys / method names stable (`openAllegation`,
`state.allegationId`, `D.allegations`, `listAllegations` all unchanged). **Case model:** a Case is **provider-level**
(typically one open case per provider) and aggregates all that provider's Leads (flagged claims); new leads
auto-attach to the provider's existing case.

- **Phase A — Lead/Case model + IA + full-screen** · [now M] · **TODO (build first)**
  - Rename to Lead/Case across nav, titles, list headers, copilot/AI copy, audit strings.
  - Cases list (one row per provider with open leads: exposure, risk, lead count) + Case detail rolling up its
    leads. Repurpose `views/investigations.js` + the provider view; add `DP.listCases`/`DP.getCase`.
  - Descriptive lead header: `Lead #20481 · Alamo Internal Medicine — Upcoding` (`views/claim.js`).
  - Use the full screen: raise `.page` max-width (1180 → ~1500 / fluid) + responsive grids (large-monitor reviewer).
- **Phase B — Case tabs (Overview·Evidence·Analysis·Network·Decision)** · **✅ DONE** (Sprint 2 §4, `5aa27b5`) —
  verify only; re-label under new vocab.
- **Phase C — Collusion network on the case view + explainability** · **✅ LARGELY DONE** (Sprint 1 §3, `feaaa2f`) —
  network embedded on the Network tab via `DP.getCollusionNetwork`, plain-language narrative + legend present.
  Remaining: confirm narrative covers both the shared-TIN ring (PR001/PR002) and the residential chain
  (PR300–PR303); tighten `views/network.js` legend/labels if thin.
- **Phase D — AI "Summarize for adjudication" + comments** · **½ DONE** — summarize action exists (Sprint 1 §5,
  `f27f066`, cites `DP.getSimilarAdjudicated`). **TODO:** audit-logged comment/annotation thread ("color
  commentary") on a lead/case.
- **Phase E — Investigator editing + uploads + analyst-created leads** · **TODO**
  - Editable case working-record (TIN, exposure, payment amounts, provider/veteran/claim fields) visibly distinct
    from the "claim of record"; log every edit to `APP.auditLog`.
  - Document-upload affordance on Evidence (demo fake-attach + audit-log); make "request records" wording
    configurable per case.
  - Create-a-Lead (analyst-authored) + Lead **source taxonomy** (data-mining · rules · ML/AI · hotline/tip ·
    referral · OIG) + source filter — answers "allegations are manual, not data-driven" (some legitimately are).
- **Phase F — TrackLight secondary-scoring enrichment (on the Report Card)** · **½ DONE** — business-registration
  facet exists (Sprint 3, `c39fb39`). **TODO:** synthetic external-profile panel — Business (state registry,
  OpenCorporates, liens/judgments/bankruptcies, court dockets, OSINT) + Individual/officer (LexisNexis, Enformion,
  public records, death OSINT). Lean on the chain's existing officer (Marcus D. Feld) + holding co (Meridian
  Behavioral Holdings) to make it land.

**Deferred (note only, don't build):** beneficiary/veteran-side fraud; ingesting Jack's real millions-of-payloads
report-card JSON — keep the `DP` seam shaped to accept it.

**Open item:** Patel to message a precise "lead → case" definition. Proceeding on the provider-level model above;
flag any mismatch if his definition arrives.

**Round-2 build order:** A (full) → D-comments → E → F-officer-half → verify B/C under new vocab.

---

## ROUND 1 — original workstreams (mostly shipped through Sprint 3)

## 1. Terminology & framing
- [now S] Rename **"Pattern Recognition" → "ML / AI models"** everywhere: claim "Source" label, Rules library
  section (currently "pattern-recognition models"), copilot/claim wording. Frame the models as
  **composite anomaly models**.
- [now S] Keep source values as **ML/AI · Rules · Both** (tag already shows "AI" → make it "ML/AI").

## 2. Provider Report Card (headline new feature)
- [now L] Upgrade **Provider 360 → Report Card**.
- [now M] **Radar / spider chart** (Wendy's "FBI spider"): spokes = **group codes**
  (Charge & Payment · Diagnostic Testing · Distance/Travel · Utilization · Coding — reuse FAMS composite groups).
  Show **provider vs peer norm**; highlight **outliers**.
- [now M] **Click a spoke → drill into the attribute values** for that group (per Wendy: select a group, see values).
- [now M] **Outlier comparison** — how all providers differ from one another (ranking / scatter of a chosen metric).
- [now S] **Historical claims** list at the provider level + **visit-count** metric (# visits where the event occurs).
- [now M] **Repeat-offender** indicator + **"Flag provider for future reference"** action (persist to Supabase).
- [now M] **Adjudication can start from a provider** (not only a claim) — provider → its flagged claims.
- [wendy] Real group-code atlas + attribute values + report-card examples.

## 3. Provider network / collusion (make it explainable)
- [now M] Add **plain-language narrative** to the network ("shares 90% of veterans + same TIN/address → likely
  collusion") + clearer legend/labels. Fixes "cool but unexplainable."
- [now L] **Synthetic collusion example**: a **residential-treatment-facility chain** shuffling veterans across
  states (AZ→CA→NV) for **<30-day stays** to bank 30-day charges. Clean **3–4 provider schema**.
- [now S] **Shared-veterans %** metric between providers; **shared TIN/address/officer** edges.
- [now M] **The collusion network lives ON THE CASE VIEW** (flagged-claim screen) as a core panel — NOT hidden in
  Insights. Reviewing a case surfaces its provider's collusion network in-context. (Insights › Network stays as an
  optional broad explorer, but the case view is the primary home.)
- [now M] **Claim → Provider → Network** drill path all reachable from the case (the 3 levels in one place).
- [ext] **Business-registration** facet (fraud businesses) — TrackLight concept; add shared-registration data.
- [wendy] Swap in Wendy's real **3-provider schema + network narrative**; align look to **TrackLight** (Jack's IRS demo).

## 4. Flagged-claim screen restructure ("chop up the screen")
- [now M] Reorganize into cleaner **sections/tabs** (Overview · Evidence · Analysis · Network · Decision).
- [now M] Add **decision-supporting graphs**: E/M distribution vs peers, frequency-over-time, exposure breakdown,
  a **report-card snippet**, and the **embedded network** (from §3).

## 5. AI / adjudication assist
- [now M] Copilot **"Summarize this case for adjudication"** — talks through the anomaly, the evidence, and the
  recommended action.
- [now S] Reference **historical adjudication cases** (existing precedents) in the summary + recommendation.

## 6. Modes: prepay vs retrospective
- [now M] **Prepay view** (pending-claim triage — today's queue) vs **Retrospective view** (more comprehensive:
  provider-level aggregate, historical, whole-population). Toggle at the top.

## 7. Exports (required)
- [now M] Expand exports beyond analytics CSV: **report card, claim, network data, queue → CSV / Excel / PDF.**

## 8. Demo flow / narrative
- [now S] Reframe the guided demo to the stakeholders' flow: **start on Analytics** (what they measure, what an
  outlier looks like) → the claim → **case management** → the claim with **network + report card** visualizations.
- [now S] Emphasize **claim → provider → network** and "**these are not one-offs**" (flagging providers).

## 9. Dataset changes to support the above
- [now M] Per-provider **group-code attributes** (for the radar) — synthetic now.
- [now M] The **residential-facility collusion network** (new providers, cross-state shared vets, short stays).
- [now S] **Business-registration / shared-address** data for the network.
- [now S] Provider-level **watchlist/flagged** state (persist to Supabase — new column/table).
- [now S] **Prepay vs retrospective** data facets; provider historical-claim volumes.

## 10. ~~Carry-over / housekeeping~~ — DROPPED (per Josh: not needed now)

---

## Dependencies (external)
- **Wendy** to send: codes **Atlas**, fabricated data for a couple codes, **anomaly graphs**, **report cards**,
  the **residential-facility example**, the **network narrative / 3-provider schema**, and Daniel's viz set.
- **Jack / TrackLight**: Josh to review the **IRS TrackLight demo**; align network + business-registration feel.

## Sequencing (Round 1 — status)
- **Sprint 1 ✅ shipped:** §1 ML/AI rename · §2 Provider Report Card + spider · §3 network-on-claim + explainability +
  synthetic collusion example · §5 AI case summary.
- **Sprint 2 ✅ shipped:** §4 claim-screen restructure · §6 prepay/retro · §7 exports · §8 demo reframe · §9 data.
- **Sprint 3 ◐ buildable subset shipped:** TrackLight-style business-registration facet + UI polish + `DATA_SPEC.md`
  swap contract. Still blocked on external inputs: Wendy's real data, aligning look to Jack's TrackLight demo.

> Round 2 (Patel/Jack review, 2026-07-08) supersedes this sequencing — see the **ROUND 2** section at the top for
> the current Phase A–F plan and build order.
