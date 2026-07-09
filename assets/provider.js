/* DataProvider — the swappable seam. Reads window.PIVOT_DATA (build-time snapshot).
   Later: a Neo4jProvider returning the same shapes. Attaches to window.DP. */
(function () {
  var D = window.PIVOT_DATA;
  var idx = function (arr) { var o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; };
  var providers = idx(D.providers), claims = idx(D.claims), veterans = idx(D.veterans),
      rules = idx(D.rules), models = idx(D.models);

  function band(r) { return r >= 80 ? "high" : r >= 50 ? "med" : "low"; }
  // Lead source taxonomy — answers "leads aren't all data-driven; some are manual."
  // data-mining · rules · ML/AI (automated) + hotline/tip · referral · OIG · email · phone (manual).
  var SOURCES = ["ML/AI", "Rules", "Data mining", "Hotline / tip", "Referral", "OIG", "Email", "Phone / call"];
  function sourceOf(a) {
    if (!a) return "ML/AI";
    if (a.sourceType) return a.sourceType;              // explicit (manual / created leads)
    if (a.source === "Rules Engine") return "Rules";
    return "ML/AI";                                     // Pattern Recognition / Both → ML/AI-driven
  }

  // Lead → Case model (Patel's definition): a flagged item is a LEAD; once it is
  // reviewed & CONFIRMED (or escalated) it turns into / joins the provider's CASE.
  // Multiple confirmed leads on one provider roll into one case. Dismissed leads
  // never open a case; still-open leads only "feed in" until they're confirmed.
  var CASE_STATUS = { "Pending review": 1, "Confirmed": 1, "Escalated": 1 };
  var CLOSED_STATUS = { "Dismissed": 1, "Cleared to pay": 1, "Denied": 1 };
  function isCaseLead(a) {
    if (CASE_STATUS[a.status]) return true;
    var dec = window.APP && window.APP.state && window.APP.state.decisions && window.APP.state.decisions[a.id];
    return !!(dec && (dec.outcome === "confirm" || dec.outcome === "escalate"));
  }
  function usd(n) { return "$" + Math.round(n).toLocaleString(); }
  function usdShort(n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + Math.round(n).toLocaleString();
  }

  window.DP = {
    raw: D,
    meta: D.meta,
    disclaimer: D.meta.disclaimer,
    band: band, usd: usd, usdShort: usdShort,
    SOURCES: SOURCES, sourceOf: sourceOf,
    getKpis: function () { return D.kpis; },
    getAnomalyBreakdown: function () { return D.anomalyBreakdown; },
    getGraph: function () { return D.graph; },
    getPeerBenchmark: function (k) { return D.peerBenchmarks[k]; },
    getProvider: function (id) { return providers[id] || null; },
    getClaim: function (id) { return claims[id] || null; },
    getVeteran: function (id) { return veterans[id] || null; },
    listProviders: function () { return D.providers; },
    listPeers: function () { return D.providers.filter(function (p) { return p.role === "peer"; }); },

    // Historical adjudicated cases of the same FWA type, for reviewer precedent.
    getSimilarAdjudicated: function (fwaType, limit) {
      var rows = (D.precedents || []).filter(function (p) { return p.fwaType === fwaType; })
        .sort(function (a, b) { return a.adjudicatedDate < b.adjudicatedDate ? 1 : -1; });
      return typeof limit === "number" ? rows.slice(0, limit) : rows;
    },

    getAllegation: function (id) {
      var a = D.allegations.find(function (x) { return x.id === id; });
      if (!a) return null;
      var provider = providers[a.providerId] || null;
      var claim = a.claimId ? claims[a.claimId] : null;
      var veteran = claim ? veterans[claim.veteranId] : null;
      return Object.assign({}, a, {
        provider: provider, claim: claim, veteran: veteran,
        model: a.modelId ? models[a.modelId] : null,
        rules: (a.ruleIds || []).map(function (rid) { return rules[rid]; }).filter(Boolean)
      });
    },

    listAllegations: function (f) {
      f = f || {};
      var rows = D.allegations.map(function (a) {
        var p = providers[a.providerId];
        return {
          id: a.id, fwaType: a.fwaType, riskScore: a.riskScore, confidence: a.confidence,
          source: a.source, sourceType: sourceOf(a), status: a.status, assignee: a.assignee, claimType: a.claimType,
          exposurePost: a.exposurePost, exposurePre: a.exposurePre, createdDate: a.createdDate, providerId: a.providerId,
          mode: a.mode || "retrospective", recommendedAction: a.recommendedAction, manual: !!a.manual,
          providerName: p ? p.name : "—", providerNpi: p ? p.npi : "", providerState: p ? p.state : "",
          hero: ["20481", "20517", "20463"].indexOf(a.id) >= 0 ? 1 : 0
        };
      });
      // default to the retrospective (post-payment) population; "prepay" or "all" opt in.
      var mode = f.mode || "retrospective";
      if (mode !== "all") rows = rows.filter(function (r) { return r.mode === mode; });
      if (f.fwaType) rows = rows.filter(function (r) { return r.fwaType === f.fwaType; });
      if (f.status) rows = rows.filter(function (r) { return r.status === f.status; });
      if (f.source) rows = rows.filter(function (r) { return r.sourceType === f.source; });
      if (typeof f.minRisk === "number") rows = rows.filter(function (r) { return r.riskScore >= f.minRisk; });
      if (f.query) {
        var q = f.query.toLowerCase();
        rows = rows.filter(function (r) { return [r.providerName, r.fwaType, r.providerNpi, r.id].join(" ").toLowerCase().indexOf(q) >= 0; });
      }
      rows.sort(function (a, b) { return b.riskScore - a.riskScore; });
      return rows;
    },

    getTrends: function () { return D.trends || []; },
    getRules: function () { return D.rules; },
    getModels: function () { return D.models; },
    getPrecedent: function (pid) { return (D.precedents || []).find(function (p) { return p.id === pid; }) || null; },
    // ---- business entities (TrackLight-style): providers grouped by a shared
    // business registration (holding company) or a shared TIN (one billing entity). ----
    listBusinesses: function (opts) {
      opts = opts || {};
      var groups = {};
      D.providers.forEach(function (p) {
        var key = p.registrationId || p.tin;
        var g = groups[key] || (groups[key] = { id: key, providers: [], regName: p.registration || null, officer: p.officer || null, tin: p.tin });
        g.providers.push(p);
      });
      return Object.keys(groups).map(function (k) { return groups[k]; })
        .filter(function (g) { return opts.all ? true : g.providers.length >= 2; })
        .map(function (g) {
          var provs = g.providers;
          var allegs = []; provs.forEach(function (p) { D.allegations.forEach(function (a) { if (a.providerId === p.id && (a.mode || "retrospective") === "retrospective") allegs.push(a); }); });
          return {
            id: g.id, name: g.regName || ("Billing entity · TIN " + g.tin),
            kind: g.regName ? "Holding company" : "Shared-TIN billing entity",
            officer: g.officer, registrationId: g.regName ? g.id : null, tin: g.regName ? provs[0].tin : g.tin,
            sharedTin: !g.regName, providers: provs, providerCount: provs.length,
            states: provs.map(function (p) { return p.state; }).filter(function (s, i, a) { return s && a.indexOf(s) === i; }),
            totalPaid: provs.reduce(function (s, p) { return s + (p.totalPaid || 0); }, 0),
            flaggedExposure: allegs.reduce(function (s, a) { return s + (a.exposurePost || 0); }, 0),
            openAllegations: allegs.length,
            riskScore: Math.max.apply(null, provs.map(function (p) { return p.riskScore || 0; }).concat([0]))
          };
        }).sort(function (a, b) { return b.flaggedExposure - a.flaggedExposure; });
    },
    getBusiness: function (id) { return this.listBusinesses({ all: true }).find(function (b) { return b.id === id; }) || null; },

    listClaimsByProvider: function (providerId) { return D.claims.filter(function (c) { return c.providerId === providerId; }); },
    listAllegationsByProvider: function (providerId, mode) { return D.allegations.filter(function (a) { return a.providerId === providerId && (mode === "all" || (a.mode || "retrospective") === (mode || "retrospective")); }); },
    listInvestigations: function () { return D.allegations.filter(function (a) { return a.status === "Escalated"; }); },
    isCaseLead: isCaseLead,

    // ---- Cases (provider-level) ----------------------------------------------
    // A Case exists for a provider ONLY once ≥1 of its leads is reviewed & confirmed
    // (or escalated). It aggregates that provider's confirmed leads; the provider's
    // still-open leads "feed in" (they join the case if/when confirmed). `listCases`
    // = one row per provider that HAS a case; `getCase` = that provider (or a shell
    // with leadCount 0 if no case yet). Internal keys stay "allegation".
    listCases: function (opts) {
      opts = opts || {};
      var mode = opts.mode || "retrospective";
      var byProv = {};
      D.allegations.forEach(function (a) {
        if (mode !== "all" && (a.mode || "retrospective") !== mode) return;
        (byProv[a.providerId] = byProv[a.providerId] || []).push(a);
      });
      var exposureKey = mode === "prepay" ? "exposurePre" : "exposurePost";
      var closedOf = function (pid) { return !!(window.APP && window.APP.isCaseClosed && window.APP.isCaseClosed(pid)); };
      // one cell per provider that has leads
      var cells = Object.keys(byProv).map(function (pid) {
        var all = byProv[pid].slice().sort(function (a, b) { return b.riskScore - a.riskScore; });
        return {
          pid: pid, p: providers[pid] || {},
          caseLeads: all.filter(isCaseLead),
          openLeads: all.filter(function (a) { return !isCaseLead(a) && !CLOSED_STATUS[a.status]; })
        };
      });
      // A Case usually maps to ONE provider. Providers that share a business
      // registration (holding company) or a TIN (billing ring) roll up into a SINGLE
      // multi-provider case; everyone else keeps their own one-provider case.
      var ringKey = function (p) {
        if (p.registrationId) return "reg:" + p.registrationId;
        var sharedTin = p.tin && D.providers.filter(function (x) { return x.tin === p.tin; }).length > 1;
        return sharedTin ? "tin:" + p.tin : "solo:" + p.id;
      };
      var provRisk = function (c) { return Math.max.apply(null, c.caseLeads.map(function (a) { return a.riskScore || 0; }).concat([c.p.riskScore || 0, 0])); };
      var groups = {};
      cells.forEach(function (c) { (groups[ringKey(c.p)] = groups[ringKey(c.p)] || []).push(c); });
      return Object.keys(groups).map(function (k) {
        var members = groups[k].slice().sort(function (a, b) { return provRisk(b) - provRisk(a); });
        var primary = members[0].p;
        var caseLeads = [], openLeads = [];
        members.forEach(function (m) { caseLeads = caseLeads.concat(m.caseLeads); openLeads = openLeads.concat(m.openLeads); });
        var escalated = caseLeads.some(function (a) { return a.status === "Escalated"; });
        var closed = members.some(function (m) { return closedOf(m.pid); });
        return {
          providerId: primary.id, provider: primary, name: primary.name || "—", npi: primary.npi || "", state: primary.state || "",
          providerIds: members.map(function (m) { return m.pid; }), providers: members.map(function (m) { return m.p; }),
          multiProvider: members.length > 1, providerCount: members.length,
          leads: caseLeads, caseLeads: caseLeads, openLeads: openLeads,
          leadCount: caseLeads.length, openCount: openLeads.length,
          exposure: caseLeads.reduce(function (s, a) { return s + (a[exposureKey] || 0); }, 0),
          riskScore: Math.max.apply(null, caseLeads.map(function (a) { return a.riskScore || 0; }).concat([0])),
          fwaTypes: caseLeads.map(function (a) { return a.fwaType; }).filter(function (t, i, arr) { return t && arr.indexOf(t) === i; }),
          assignee: (caseLeads.find(function (a) { return a.assignee; }) || {}).assignee || null,
          escalated: escalated, closed: closed,
          status: closed ? "Closed" : escalated ? "Under investigation" : "Open case"
        };
      }).filter(function (c) { return opts.all ? true : c.leadCount > 0; })
        .sort(function (a, b) { return b.exposure - a.exposure; });
    },
    getCase: function (providerId, mode) { return this.listCases({ all: true, mode: mode || "all" }).find(function (c) { return c.providerId === providerId || (c.providerIds && c.providerIds.indexOf(providerId) >= 0); }) || null; },

    // ---- TrackLight-style secondary scoring / external enrichment --------------
    // Synthetic external-data profile (business registry + individual/officer OSINT)
    // used to corroborate a claims-based flag with outside signals. Deterministic
    // per provider. Seam: a real feed can populate p.secondaryProfile to override.
    getSecondaryProfile: function (id) {
      var p = providers[id]; if (!p) return null;
      if (p.secondaryProfile) return p.secondaryProfile;
      var seed = 0; for (var i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
      var rnd = function () { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
      var money = function (min, max) { return Math.round((min + rnd() * (max - min)) / 1000) * 1000; };
      var chain = p.role === "chain";
      var ring = D.providers.filter(function (x) { return x.tin === p.tin; }).length > 1;
      var tier = chain ? "chain" : ring ? "ring" : (p.riskScore || 0) >= 78 ? "risky" : "clean";
      var base = { chain: { regs: 3, liens: 2, judg: 1, bank: 1, dock: 2, score: 88 }, ring: { regs: 2, liens: 1, judg: 1, bank: 0, dock: 1, score: 73 }, risky: { regs: 1, liens: 1, judg: 0, bank: 0, dock: 1, score: 61 }, clean: { regs: 0, liens: 0, judg: 0, bank: 0, dock: 0, score: 24 } }[tier];
      var bizOsint = [];
      if (chain) { bizOsint.push("Registered agent shared with 3 affiliated facilities"); bizOsint.push("Principal address is a commercial mail-drop (CMRA)"); }
      else if (ring) { bizOsint.push("Suite # matches an unrelated billing company at the same address"); }
      else if (tier === "risky") { bizOsint.push("No active web presence; listed phone disconnected"); }
      else { bizOsint.push("No adverse business records found"); }
      var offOsint = [];
      if (p.officer) {
        if (chain) { offOsint.push("Named on " + base.regs + " other active registrations (Enformion)"); offOsint.push("Linked to a dissolved behavioral-health entity (2019)"); }
        else if (ring) { offOsint.push("Associated with the partner provider on state filings"); }
        offOsint.push("No SSA Death Master File match");
      }
      return {
        tier: tier, score: Math.min(99, base.score + Math.floor(rnd() * 8)),
        business: {
          name: p.registration || ("Billing entity · TIN " + p.tin),
          registryStatus: tier === "risky" ? "Delinquent" : "Active",
          state: p.state || "—",
          incorporated: (2011 + Math.floor(rnd() * 11)) + "-" + String(1 + Math.floor(rnd() * 9)).padStart(2, "0"),
          entityNo: (p.state || "US") + "-" + (1000000 + Math.floor(rnd() * 8999999)),
          openCorporatesRelated: base.regs,
          liens: base.liens, lienAmount: base.liens ? money(8000, 90000) : 0,
          judgments: base.judg, judgmentAmount: base.judg ? money(5000, 120000) : 0,
          bankruptcies: base.bank,
          courtDockets: base.dock,
          osint: bizOsint
        },
        officer: p.officer ? {
          name: p.officer,
          lexisConfidence: 82 + Math.floor(rnd() * 17),
          addresses: 2 + Math.floor(rnd() * 4),
          enformionBusinesses: base.regs + 1 + Math.floor(rnd() * 2),
          relatives: 2 + Math.floor(rnd() * 5),
          licenseStatus: chain ? "Active — 3 states" : "Active",
          ssdiMatch: false,
          osint: offOsint
        } : null
      };
    },

    // ---- provider report card (radar spokes + drill-down) ----
    getGroups: function () { var p = D.providers.find(function (x) { return x.groupScores; }); return p ? p.groupScores.map(function (g) { return g.group; }) : []; },
    getReportCard: function (id) { var p = providers[id]; return p ? { groups: p.groupScores || [], attributes: p.groupAttributes || {} } : null; },
    // Providers ranked by a single group's score (outlier comparison / ranking).
    rankByGroup: function (group) {
      return D.providers.filter(function (p) { return p.groupScores; })
        .map(function (p) { var gs = p.groupScores.find(function (g) { return g.group === group; }); return { id: p.id, name: p.name, specialty: p.taxonomyLabel, role: p.role, score: gs ? gs.score : 0, peer: gs ? gs.peer : 0, outlier: gs ? gs.outlier : false }; })
        .sort(function (a, b) { return b.score - a.score; });
    },

    // ---- collusion network: providers connected to `id` by shared identifiers ----
    // Traverses SHARES_TIN / SHARES_OFFICER / SHARES_REGISTRATION / REFERRED_TO /
    // SHARES_PATIENT_WITH (provider↔provider) plus TREATED_BY (veteran→provider).
    getCollusionNetwork: function (id) {
      var provEdge = { SHARES_TIN: 1, SHARES_OFFICER: 1, SHARES_REGISTRATION: 1, REFERRED_TO: 1, SHARES_PATIENT_WITH: 1 };
      var E = D.graph.edges, adj = {};
      E.forEach(function (e) {
        if (provEdge[e.type] && providers[e.source] && providers[e.target]) {
          (adj[e.source] = adj[e.source] || []).push(e.target);
          (adj[e.target] = adj[e.target] || []).push(e.source);
        }
      });
      var seen = {}, queue = [id]; seen[id] = 1;
      while (queue.length) { var cur = queue.shift(); (adj[cur] || []).forEach(function (n) { if (!seen[n]) { seen[n] = 1; queue.push(n); } }); }
      var provIds = Object.keys(seen);
      var links = E.filter(function (e) { return provEdge[e.type] && seen[e.source] && seen[e.target]; });
      var vetLinks = E.filter(function (e) { return e.type === "TREATED_BY" && seen[e.target] && veterans[e.source]; });
      var vetSeen = {}; vetLinks.forEach(function (e) { vetSeen[e.source] = 1; });
      return {
        providers: provIds.map(function (x) { return providers[x]; }),
        links: links,
        veterans: Object.keys(vetSeen).map(function (x) { return veterans[x]; }),
        vetLinks: vetLinks,
        isRing: provIds.length > 1
      };
    }
  };
})();
