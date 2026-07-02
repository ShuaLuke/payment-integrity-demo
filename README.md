# PIVOT — demo UI

Static, no-build demo of **VA PIVOT** (Payment Integrity Validation & Oversight Tool). Analyst reviews
post-payment claims flagged as anomalous → aggregate analysis → prioritize → drill into a claim → decide →
update the case flow. VA × IBM identity. **All data is synthetic** (see the banner); NPIs deliberately fail the
NPI check digit, TINs use the `00-` prefix.

## Run
No build step. Either:
- **Just open** `index.html` in a browser (data is bundled as a JS global — needs internet for CDN fonts/d3/icons), or
- **Serve statically** (recommended): `python3 -m http.server 8137 --directory .` then visit `http://localhost:8137`.

## Regenerate data
```
npm run gen:data      # -> src/data/dataset.json + assets/data.js (deterministic, seed 20260701)
```

## Deploy (GitHub Pages)
Publish the contents of this folder. Everything is relative-path and static — commit and enable Pages.

## Structure
```
index.html            app shell (chrome, nav, script order)
assets/
  styles.css          design system (locked tokens, PIVOT_DEMO_DESIGN.md §7b)
  data.js             generated: window.PIVOT_DATA
  provider.js         DataProvider seam (window.DP) — swap for Neo4j later, same shapes
  ai.js               deterministic "Gen AI" (window.AI) — swap for Gemini later
  app.js              router, state, audit trail, decision/case-flow (window.APP)
  views/              queue · claim · network · analytics · copilot · audit
scripts/generate-data.mjs   synthetic-data generator (also a Neo4j loader later)
src/data/dataset.json       canonical graph-shaped snapshot
```

## Swappable seams
- `assets/provider.js` — today reads the JSON snapshot; later a Neo4j provider returns the same shapes.
- `assets/ai.js` — today deterministic; later a live Gemini call via a serverless proxy. No UI change either way.
