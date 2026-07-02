/* Analyst Copilot — deterministic Gen AI chat */
(function () {
  window.Views = window.Views || {};
  var SUGGEST = ["Summarize this provider's risk", "How does it compare to peers?", "What's the recommended action?", "Draft a rationale", "What's the exposure?"];

  window.Views.copilot = {
    render: function (mount) {
      var heroes = ["20481", "20517", "20463"].map(function (id) { return window.DP.getAllegation(id); });
      var ctxId = window.APP.state.copilotCtx || "20481";

      mount.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><div><div class="page-title">Analyst copilot</div><div class="page-sub">Ask about a flagged case — grounded in its claim, rules and network context</div></div>' +
        '<select id="cp-ctx" class="input" style="width:auto">' + heroes.map(function (a) { return '<option value="' + a.id + '"' + (a.id === ctxId ? ' selected' : '') + '>#' + a.id + ' · ' + a.fwaType + ' · ' + a.provider.name + '</option>'; }).join("") + '</select></div>' +
        '<div class="card"><div class="chat" id="cp-chat"></div>' +
        '<div class="suggest" id="cp-suggest">' + SUGGEST.map(function (s) { return '<button class="btn">' + s + '</button>'; }).join("") + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px"><input id="cp-input" class="input" placeholder="Ask the copilot…"><button class="btn primary" id="cp-send"><i class="ti ti-send"></i></button></div>' +
        '<div style="font-size:10.5px;color:var(--text3);margin-top:6px"><i class="ti ti-sparkles"></i> Responses are demonstration-scripted and grounded in the case data.</div></div></div>';

      var chat = document.getElementById("cp-chat");
      function ctx() { return window.DP.getAllegation(document.getElementById("cp-ctx").value); }
      function greet() {
        chat.innerHTML = "";
        addAI("I'm focused on allegation #" + ctx().id + " — " + ctx().fwaType.toLowerCase() + " at " + ctx().provider.name + ". Ask me to summarize the risk, compare to peers, recommend an action, or draft a rationale.");
      }
      function addUser(t) { var d = document.createElement("div"); d.className = "msg user"; d.textContent = t; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; }
      function addAI(t, stream) {
        var d = document.createElement("div"); d.className = "msg ai"; chat.appendChild(d);
        if (stream) window.AI.stream(d, t, function () { chat.scrollTop = chat.scrollHeight; }); else d.textContent = t;
        chat.scrollTop = chat.scrollHeight;
      }
      function ask(q) {
        if (!q) return;
        addUser(q);
        window.APP.auditLog("COPILOT_QUERY", "#" + ctx().id + " · " + q);
        setTimeout(function () { addAI(window.AI.copilot(ctx(), q), true); }, 220);
      }
      document.getElementById("cp-ctx").addEventListener("change", greet);
      document.getElementById("cp-suggest").querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { ask(b.textContent); }); });
      document.getElementById("cp-send").addEventListener("click", function () { var i = document.getElementById("cp-input"); ask(i.value.trim()); i.value = ""; });
      document.getElementById("cp-input").addEventListener("keydown", function (e) { if (e.key === "Enter") { ask(this.value.trim()); this.value = ""; } });
      greet();
    }
  };
})();
