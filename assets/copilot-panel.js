/* Copilot — floating slide-over assistant, available on every screen.
   Scopes to the current claim when you're viewing one, else a default hero case. */
(function () {
  var SUGGEST = ["Summarize this provider's risk", "How does it compare to peers?", "What's the recommended action?", "Draft a rationale"];
  var open = false;

  function ctx() {
    var id = (window.APP.state.view === "claim" && window.APP.state.allegationId) ? window.APP.state.allegationId : "20481";
    return window.DP.getAllegation(id);
  }
  function focused() { return window.APP.state.view === "claim" && window.APP.state.allegationId; }

  function build() {
    var fab = document.createElement("button");
    fab.id = "cp-fab";
    fab.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:210;background:#0f6e56;color:#fff;border:none;border-radius:26px;padding:10px 16px;font-size:13px;font-weight:500;font-family:'IBM Plex Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 3px 14px rgba(0,0,0,0.22)";
    fab.innerHTML = '<i class="ti ti-sparkles"></i> Copilot';
    fab.onclick = toggle;
    document.body.appendChild(fab);

    var panel = document.createElement("div");
    panel.id = "cp-panel";
    panel.style.cssText = "position:fixed;top:0;right:0;width:370px;max-width:92vw;height:100vh;z-index:220;background:var(--card);border-left:0.5px solid var(--border);box-shadow:-4px 0 24px rgba(0,0,0,0.12);transform:translateX(100%);transition:transform .22s ease;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif";
    panel.innerHTML =
      '<div style="background:#10243b;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:8px"><i class="ti ti-sparkles" style="color:#7fe0d6"></i><span style="font-weight:500">Analyst copilot</span></div><button id="cp-x" style="background:none;border:none;color:#93a7bf;cursor:pointer;font-size:16px"><i class="ti ti-x"></i></button></div>' +
      '<div id="cp-ctx" style="padding:7px 14px;font-size:11px;color:var(--text2);border-bottom:0.5px solid var(--border2);background:var(--surface)"></div>' +
      '<div id="cp-chat" class="chat" style="flex:1;overflow-y:auto;padding:12px 14px;min-height:0"></div>' +
      '<div style="padding:10px 14px;border-top:0.5px solid var(--border2)"><div class="suggest" id="cp-suggest" style="margin-bottom:8px"></div>' +
      '<div style="display:flex;gap:8px"><input id="cp-input" class="input" placeholder="Ask the copilot…"><button class="btn primary" id="cp-send"><i class="ti ti-send"></i></button></div>' +
      '<div style="font-size:10px;color:var(--text3);margin-top:6px"><i class="ti ti-sparkles"></i> Demonstration-scripted, grounded in the case data.</div></div>';
    document.body.appendChild(panel);

    document.getElementById("cp-x").onclick = toggle;
    document.getElementById("cp-suggest").innerHTML = SUGGEST.map(function (s) { return '<button class="btn" style="font-size:11.5px">' + s + '</button>'; }).join("");
    document.getElementById("cp-suggest").querySelectorAll("button").forEach(function (b) { b.onclick = function () { ask(b.textContent); }; });
    document.getElementById("cp-send").onclick = function () { var i = document.getElementById("cp-input"); ask(i.value.trim()); i.value = ""; };
    document.getElementById("cp-input").addEventListener("keydown", function (e) { if (e.key === "Enter") { ask(this.value.trim()); this.value = ""; } });
  }

  function toggle() {
    open = !open;
    document.getElementById("cp-panel").style.transform = open ? "translateX(0)" : "translateX(100%)";
    document.getElementById("cp-fab").style.display = open ? "none" : "flex";
    if (open) greet();
  }
  function setCtxLine() {
    var a = ctx();
    document.getElementById("cp-ctx").innerHTML = focused()
      ? '<i class="ti ti-focus-2" style="color:var(--accent-d)"></i> Focused on #' + a.id + ' — ' + window.APP.esc(a.provider.name) + ' · ' + a.fwaType
      : '<i class="ti ti-info-circle"></i> General assistant — open a case for its full context';
  }
  function greet() {
    setCtxLine();
    var chat = document.getElementById("cp-chat"); chat.innerHTML = "";
    var a = ctx();
    addAI(focused()
      ? "I'm focused on flagged claim #" + a.id + " — " + a.fwaType.toLowerCase() + " at " + a.provider.name + ". Ask me to summarize the risk, compare to peers, recommend an action, or draft a rationale."
      : "Ask me about any flagged case. Open a claim and I'll ground my answers in its evidence, rules and network context.", false);
  }
  function addUser(t) { var d = el("msg user", t); chat().appendChild(d); scroll(); }
  function addAI(t, stream) { var d = el("msg ai", ""); chat().appendChild(d); if (stream) window.AI.stream(d, t, scroll); else d.textContent = t; scroll(); }
  function ask(qy) {
    if (!qy) return;
    if (!open) toggle();
    setCtxLine();
    addUser(qy);
    var a = ctx();
    window.APP.auditLog("COPILOT_QUERY", "#" + a.id + " · " + qy);
    setTimeout(function () { addAI(window.AI.copilot(a, qy), true); }, 200);
  }
  function chat() { return document.getElementById("cp-chat"); }
  function scroll() { var c = chat(); c.scrollTop = c.scrollHeight; }
  function el(cls, txt) { var d = document.createElement("div"); d.className = cls; if (txt) d.textContent = txt; return d; }

  window.COPILOT = { open: function () { if (!open) toggle(); }, ask: ask };
  function boot() { if (!window.APP || !window.DP) return setTimeout(boot, 60); build(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
