# ☀️ Space Weather News

**Watch the Sun in real time. Read the sky like a newspaper. Warn the grid before it's hit.**

A space-weather monitoring and news hub — real-time solar and near-Earth data, fused into a fast, beautiful public dashboard and a plain-language news feed, with an ops-impact layer for grids, satellites, aviation and comms — and (later, clearly flagged) a research frontier exploring whether space-weather and geophysical signals can give early warning of large earthquakes. A standalone product — see [Conventions](#conventions).

> A System Designer project. Luke × Claude. Descriptions have been ahead of the code for years — now we build.

## Status
☀️ **v0 live.** A static dashboard runs off real NOAA SWPC / NASA JSON — current-conditions scales, Kp/solar-wind/Bz/X-ray gauges, a plain-language news ticker, an ops-impact panel, aurora + active regions, and a demo CME feed. News/Ops-console toggle. Open `index.html` directly or serve the folder. Background → **[`BUILD_BRIEF.md`](BUILD_BRIEF.md)** · spec → **[`PLAN.md`](PLAN.md)**.

## North star
Global from the start, its destination is a **VR news studio** — an immersive newsroom with **screens for all the macro data** (solar wind, Kp, flares, CMEs, proton flux, aurora, and more). The v0 dashboard is the data layer that will feed those screens. (This is a macro-data-display project — a different style from the place-twin [Sensorium](../web3-sensorium).)

## The honest layering (surface the gem)
- **Real today** → live space-weather monitoring + ops-impact alerting. NOAA SWPC / NASA data is public and live; a gorgeous, honest dashboard is buildable now.
- **Legitimate research** → multi-source signal fusion (21+ streams) + ML pattern recognition. A reusable sensor-fusion architecture regardless of the headline.
- **Contested, flagged as such** → magnitude-7+ earthquake early-warning. Built as an experimental module with backtesting and confidence scores — never as a claim, never as a warning.

## First milestone
A live web dashboard pulling real NOAA SWPC feeds — solar wind, Kp index, X-ray flux, aurora, active regions, CME alerts — with a significant-events news ticker and an ops-impact panel. Client-side, deployable to GitHub Pages, no backend for v0. Then the fusion / ML / VR-Aura phases.

## Conventions
Australian English · [Aura of Intelligence Public Source Licence](LICENCE.md) (non-commercial free; commercial reserved) · mobilisation not monetisation · nothing about hazards overstated · signed **Luke × Claude**.
