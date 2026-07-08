/* DataProvider — the swappable seam. Reads window.PIVOT_DATA (build-time snapshot).
   Later: a Neo4jProvider returning the same shapes. Attaches to window.DP. */
(function () {
  var D = window.PIVOT_DATA;
  var idx = function (arr) { var o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; };
  var providers = idx(D.providers), claims = idx(D.claims), veterans = idx(D.veterans),
      rules = idx(D.rules), models = idx(D.models);

  function band(r) { return r >= 80 ? "high" : r >= 50 ? "med" : "low"; }
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
          source: a.source, status: a.status, assignee: a.assignee, claimType: a.claimType,
          exposurePost: a.exposurePost, exposurePre: a.exposurePre, createdDate: a.createdDate, providerId: a.providerId,
          mode: a.mode || "retrospective", recommendedAction: a.recommendedAction,
          providerName: p ? p.name : "—", providerNpi: p ? p.npi : "", providerState: p ? p.state : "",
          hero: ["20481", "20517", "20463"].indexOf(a.id) >= 0 ? 1 : 0
        };
      });
      // default to the retrospective (post-payment) population; "prepay" or "all" opt in.
      var mode = f.mode || "retrospective";
      if (mode !== "all") rows = rows.filter(function (r) { return r.mode === mode; });
      if (f.fwaType) rows = rows.filter(function (r) { return r.fwaType === f.fwaType; });
      if (f.status) rows = rows.filter(function (r) { return r.status === f.status; });
      if (f.source) rows = rows.filter(function (r) { return r.source === f.source; });
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

    // ---- Cases (provider-level) ----------------------------------------------
    // A Case is provider-level: one open case per provider, aggregating ALL that
    // provider's Leads (flagged claims). New leads auto-attach to the provider's
    // case. `listCases` = one row per provider with leads; `getCase` = one provider.
    // NOTE: internal keys stay "allegation"; "Lead" is the user-facing name only.
    listCases: function (opts) {
      opts = opts || {};
      var mode = opts.mode || "retrospective";
      var terminal = { "Dismissed": 1, "Confirmed": 1, "Cleared to pay": 1, "Denied": 1 };
      var byProv = {};
      D.allegations.forEach(function (a) {
        if (mode !== "all" && (a.mode || "retrospective") !== mode) return;
        (byProv[a.providerId] = byProv[a.providerId] || []).push(a);
      });
      var exposureKey = mode === "prepay" ? "exposurePre" : "exposurePost";
      return Object.keys(byProv).map(function (pid) {
        var leads = byProv[pid].slice().sort(function (a, b) { return b.riskScore - a.riskScore; });
        var p = providers[pid] || {};
        var open = leads.filter(function (a) { return !terminal[a.status]; });
        var escalated = leads.some(function (a) { return a.status === "Escalated"; });
        return {
          providerId: pid, provider: p, name: p.name || "—", npi: p.npi || "", state: p.state || "",
          leads: leads, leadCount: leads.length, openCount: open.length,
          exposure: leads.reduce(function (s, a) { return s + (a[exposureKey] || 0); }, 0),
          riskScore: Math.max.apply(null, leads.map(function (a) { return a.riskScore || 0; }).concat([p.riskScore || 0])),
          fwaTypes: leads.map(function (a) { return a.fwaType; }).filter(function (t, i, arr) { return t && arr.indexOf(t) === i; }),
          assignee: (leads.find(function (a) { return a.assignee; }) || {}).assignee || null,
          escalated: escalated,
          status: open.length ? (escalated ? "Under investigation" : "Open") : "Closed"
        };
      }).filter(function (c) { return opts.all ? true : c.leadCount > 0; })
        .sort(function (a, b) { return b.exposure - a.exposure; });
    },
    getCase: function (providerId, mode) { return this.listCases({ all: true, mode: mode || "all" }).find(function (c) { return c.providerId === providerId; }) || null; },

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
