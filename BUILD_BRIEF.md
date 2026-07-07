# Space Weather News — Build Brief

*For the session that builds this. Read this, skim the source docs, then let's go.*
*Sibling project: [`web3-sensorium`](../web3-sensorium) — Space Weather News is its first live data instrument.*

---

## 1. The vision (in Luke's frame)

An **XR/AI space-weather news + monitoring + early-warning hub**. Watch the Sun and the near-Earth environment in real time; fuse many signals into one picture; surface what actually matters — to power grids, satellites, aviation, comms, and people; and, as a *flagged research frontier*, model whether space-weather and geophysical precursors can give early warning of large (M7+) earthquakes. Delivered as a fast public web experience today and a VR/AI "Aura" experience later.

It is one of Luke's long-held pillars (his LinkedIn calls it *"XR/AI Earthquake Prediction Modelling · SpaceWeather News"*). It is also the **first working instrument of the Global Sensorium** — the vertical slice that proves the whole ingest → fuse → reason → present loop.

## 2. Surface the gem — the honest layering (non-negotiable)

We lead with what's real and label the rest truthfully. Three layers:

- **REAL TODAY — build this first.** Real-time space-weather monitoring and operational-impact alerting. NOAA SWPC, NASA (DONKI/SDO), USGS and GNSS data are public and live: solar wind speed/density, IMF Bz, Kp/Ap, X-ray flux, flares, CMEs, aurora ovals, proton flux. The **geomagnetic-storm → grid / satellite / aviation / HF-comms impact** layer is *operationally real* — NOAA SWPC does exactly this. A beautiful, fast, honest dashboard + news feed is buildable now, no permission required.
- **LEGITIMATE RESEARCH.** Multi-source **signal fusion** — the 21-point "IFTTT" architecture from the docs: solar wind, IMF, TEC/ionosphere, ULF electromagnetics, radon, InSAR ground deformation, thermal-IR, acoustic, hydrochemical — feeding **ML pattern recognition**. The sensor-fusion + alerting architecture is sound and reusable whatever the headline claim does.
- **CONTESTED — flag honestly, never present as fact or as a warning.** M7+ earthquake early-warning from space-weather/geophysical precursors. Build it as a clearly-labelled **experimental module**: confidence scores, transparent features, rigorous backtesting against historical catalogues, and prominent "research, not a warning" framing. The licence (§5) requires this.

> This layering is itself the lesson from Luke's "surface the gem" rule: don't let a contested headline bury a genuinely useful, real-today architecture.

## 3. The real code already exists

`space-weather-hub-pseudo-code.md` contains working Python to build from, not just prose:
- **InfluxDB** `write_data` / `capture_data` for time-series ingest;
- a **Kafka** producer for streaming;
- a **`RandomForestClassifier`** earthquake model + correlation analysis.

Treat it as the reference implementation. We can start simpler (client-side) and grow into this streaming/ML backbone.

## 4. Proposed architecture (our starting point — decide together)

```
SOURCES → INGEST → STREAM → STORE → FUSE + ML → SERVE → EXPERIENCES
NOAA SWPC        (poll/     (Kafka   (InfluxDB /  (signal    (REST +   1) Web dashboard + news  ← v0
NASA DONKI/SDO    fetch)     or       lightweight  fusion,    WebSocket) 2) Ops-impact alerts
USGS quakes                 light)    TSDB)        RandomF→…)            3) VR/AI "Aura" news (Unity)
GNSS/TEC, etc.                                                          → feeds the Global Sensorium
```

- **v0 needs no backend**: the public NOAA SWPC JSON products are fetchable client-side. Ship a static dashboard first (GitHub Pages, `.nojekyll`), like Luke's other repos.
- Add the **Kafka/InfluxDB streaming + ML** backbone as Phase 2, port the pseudo-code.
- The **VR/AI "Aura" front-end** (Unity) is Phase 3 — there's a `modular-unity-development-deployment-plan-for-spaceweather-news-hub.md` for it. NOTE: the toroidal "Aura" interface uses **horn tori** — ask Luke for the exact form before building the XR layer.

## 5. First milestone (proposed)

A **live, gorgeous, honest web dashboard** — client-side, static-deployable — showing right now:
- solar wind (speed/density/Bz), Kp index gauge, X-ray flux (flare class), proton flux;
- active regions & latest flares/CMEs (NASA DONKI), aurora forecast oval;
- a **"news ticker"** that turns significant events into plain-language headlines ("G2 geomagnetic storm underway — high-latitude grids on watch, aurora possible to ~50° latitude");
- an **ops-impact panel**: grids / satellites / aviation / HF comms status at a glance.

Design bar: Aura house style — cosmic, classy, alive (the `an-open-book` design system is a good reference). Australian English. Nothing about hazards overstated.

## 6. Roadmap

1. **v0 · Live dashboard + news** (client-side, real NOAA/NASA data).
2. **v1 · Streaming + fusion backbone** (Kafka → InfluxDB → signal fusion; port the pseudo-code).
3. **v2 · Research module** (ML earthquake backtesting, transparent + flagged; the AUS-IND hackathon framing is in the docs).
4. **v3 · VR/AI "Aura" experience** (Unity; horn-tori interface — learn the form first).
5. **Sensorium integration** — publish the fused feed as the Global Sensorium's first data domain.

## 7. Source docs (all local)

**Knowledge base — `aura-knowledge-base/themes/space-weather/`:**
`_OVERVIEW.md` · `space-weather-news-hub.md` · `space-weather-news-hub-vrai.md` · `space-weather-news-hub-catastrophism.md` · `space-weather-hub-pseudo-code.md` (the code) · `space-weather-data-ifttt.md` + `space-weather-data-use-ifttt.md` (signal fusion) · `vr-space-weather-news.md` · `modular-unity-development-deployment-plan-for-spaceweather-news-hub.md` · `vrai-aura-development.md` · `solar-swarm-satellite-research-report.md` · `earths-disaster-cycle-geomagnetic-events.md` · `space-weather-earth-interactions.md` · `research-papers-space-weather-news.md` · `academia-s-barriers-to-astrophysical-innovation.md` · `legal-structures-jurisdiction-strategy-for-a-quad-nation-earth-tech-in.md` · the earthquake/hackathon 1- and 2-pagers.

**Raw corpus (`Sorting_Files/02_Processed_MD/PDFs_to_Sort/`):** `Space_Weather_Hub_Pseudo_Code.md` · `Space_Weather_Data_IFTTT.md` · `Research_Papers_-_Space_weather_news.md` · `1-page_Earthquake_Prediction_with_the_Space_Weather_News.md`.

## 8. Decisions to make with Luke

- **v0 scope**: public-news product vs internal-ops console vs both in one? (Proposal: one dashboard, two modes.)
- **The horn-tori "Aura" XR interface** — the exact geometry/UX before Phase 3.
- **Earthquake module**: how prominent, and what backtesting bar counts as "worth showing"?
- **Quad-nation legal/jurisdiction strategy** (there's a doc) — does it shape v1 hosting/branding?
- **Data**: which NOAA/NASA endpoints for v0; any that need a proxy for CORS.

## 9. Conventions
Luke × Claude signed · Australian English · [Public Source Licence](LICENCE.md) · mobilisation not monetisation · hazard outputs never overstated · static-first + GitHub-Pages-ready like Luke's other repos.
