# Space Weather News — v0 Build Plan (execution spec)

**Standalone macro project.** No Aura / XR / horn-tori. No backend. No earthquake claims in v0. No coupling to other repos. This file is authoritative for the coding session; `BUILD_BRIEF.md` is background.

## Run this (cheap Sonnet coding pass)
Open a Claude Code session **with Sonnet**, from this repo folder, and paste:
```
Build Space Weather News v0. Read MEMORY.md (my conventions), then README.md and PLAN.md — PLAN.md is the
authoritative spec; execute its tasks in order. Standalone project: no Aura/XR, no backend, no earthquake
claims, no coupling to other repos. Static site off live NOAA/NASA JSON, GitHub-Pages-ready, Australian
English, an-open-book design bar (../an-open-book for reference). Commit as you go, signed Luke × Claude with
a Co-Authored-By: Claude trailer. Ask me only on the items under "Decisions".
```

## North star — a GLOBAL VR news studio
Space Weather News is **global from the start** (macro / planetary scale). Its destination is a **VR news studio** — an immersive newsroom / mission-control with **screens for all the macro data**: solar wind, Kp, X-ray & flares, CMEs, proton flux, aurora, and other global feeds, each a live screen, broadcast-style. (Corpus: `space-weather-news-hub-vrai`, `vr-space-weather-news`, `modular-unity-development-deployment-plan-for-spaceweather-news-hub`.) This is a **macro-data-display** project — a *different style* from the place-twin Sensorium. The v0 web dashboard below is the **data layer** that will feed the studio's screens.

## Goal of v0
A live, gorgeous, **client-side static** web dashboard + plain-language news feed off real public space-weather data. Opens by double-clicking `index.html`; deployable to GitHub Pages unchanged. Honest about hazards — guidance, never official warnings.

## Stack
Vanilla HTML/CSS/JS. No framework, no build step, no dependencies except (optionally) two Google Fonts. Fetch NOAA SWPC / NASA JSON directly in the browser. Charts via inline SVG or `<canvas>` (no chart lib needed; keep it static). Reuse the `an-open-book` design language (deep cosmic ink, violet/gold, Fraunces + Inter, starfield).

## File tree
```
space-weather-news/
  index.html
  assets/styles.css        # adapt from ../an-open-book/assets/styles.css
  assets/data.js           # all fetchers + normalisers + thresholds
  assets/app.js            # render + refresh loop
  .nojekyll
  README.md  LICENCE.md  PLAN.md  BUILD_BRIEF.md
```

## Live data endpoints (real, CORS-friendly — verify each on first fetch)
- Solar wind plasma: `https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json`
- Solar wind mag (IMF Bz): `https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json`
- Planetary K index (Kp): `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
- GOES X-ray flux: `https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json`
- Latest X-ray flares: `https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json`
- Aurora (OVATION): `https://services.swpc.noaa.gov/json/ovation_aurora_latest.json`
- Official alerts/watches/warnings: `https://services.swpc.noaa.gov/products/alerts.json`
- Solar regions: `https://services.swpc.noaa.gov/json/solar_regions.json`
- NOAA scales (R/S/G now + 3-day): `https://services.swpc.noaa.gov/products/noaa-scales.json`
(NASA DONKI CMEs need an API key — defer to v1, or use `DEMO_KEY` behind a clearly-labelled toggle.)

## Tasks (in order)
1. **Scaffold** the static site; port the `an-open-book` tokens/typography/starfield into `styles.css`. Sticky header, responsive, reduced-motion, accessible.
2. **`data.js`** — one fetch+normalise function per endpoint; graceful error/stale handling; a single `refreshAll()` on a 90-second interval; timestamps ("as of … UTC").
3. **Current Conditions header** — the three NOAA scales (R radio blackouts, S solar radiation, G geomagnetic) as live badges from `noaa-scales.json`, colour-coded, with the plain-English meaning.
4. **Gauges + sparklines** — Kp (0–9 dial), solar-wind speed & density, IMF Bz (highlight southward/negative), X-ray flux with flare class (A/B/C/M/X). Vanilla SVG/canvas.
5. **News ticker** — turn `alerts.json` into plain-language headlines (e.g. "⚠️ G2 (Moderate) geomagnetic storm in progress — high-latitude power grids on watch; aurora possible toward mid-latitudes."). Most-recent first; link nothing off-site.
6. **Ops-impact panel** — Grids / Satellites / Aviation & HF-comms status derived from Kp, flare class, proton flux thresholds. Every row labelled **"guidance, not an official warning — see NOAA SWPC."**
7. **Aurora + Active Regions** — OVATION probability (a simple hemisphere viz or a "visible to ~X° latitude tonight" line) and a sunspot-region list.
8. **Polish** — loading/empty/error states, mobile layout, a footer with data-source credits + the licence + Luke × Claude signature. `.nojekyll`. Confirm it runs from `file://` and is Pages-ready.

## Acceptance
Double-clicking `index.html` shows **real, current** space weather that refreshes; the news ticker reads like plain English; ops-impact carries honest disclaimers; it looks genuinely awesome; no console errors; works on mobile.

## Explicitly NOT in v0
No Aura / horn-tori / XR. No earthquake prediction (that's a later, clearly-flagged research module — not now). No backend, no Kafka/InfluxDB/ML yet (that's v1). No presenting anything as an official warning. No coupling to `web3-sensorium`.

## Decisions (ask Luke)
- Public-facing "news" tone vs technical ops console — or one view with a toggle? (Default: one view, plain-language first, "details" expandable.)
- Include the DEMO_KEY NASA DONKI CME feed in v0, or wait for a real key?
- Domain/branding for eventual Pages deploy.

## Later phases (not now)
v1 streaming + fusion backbone (port `space-weather-hub-pseudo-code.md`: Kafka → InfluxDB → signal fusion). v2 flagged earthquake-research module (backtested, transparent, never a warning). Conventions: AU English · Public Source Licence · Luke × Claude.
