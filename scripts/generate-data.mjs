// VA PIVOT — deterministic synthetic dataset generator.
// Emits a graph-shaped JSON (collections + graph nodes/edges) that mirrors the Neo4j
// model in PIVOT_DEMO_DATA_SPEC.md, so it doubles as a Neo4j loader later.
// ALL DATA IS FABRICATED. NPIs deliberately FAIL the NPI check digit; TINs use the
// `00-` prefix (never a real EIN). No real PII/PHI.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/dataset.json");

// ---------- deterministic RNG (mulberry32) ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20260701;
const rnd = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p) => rnd() < p;
const round2 = (n) => Math.round(n * 100) / 100;

// ---------- NPI check-digit helpers (ensure every NPI is INVALID) ----------
function npiCheckDigit(prefix9) {
  const s = "80840" + prefix9;
  let total = 0;
  const digits = s.split("").reverse();
  for (let i = 0; i < digits.length; i++) {
    let d = parseInt(digits[i], 10);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    total += d;
  }
  return (10 - (total % 10)) % 10;
}
function isValidNpi(npi) {
  return npiCheckDigit(npi.slice(0, 9)) === parseInt(npi[9], 10);
}
// make a random INVALID npi (looks like a valid 10-digit NPI but fails the check)
function makeInvalidNpi() {
  let prefix = "1";
  for (let i = 0; i < 8; i++) prefix += int(0, 9);
  const valid = npiCheckDigit(prefix);
  const bad = (valid + 1) % 10; // guaranteed wrong
  const npi = prefix + bad;
  if (isValidNpi(npi)) throw new Error("npi unexpectedly valid: " + npi);
  return npi;
}
let tinCounter = 1000;
const makeTin = () => `00-${String(1000000 + tinCounter++).slice(-7)}`;

// ---------- reference tables ----------
const CPT = {
  "99211": { desc: "Office visit, established, level 1", allowed: 24 },
  "99212": { desc: "Office visit, established, level 2", allowed: 57 },
  "99213": { desc: "Office visit, established, level 3", allowed: 92 },
  "99214": { desc: "Office visit, established, level 4", allowed: 131 },
  "99215": { desc: "Office visit, established, level 5", allowed: 184 },
  "43239": { desc: "Upper GI endoscopy with biopsy", allowed: 600 },
  "43235": { desc: "Upper GI endoscopy, diagnostic", allowed: 410 },
  "90935": { desc: "Hemodialysis, single evaluation", allowed: 88 },
  "93000": { desc: "Electrocardiogram, complete", allowed: 18 },
  "71046": { desc: "Chest X-ray, 2 views", allowed: 30 },
  "97110": { desc: "Therapeutic exercise, 15 min", allowed: 32 },
  "70551": { desc: "MRI brain without contrast", allowed: 250 },
  "20610": { desc: "Arthrocentesis, major joint", allowed: 65 },
  "99283": { desc: "Emergency dept visit, level 3", allowed: 120 },
  "E1390": { desc: "Oxygen concentrator (DME)", allowed: 210 },
  "D0120": { desc: "Periodic oral evaluation", allowed: 40 },
  "D1110": { desc: "Prophylaxis, adult cleaning", allowed: 95 }
};
const DX = {
  I10: "Essential hypertension",
  "E11.9": "Type 2 diabetes mellitus",
  "N18.6": "End-stage renal disease",
  "K21.9": "Gastro-esophageal reflux disease",
  "M54.5": "Low back pain",
  "J45.909": "Asthma, unspecified",
  "R07.9": "Chest pain, unspecified",
  "Z00.00": "General adult medical exam"
};
const TAXONOMY = {
  "207R00000X": "Internal Medicine",
  "208600000X": "Surgery",
  "207RN0300X": "Nephrology",
  "2085R0202X": "Diagnostic Radiology",
  "207RC0000X": "Cardiovascular Disease",
  "251E00000X": "Home Health Agency",
  "1223G0001X": "Dentist, General Practice",
  "332B00000X": "Durable Medical Equipment",
  "282N00000X": "General Acute Care Hospital"
};
const FIRST = ["Robert","Danielle","Walter","Marcus","Linda","James","Patricia","Angela","Victor","Rosa","Derek","Sandra","Theodore","Gloria","Nathan","Yolanda","Curtis","Beatrice","Hector","Denise","Raymond","Estelle","Franklin","Camille","Oscar","Vivian","Leon","Marguerite","Clifford","Dolores"];
const LAST = ["Hayes","Cross","Briggs","Ellison","Navarro","Pruitt","Alvarado","Whitfield","Barrera","Kowalski","Sizemore","Delacroix","Ferris","Ackerman","Vega","Lombardi","Sturgeon","Mancini","Ocampo","Redding","Thibodeaux","Yancey","Holloway","Escobar","Ridley","Fontaine","Broussard","Galloway","Winslow","Cavazos"];
const TX_CITIES = ["San Antonio","Austin","Corpus Christi","Houston","El Paso","Laredo","McAllen","Waco","Lubbock","Odessa"];
const ANALYSTS = ["Dana Whitmore","Maria Delgado","Devon Carter","Priya Nair"];
const FWA = {
  UPCODING: "Upcoding",
  UNBUNDLING: "Unbundling",
  MODIFIER: "Modifier misuse",
  DUPLICATE: "Duplicate claim",
  FREQUENCY: "Frequency / over-utilization",
  OUTSIDE_SPECIALTY: "Billing outside specialty",
  DECEASED: "Deceased patient",
  PHANTOM: "Phantom billing",
  AUTH_MISMATCH: "Authorization mismatch"
};
const RULES = [
  { id: "rule_ncci_43235_43239", code: "NCCI-PTP 43235/43239", name: "NCCI Procedure-to-Procedure edit", source: "CMS NCCI", category: "Coding", description: "43235 is a component of 43239 and not separately payable in the same session.", version: "2.3", effectiveDate: "2025-01-01", environment: "Production" },
  { id: "rule_mue", code: "MUE", name: "Medically Unlikely Edit", source: "CMS", category: "Coding", description: "Units billed exceed the medically unlikely threshold for the code.", version: "1.7", effectiveDate: "2024-10-01", environment: "Production" },
  { id: "rule_mod59", code: "MOD-59-OVERRIDE", name: "Modifier 59 override review", source: "CMS NCCI", category: "Coding", description: "Modifier 59 applied to bypass a PTP edit without documented distinct service.", version: "1.2", effectiveDate: "2025-02-01", environment: "Production" },
  { id: "rule_mppr", code: "MPPR", name: "Multiple Procedure Payment Reduction", source: "CMS", category: "Pricing", description: "Reduces payment for the second and subsequent procedures in the same session.", version: "1.0", effectiveDate: "2024-07-01", environment: "Production" },
  { id: "rule_fee", code: "FEE-SCHEDULE", name: "Fee schedule / pricing validation", source: "VA Fee Schedule", category: "Pricing", description: "Validates paid amount against the applicable VA fee schedule / CMAC allowance.", version: "3.1", effectiveDate: "2025-01-15", environment: "Production" },
  { id: "rule_dup", code: "DUP-CLAIM", name: "Duplicate claim detection", source: "VA", category: "Integrity", description: "Claim duplicates a previously adjudicated claim (same provider, patient, date, code).", version: "2.0", effectiveDate: "2024-09-01", environment: "Production" },
  { id: "rule_auth", code: "AUTH-MISMATCH", name: "Referral/authorization mismatch", source: "VA", category: "Coverage", description: "Billed service does not match the authorized referral.", version: "1.4", effectiveDate: "2024-12-01", environment: "Production" },
  { id: "rule_payreport", code: "PAY-REPORT", name: "Pay-and-report threshold", source: "VA", category: "Workflow", description: "Claim paid with appended flag metadata and routed to the analyst workload module for post-payment review.", version: "1.1", effectiveDate: "2025-01-01", environment: "Production" }
];
const MODELS = [
  { id: "model_em_peer", name: "E/M Peer-Group Profile", type: "Anomaly Detection", description: "Flags providers whose E/M level distribution deviates from specialty peers." },
  { id: "model_freq", name: "Per-Patient Frequency", type: "Anomaly Detection", description: "Flags procedure frequency far above per-patient norms." },
  { id: "model_mod", name: "Modifier Abuse Pattern", type: "Anomaly Detection", description: "Flags abnormal modifier-59 override rates vs peers." }
];

// ---------- date helpers (deterministic; no Date.now) ----------
const pad = (n) => String(n).padStart(2, "0");
function isoDate(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }
function randomDOS() { // within 2025
  const m = int(1, 12); const d = int(1, 28); return isoDate(2025, m, d);
}
function dob() { return isoDate(int(1945, 1985), int(1, 12), int(1, 28)); }

// ---------- collections ----------
const providers = [];
const veterans = [];
const claims = [];
const authorizations = [];
const payments = [];
const allegations = [];
const edges = [];

let claimSeq = 0, authSeq = 0, paySeq = 0, allgSeq = 20600;
function claimNumber() {
  const a = String.fromCharCode(65 + int(0, 25));
  return `${a}${int(100, 999)}X${int(10, 99)}K${int(1, 9)}-0${int(0, 9)}-${pad(int(1, 40))}`;
}

function addVeteran(explicit = {}) {
  const id = explicit.id || `V${String(veterans.length + 1).padStart(4, "0")}`;
  const v = {
    id,
    name: explicit.name || `${pick(FIRST)} ${pick(LAST)}`,
    dob: explicit.dob || dob(),
    sex: explicit.sex || pick(["M", "F"]),
    city: explicit.city || pick(TX_CITIES),
    state: "TX",
    memberId: `MBR-${int(100000, 999999)}`,
    ssn: "000-00-" + String(int(1000, 9999))
  };
  veterans.push(v);
  return v;
}

function addClaim({ provider, veteran, type = "837P", dos, lines, claimStatus = "Paid", paymentType = "POST" }) {
  claimSeq++;
  const billed = round2(lines.reduce((s, l) => s + l.billed, 0));
  const allowed = round2(lines.reduce((s, l) => s + l.allowed, 0));
  const paid = round2(lines.reduce((s, l) => s + l.paid, 0));
  const id = `C${String(claimSeq).padStart(5, "0")}`;
  // authorization + payment
  authSeq++; const authId = `A${String(authSeq).padStart(5, "0")}`;
  authorizations.push({ id: authId, authId: `AUTH-${int(100000, 999999)}`, veteranId: veteran.id, providerId: provider.id, service: lines[0].description, validFrom: "2025-01-01", validTo: "2025-12-31", status: "Active" });
  paySeq++; const payId = `P${String(paySeq).padStart(5, "0")}`;
  payments.push({ id: payId, paymentId: `RA-${int(1000000, 9999999)}`, claimId: id, amount: paid, date: dos, remittance835: `835-${int(100000, 999999)}` });
  const claim = {
    id, claimNumber: claimNumber(), type, providerId: provider.id, veteranId: veteran.id,
    dateOfService: dos, billedAmount: billed, allowedAmount: allowed, paidAmount: paid,
    claimStatus, paymentType, authorizationId: authId, paymentId: payId,
    diagnosisCodes: lines[0].dx ? [lines[0].dx] : [],
    lines: lines.map((l, i) => ({
      lineId: `${id}-L${i + 1}`, cpt: l.cpt, modifiers: l.modifiers || [], units: l.units || 1,
      billed: l.billed, allowed: l.allowed, paid: l.paid, description: l.description,
      violatesRuleIds: l.violatesRuleIds || []
    }))
  };
  claims.push(claim);
  return claim;
}
const cptLine = (cpt, opts = {}) => {
  const base = CPT[cpt];
  const allowed = opts.allowed ?? base.allowed;
  return { cpt, description: base.desc, units: opts.units || 1, billed: opts.billed ?? allowed, allowed, paid: opts.paid ?? allowed, modifiers: opts.modifiers || [], dx: opts.dx, violatesRuleIds: opts.violatesRuleIds || [] };
};

// ========== HERO PROVIDERS ==========
const P1 = { id: "PR001", name: "Alamo Internal Medicine Associates", npi: "1326579229", tin: "00-6820473", taxonomyCode: "207R00000X", city: "San Antonio", state: "TX", peerGroup: "internal_medicine_tx", role: "hero" };
const P2 = { id: "PR002", name: "Rio Grande Surgical Partners", npi: "1487653920", tin: "00-6820473", taxonomyCode: "208600000X", city: "San Antonio", state: "TX", peerGroup: "surgery_tx", role: "hero" };
const P3 = { id: "PR003", name: "Coastal Kidney Care", npi: "1902887434", tin: "00-2039118", taxonomyCode: "207RN0300X", city: "Corpus Christi", state: "TX", peerGroup: "nephrology_tx", role: "hero" };
[P1, P2, P3].forEach((p) => { p.taxonomyLabel = TAXONOMY[p.taxonomyCode]; providers.push(p); });

// ---- Scenario 1: Upcoding at P1 (340 visits, ~92% level-5) ----
const s1Vets = [];
for (let i = 0; i < 30; i++) s1Vets.push(addVeteran());
const robert = addVeteran({ id: "V0001", name: "Robert Hayes", sex: "M", city: "San Antonio" });
s1Vets.push(robert);
let s1Upcoded = 0, s1ExposurePost = 0;
const P1_TOTAL = 340;
for (let i = 0; i < P1_TOTAL; i++) {
  const isUp = i < 312; // 312/340 = ~92% billed at 99215
  const cpt = isUp ? "99215" : pick(["99213", "99214"]);
  const dx = pick(["I10", "E11.9", "K21.9", "Z00.00"]);
  const line = cptLine(cpt, { dx });
  if (isUp) {
    line.violatesRuleIds = ["model_em_peer"];
    const appropriate = chance(0.5) ? "99213" : "99214"; // what it should have been
    s1ExposurePost += CPT["99215"].allowed - CPT[appropriate].allowed;
    s1Upcoded++;
  }
  const v = i === 0 ? robert : pick(s1Vets);
  addClaim({ provider: P1, veteran: v, dos: i === 0 ? "2025-03-11" : randomDOS(), lines: [line] });
}
s1ExposurePost = round2(s1ExposurePost);

// ---- Scenario 2: Unbundling / modifier-59 at P2 (31 paired claims, 28 improper) ----
const s2Vets = [];
const danielle = addVeteran({ id: "V0002", name: "Danielle Cross", sex: "F", city: "San Antonio" });
s2Vets.push(danielle);
for (let i = 0; i < 5; i++) s2Vets.push(addVeteran()); // 6 shared with P1 total (danielle + 5)
// wire the 6 shared vets into P1 too (shared-patient ring signal)
s2Vets.forEach((v) => {
  addClaim({ provider: P1, veteran: v, dos: randomDOS(), lines: [cptLine("99214", { dx: "I10" })] });
  edges.push({ type: "SHARES_PATIENT_WITH", source: P1.id, target: P2.id, props: { veteranId: v.id } });
});
let s2Improper = 0, s2ExposurePost = 0;
for (let i = 0; i < 31; i++) {
  const improper = i < 28;
  const l1 = cptLine("43239", { dx: "K21.9" });
  const l2 = cptLine("43235", { dx: "K21.9", modifiers: improper ? ["59"] : [] });
  if (improper) {
    l2.violatesRuleIds = ["rule_ncci_43235_43239", "rule_mod59"];
    s2ExposurePost += CPT["43235"].allowed; // the improperly paid component
    s2Improper++;
  }
  const v = i === 0 ? danielle : pick(s2Vets);
  addClaim({ provider: P2, veteran: v, dos: i === 0 ? "2025-04-22" : randomDOS(), lines: [l1, l2] });
}
s2ExposurePost = round2(s2ExposurePost);

// ---- Scenario 3: legitimate high-frequency dialysis at P3 ----
const walter = addVeteran({ id: "V0003", name: "Walter Briggs", sex: "M", city: "Corpus Christi", dob: "1951-03-09" });
let s3ExposurePost = 0;
for (let i = 0; i < 36; i++) {
  const line = cptLine("90935", { dx: "N18.6", violatesRuleIds: ["model_freq"] });
  s3ExposurePost += CPT["90935"].allowed;
  // spread across ~90 days (Feb-Apr 2025)
  const month = 2 + Math.floor(i / 12); const day = 1 + (i % 12) * 2;
  addClaim({ provider: P3, veteran: walter, type: "837P", dos: isoDate(2025, month, Math.min(day, 28)), lines: [line] });
}
s3ExposurePost = round2(s3ExposurePost);

// ========== PEER PROVIDERS (Internal Medicine, scenario-1 comparison) ==========
const PEERS = [
  { name: "Hill Country Primary Care", npi: "1558210048", share: 0.12 },
  { name: "Bexar Family Physicians", npi: "1730264871", share: 0.16 },
  { name: "Guadalupe Medical Group", npi: "1649073322", share: 0.11 },
  { name: "Mission Trails Internists", npi: "1902114565", share: 0.15 },
  { name: "Live Oak Family Health", npi: "1265498035", share: 0.09 },
  { name: "Riverwalk Primary Care", npi: "1417802258", share: 0.18 }
];
PEERS.forEach((pd, idx) => {
  const p = { id: `PR1${String(idx).padStart(2, "0")}`, name: pd.name, npi: pd.npi, tin: makeTin(), taxonomyCode: "207R00000X", taxonomyLabel: TAXONOMY["207R00000X"], city: pick(TX_CITIES), state: "TX", peerGroup: "internal_medicine_tx", role: "peer", em99215Share: pd.share };
  providers.push(p);
  edges.push({ type: "IN_PEER_GROUP", source: p.id, target: P1.id, props: {} });
  // small sample of claims per peer to make drill-down real
  const n = int(10, 14);
  for (let i = 0; i < n; i++) {
    const cpt = chance(pd.share) ? "99215" : pick(["99212", "99213", "99214"]);
    addClaim({ provider: p, veteran: pick(veterans), dos: randomDOS(), lines: [cptLine(cpt, { dx: pick(["I10", "E11.9", "Z00.00"]) })] });
  }
});

// ========== BACKGROUND PROVIDERS ==========
const BG = [
  { id: "PR200", name: "Gulf Coast Radiology", tax: "2085R0202X", cpts: ["70551", "71046"], flagged: true },
  { id: "PR201", name: "Lone Star DME Supply", tax: "332B00000X", cpts: ["E1390"], flagged: true },
  { id: "PR202", name: "Pecos Valley Hospital", tax: "282N00000X", cpts: ["99283"], type: "837I", flagged: true },
  { id: "PR203", name: "South Texas Dental", tax: "1223G0001X", cpts: ["D0120", "D1110"], type: "837D", flagged: true },
  { id: "PR204", name: "Big Bend Cardiology", tax: "207RC0000X", cpts: ["93000", "99214"], flagged: true },
  { id: "PR205", name: "Trinity Home Health", tax: "251E00000X", cpts: ["97110"], type: "837I", flagged: true },
  { id: "PR206", name: "Concho Valley Orthopedics", tax: "208600000X", cpts: ["20610", "99214"], flagged: false },
  { id: "PR207", name: "Padre Island Pediatrics", tax: "207R00000X", cpts: ["99213", "99214"], flagged: false },
  { id: "PR208", name: "West Texas Neurology", tax: "207RC0000X", cpts: ["70551", "99214"], flagged: false }
];
BG.forEach((b) => {
  const p = { id: b.id, name: b.name, npi: makeInvalidNpi(), tin: makeTin(), taxonomyCode: b.tax, taxonomyLabel: TAXONOMY[b.tax], city: pick(TX_CITIES), state: "TX", peerGroup: b.tax, role: "background", flagged: b.flagged };
  providers.push(p);
  const n = int(8, 12);
  for (let i = 0; i < n; i++) {
    const cpt = pick(b.cpts);
    addClaim({ provider: p, veteran: pick(veterans), type: b.type || "837P", dos: randomDOS(), lines: [cptLine(cpt, { dx: pick(Object.keys(DX)) })] });
  }
});

// ========== ALLEGATIONS ==========
function addAllegation({ providerId, claimId = null, fwaType, riskScore, confidence, source, status, assignee = null, claimType = "837P", exposurePre = 0, exposurePost, submittedForRecovery = 0, verifiedRecoupment = 0, narrative = "", xai = null, decision = null, model = null, rules = [], id = null }) {
  const aid = id || String(++allgSeq);
  const a = { id: aid, providerId, claimId, fwaType, riskScore, confidence, source, status, assignee, claimType, exposurePre, exposurePost, submittedForRecovery, verifiedRecoupment, narrative, xai, decision, modelId: model, ruleIds: rules, createdDate: isoDate(2025, int(6, 10), int(1, 28)) };
  allegations.push(a);
  if (claimId) edges.push({ type: "FLAGS", source: `ALLG-${aid}`, target: claimId, props: {} });
  edges.push({ type: "HAS_ALLEGATION", source: providerId, target: `ALLG-${aid}`, props: { fwaType } });
  return a;
}
// computed P1 E/M share (consistent with final aggregates — includes ring-shared claims)
const p1Em = claims.filter((c) => c.providerId === P1.id && c.lines.some((l) => l.cpt.startsWith("9921")));
const p1Lvl5 = p1Em.filter((c) => c.lines.some((l) => l.cpt === "99215")).length;
const p1SharePct = Math.round((p1Lvl5 / p1Em.length) * 100);

// find a representative claim id for each hero
const p1Claim = claims.find((c) => c.providerId === P1.id && c.lines.some((l) => l.cpt === "99215"));
const p2Claim = claims.find((c) => c.providerId === P2.id && c.lines.some((l) => l.modifiers.includes("59")));
const p3Claim = claims.find((c) => c.providerId === P3.id);

// Hero 1
addAllegation({
  id: "20481", providerId: P1.id, claimId: p1Claim.id, fwaType: FWA.UPCODING, riskScore: 94, confidence: 88,
  source: "Pattern Recognition", status: "New", claimType: "837P", exposurePost: s1ExposurePost, model: "model_em_peer",
  narrative: "",
  xai: {
    summary: `E/M level distribution deviates 5.8σ from the Internal Medicine peer group: 99215 share ${p1SharePct}% vs peer median 14%, sustained across 11 months. Linked diagnoses show low clinical complexity. No rules fired — flagged by a composite ML/AI anomaly model.`,
    factors: [
      { label: "99215 share", value: `${p1SharePct}%`, benchmark: "peer median 14%" },
      { label: "Deviation", value: "5.8σ above peer group" },
      { label: "Claims in pattern", value: `${p1Lvl5} of ${p1Em.length}` },
      { label: "Diagnosis support", value: "Low complexity (e.g. I10)" }
    ]
  }
});
// Hero 2
addAllegation({
  id: "20517", providerId: P2.id, claimId: p2Claim.id, fwaType: FWA.UNBUNDLING, riskScore: 91, confidence: 92,
  source: "Both", status: "New", claimType: "837P", exposurePost: s2ExposurePost, model: "model_mod",
  rules: ["rule_ncci_43235_43239", "rule_mod59"], narrative: "",
  xai: {
    summary: "NCCI Procedure-to-Procedure edit: 43235 is bundled into 43239 and not separately payable in the same session. Modifier 59 applied on 28/31 paired claims to bypass the edit; documentation does not support a distinct procedural service. Override rate 90% vs peer 6%.",
    factors: [
      { label: "NCCI PTP edit", value: "43235 ↔ 43239" },
      { label: "Modifier-59 override rate", value: "90%", benchmark: "peer 6%" },
      { label: "Improper paired claims", value: `${s2Improper} of 31` },
      { label: "Shared TIN with PR001", value: "00-6820473 (ring)" }
    ]
  }
});
// Hero 3 (legitimate / to be dismissed)
addAllegation({
  id: "20463", providerId: P3.id, claimId: p3Claim.id, fwaType: FWA.FREQUENCY, riskScore: 78, confidence: 61,
  source: "Pattern Recognition", status: "Under review", assignee: "Dana Whitmore", claimType: "837P",
  exposurePost: s3ExposurePost, model: "model_freq",
  narrative: "Requested medical record. Patient has ESRD (N18.6) with standing order for thrice-weekly in-center hemodialysis.",
  xai: {
    summary: "Per-patient procedure frequency 6.2σ above norm: CPT 90935 billed 36× in 90 days for a single patient. Confidence is low — frequency alone, no corroborating anomaly. Review of the medical record indicates a standing dialysis regimen consistent with ESRD.",
    factors: [
      { label: "Frequency", value: "36 claims / 90 days" },
      { label: "Deviation", value: "6.2σ (single patient)" },
      { label: "Model confidence", value: "61% (low)" },
      { label: "Clinical context", value: "ESRD dialysis — appropriate" }
    ]
  }
});

// Background allegations (flagged BG providers + a couple more on hero providers)
const bgAllegs = [
  { id: "20390", p: "PR200", fwa: FWA.MODIFIER, risk: 83, conf: 79, src: "Pattern Recognition", status: "Assigned", who: "Maria Delgado", exp: 9240 },
  { id: "20355", p: "PR201", fwa: FWA.DUPLICATE, risk: 71, conf: 84, src: "Rules Engine", status: "Assigned", who: "Devon Carter", exp: 6010, rules: ["rule_dup"] },
  { id: "20318", p: "PR202", fwa: FWA.UPCODING, risk: 88, conf: 76, src: "Pattern Recognition", status: "New", who: null, exp: 41900, type: "837I" },
  { id: "20274", p: "PR203", fwa: FWA.OUTSIDE_SPECIALTY, risk: 64, conf: 70, src: "Pattern Recognition", status: "Under review", who: "Priya Nair", exp: 2830, type: "837D" },
  { id: "20208", p: "PR204", fwa: FWA.UNBUNDLING, risk: 80, conf: 81, src: "Both", status: "Assigned", who: "Dana Whitmore", exp: 7450, rules: ["rule_ncci_43235_43239"] },
  { id: "20155", p: "PR205", fwa: FWA.PHANTOM, risk: 90, conf: 69, src: "Pattern Recognition", status: "New", who: null, exp: 18300, type: "837I" },
  { id: "20092", p: "PR001", fwa: FWA.DECEASED, risk: 96, conf: 74, src: "Rules Engine", status: "New", who: null, exp: 540 },
  { id: "20061", p: "PR002", fwa: FWA.AUTH_MISMATCH, risk: 68, conf: 83, src: "Rules Engine", status: "Assigned", who: "Maria Delgado", exp: 3900, rules: ["rule_auth"] },
  { id: "20033", p: "PR003", fwa: FWA.MODIFIER, risk: 52, conf: 66, src: "Pattern Recognition", status: "Recommended close", who: "Devon Carter", exp: 1210 }
];
bgAllegs.forEach((b) => addAllegation({
  id: b.id, providerId: b.p, fwaType: b.fwa, riskScore: b.risk, confidence: b.conf, source: b.src,
  status: b.status, assignee: b.who, claimType: b.type || "837P", exposurePost: b.exp, rules: b.rules || [],
  xai: { summary: `${b.fwa} flagged for review. Estimated post-payment exposure $${b.exp.toLocaleString()}.`, factors: [] }
}));
// a few more generic ones to fill the queue to 24
const genProviders = ["PR200", "PR204", "PR205", "PR206", "PR207", "PR208"];
while (allegations.length < 24) {
  const p = pick(genProviders);
  const fwa = pick(Object.values(FWA));
  addAllegation({ providerId: p, fwaType: fwa, riskScore: int(40, 79), confidence: int(60, 90), source: pick(["Pattern Recognition", "Rules Engine"]), status: pick(["New", "Assigned", "Under review"]), assignee: chance(0.5) ? pick(ANALYSTS) : null, exposurePost: int(800, 12000), xai: { summary: `${fwa} flagged for review.`, factors: [] } });
}

// ========== RING EDGES ==========
edges.push({ type: "SHARES_TIN", source: P1.id, target: P2.id, props: { tin: "00-6820473" } });
for (let i = 0; i < 9; i++) edges.push({ type: "REFERRED_TO", source: P1.id, target: P2.id, props: {} });

// ========== provider aggregates ==========
providers.forEach((p) => {
  const pClaims = claims.filter((c) => c.providerId === p.id);
  const emClaims = pClaims.filter((c) => c.lines.some((l) => l.cpt.startsWith("9921")));
  const lvl5 = emClaims.filter((c) => c.lines.some((l) => l.cpt === "99215")).length;
  p.claimCount = pClaims.length;
  p.totalPaid = round2(pClaims.reduce((s, c) => s + c.paidAmount, 0));
  if (emClaims.length) p.em99215ShareComputed = round2(lvl5 / emClaims.length);
  const pAllegs = allegations.filter((a) => a.providerId === p.id);
  p.openAllegations = pAllegs.length;
  p.riskScore = pAllegs.length ? Math.max(...pAllegs.map((a) => a.riskScore)) : 0;
});

// ========== graph nodes (curated for the network view) ==========
const graphNodes = [];
providers.forEach((p) => graphNodes.push({ id: p.id, type: "Provider", label: p.name, props: { npi: p.npi, tin: p.tin, specialty: p.taxonomyLabel, risk: p.riskScore, role: p.role } }));
// include key veterans (shared ring + dialysis)
[robert, danielle, walter, ...s2Vets].forEach((v) => {
  if (!graphNodes.find((n) => n.id === v.id)) graphNodes.push({ id: v.id, type: "Veteran", label: v.name, props: { city: v.city } });
});
allegations.forEach((a) => graphNodes.push({ id: `ALLG-${a.id}`, type: "Allegation", label: `${a.fwaType} (${a.riskScore})`, props: { fwaType: a.fwaType, risk: a.riskScore, status: a.status } }));
// veteran<->provider edges for graph (shared ring + dialysis)
s2Vets.forEach((v) => { edges.push({ type: "TREATED_BY", source: v.id, target: P1.id, props: {} }); edges.push({ type: "TREATED_BY", source: v.id, target: P2.id, props: {} }); });
edges.push({ type: "TREATED_BY", source: walter.id, target: P3.id, props: { claims: 36 } });

// ========== KPIs ==========
const openAllegs = allegations.length;
const totalExposurePost = round2(allegations.reduce((s, a) => s + (a.exposurePost || 0), 0));
const kpis = {
  openAllegations: openAllegs,
  closedAllegations: 8734,
  exposurePre: 514902.40,
  exposurePost: totalExposurePost,
  submittedForRecovery: 4126540.00,
  verifiedRecoupment: 168430.00,
  mostAgedAllegationId: "20044",
  mostAgedDate: "2025-04-30",
  avgTimeToCompletionDays: 71
};
const anomalyBreakdown = {};
allegations.forEach((a) => { anomalyBreakdown[a.fwaType] = (anomalyBreakdown[a.fwaType] || 0) + 1; });

// ========== precedents (historical adjudicated cases, for "similar cases") ==========
// Synthetic closed cases the reviewer can consult for precedent. Grouped by FWA type.
const PRECEDENTS = [
  { id: "19842", fwaType: FWA.UPCODING, provider: "Trinity Valley Clinic", specialty: "Internal Medicine", exposure: 18400, outcome: "Confirmed", recovered: 15200, adjudicatedDate: "2025-01-14", analyst: "Maria Delgado", note: "E/M level inflation confirmed; provider education + partial recovery." },
  { id: "19765", fwaType: FWA.UPCODING, provider: "Brazos Family Care", specialty: "Family Medicine", exposure: 9100, outcome: "Dismissed", recovered: 0, adjudicatedDate: "2024-12-03", analyst: "Devon Carter", note: "Documentation supported higher-complexity visits; no overpayment." },
  { id: "19710", fwaType: FWA.UNBUNDLING, provider: "Gulf Surgical Center", specialty: "Surgery", exposure: 12600, outcome: "Confirmed", recovered: 12600, adjudicatedDate: "2025-02-02", analyst: "Priya Nair", note: "NCCI PTP violation with modifier 59; full recovery." },
  { id: "19688", fwaType: FWA.UNBUNDLING, provider: "Coastal Endoscopy Assoc.", specialty: "Gastroenterology", exposure: 5400, outcome: "Confirmed", recovered: 4800, adjudicatedDate: "2024-11-21", analyst: "Maria Delgado", note: "Component billing of a comprehensive code; partial recovery after appeal." },
  { id: "19655", fwaType: FWA.FREQUENCY, provider: "Rio Dialysis Partners", specialty: "Nephrology", exposure: 3300, outcome: "Dismissed", recovered: 0, adjudicatedDate: "2025-01-28", analyst: "Devon Carter", note: "ESRD dialysis regimen; thrice-weekly frequency clinically appropriate." },
  { id: "19640", fwaType: FWA.FREQUENCY, provider: "Permian Imaging", specialty: "Radiology", exposure: 7700, outcome: "Confirmed", recovered: 6900, adjudicatedDate: "2024-10-30", analyst: "Priya Nair", note: "Excessive repeat imaging without documented indication." },
  { id: "19602", fwaType: FWA.MODIFIER, provider: "Hill Country Orthopedics", specialty: "Orthopedics", exposure: 6100, outcome: "Confirmed", recovered: 5200, adjudicatedDate: "2025-01-09", analyst: "Maria Delgado", note: "Modifier 25 misuse on E/M billed with a procedure." },
  { id: "19588", fwaType: FWA.DUPLICATE, provider: "Sabine DME Services", specialty: "Durable Medical Equipment", exposure: 4200, outcome: "Confirmed", recovered: 4200, adjudicatedDate: "2024-12-19", analyst: "Devon Carter", note: "Exact duplicate resubmission; recovered." },
  { id: "19571", fwaType: FWA.DECEASED, provider: "Guadalupe Home Health", specialty: "Home Health", exposure: 2600, outcome: "Confirmed", recovered: 2600, adjudicatedDate: "2024-11-05", analyst: "Priya Nair", note: "Services billed after date of death; recovered and referred." },
  { id: "19560", fwaType: FWA.PHANTOM, provider: "Chisholm Therapy Group", specialty: "Physical Therapy", exposure: 14800, outcome: "Confirmed", recovered: 11200, adjudicatedDate: "2025-02-11", analyst: "Maria Delgado", note: "Services not rendered; referred to OIG." },
  { id: "19544", fwaType: FWA.OUTSIDE_SPECIALTY, provider: "South Plains Dental", specialty: "Dental", exposure: 1900, outcome: "Dismissed", recovered: 0, adjudicatedDate: "2024-12-08", analyst: "Devon Carter", note: "Provider dual-credentialed; billing appropriate." },
  { id: "19531", fwaType: FWA.AUTH_MISMATCH, provider: "Nueces Surgical", specialty: "Surgery", exposure: 5600, outcome: "Confirmed", recovered: 5600, adjudicatedDate: "2025-01-22", analyst: "Priya Nair", note: "Service exceeded authorized referral scope." }
];

// ========== monthly trends (temporal analysis) ==========
const TRENDS = [
  { month: "2024-08", flagged: 21, exposure: 148300, recovered: 41200 },
  { month: "2024-09", flagged: 26, exposure: 176800, recovered: 52600 },
  { month: "2024-10", flagged: 19, exposure: 131500, recovered: 47800 },
  { month: "2024-11", flagged: 31, exposure: 212400, recovered: 63900 },
  { month: "2024-12", flagged: 28, exposure: 198700, recovered: 58100 },
  { month: "2025-01", flagged: 34, exposure: 241900, recovered: 71500 },
  { month: "2025-02", flagged: 30, exposure: 219600, recovered: 66200 },
  { month: "2025-03", flagged: 24, exposure: totalExposurePostForTrend(), recovered: 39400 }
];
function totalExposurePostForTrend() { return round2(allegations.reduce((s, a) => s + (a.exposurePost || 0), 0)); }

// ========== seed a couple of pre-existing investigations (escalated) ==========
["20155", "20092"].forEach((id) => { var a = allegations.find((x) => x.id === id); if (a) a.status = "Escalated"; });

// ========== assemble + write ==========
const dataset = {
  meta: {
    generator: "generate-data.mjs", seed: SEED,
    disclaimer: "Synthetic data — for demonstration only. Not real Veterans, providers, or claims.",
    riskScale: "0-100 (High >= 80, Medium 50-79, Low < 50)",
    notes: "NPIs deliberately fail the NPI check digit; TINs use the 00- prefix. Amounts are illustrative CMS-allowed proxies.",
    counts: {}
  },
  providers, veterans, claims, authorizations, payments, rules: RULES, models: MODELS, allegations,
  precedents: PRECEDENTS,
  trends: TRENDS,
  peerBenchmarks: { internal_medicine_em: { median99215Share: 0.14, peerCount: PEERS.length } },
  kpis, anomalyBreakdown,
  graph: { nodes: graphNodes, edges }
};
dataset.meta.counts = {
  providers: providers.length, veterans: veterans.length, claims: claims.length,
  allegations: allegations.length, edges: edges.length, graphNodes: graphNodes.length
};

// sanity checks
const badNpi = providers.filter((p) => isValidNpi(p.npi));
if (badNpi.length) throw new Error("Some NPIs are VALID (must be invalid): " + badNpi.map((p) => p.npi).join(","));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(dataset, null, 2));

// Also emit a browser global so the static site opens with no server (file://):
// assets/data.js -> window.PIVOT_DATA = {...}
const JS_OUT = resolve(__dirname, "../assets/data.js");
mkdirSync(dirname(JS_OUT), { recursive: true });
writeFileSync(JS_OUT, "/* Auto-generated by generate-data.mjs — do not edit. */\nwindow.PIVOT_DATA = " + JSON.stringify(dataset) + ";\n");

console.log("PIVOT dataset written to", OUT, "and", JS_OUT);
console.log("counts:", dataset.meta.counts);
console.log("hero exposures — S1 upcoding: $%s | S2 unbundling: $%s | S3 dialysis(flagged): $%s",
  s1ExposurePost.toLocaleString(), s2ExposurePost.toLocaleString(), s3ExposurePost.toLocaleString());
console.log("P1 computed 99215 share:", providers.find((p) => p.id === "PR001").em99215ShareComputed);
console.log("all NPIs invalid-by-construction:", badNpi.length === 0);
console.log("anomaly breakdown:", anomalyBreakdown);
