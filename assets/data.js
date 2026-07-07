/* ============================================================
   SPACE WEATHER NEWS — data layer
   Fetch + normalise live NOAA SWPC / NASA DONKI JSON.
   No backend: every function below hits a public, CORS-open
   endpoint directly from the browser. Luke × Claude.
   ============================================================ */

(function () {
  'use strict';

  const ENDPOINTS = {
    wind: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',
    mag: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',
    kp: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
    xray: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
    xrayFlareLatest: 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json',
    protons: 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json',
    aurora: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
    alerts: 'https://services.swpc.noaa.gov/products/alerts.json',
    regions: 'https://services.swpc.noaa.gov/json/solar_regions.json',
    scales: 'https://services.swpc.noaa.gov/products/noaa-scales.json',
  };

  // NASA DONKI has no public CORS-open "no key" tier — DEMO_KEY is the
  // shared public rate-limited key, clearly labelled as demo data in the UI.
  const DONKI_KEY = 'DEMO_KEY';
  const REFRESH_MS = 90 * 1000;
  const FETCH_TIMEOUT_MS = 20 * 1000;

  const WIND_WINDOW_MIN = 360; // 6h at 1-minute cadence
  const KP_WINDOW_MIN = 1440; // 24h at 1-minute cadence

  /* ---------- fetch helper ---------- */

  function fetchJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { cache: 'no-store', signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(() => clearTimeout(timer));
  }

  function safe(url) {
    return fetchJson(url)
      .then((data) => ({ ok: true, data, fetchedAt: new Date() }))
      .catch((err) => ({ ok: false, error: err && err.message ? err.message : String(err), fetchedAt: new Date() }));
  }

  /* ---------- small shared utilities ---------- */

  function toDate(tag) {
    // SWPC time_tags are UTC without a trailing Z on some feeds — force UTC.
    const iso = /Z$/.test(tag) ? tag : tag + 'Z';
    return new Date(iso);
  }

  function sortByTime(arr, key) {
    return arr.slice().sort((a, b) => a[key] - b[key]);
  }

  function lastN(arr, n) {
    return arr.length > n ? arr.slice(arr.length - n) : arr;
  }

  function round(n, dp) {
    if (n == null || !isFinite(n)) return null;
    const f = Math.pow(10, dp || 0);
    return Math.round(n * f) / f;
  }

  /* ---------- X-ray flare classification ---------- */

  const XRAY_BANDS = [
    ['X', 1e-4],
    ['M', 1e-5],
    ['C', 1e-6],
    ['B', 1e-7],
    ['A', 1e-8],
  ];

  function classifyXray(flux) {
    if (flux == null || !isFinite(flux) || flux <= 0) return null;
    for (let i = 0; i < XRAY_BANDS.length; i++) {
      const letter = XRAY_BANDS[i][0];
      const base = XRAY_BANDS[i][1];
      if (flux >= base) {
        return { letter: letter, value: round(flux / base, 1), label: letter + round(flux / base, 1).toFixed(1) };
      }
    }
    return { letter: 'A', value: round(flux / 1e-8, 1), label: 'A' + round(flux / 1e-8, 1).toFixed(1) };
  }

  // Rough, clearly-labelled mapping from X-ray class to the R (radio blackout)
  // scale, used only as a fallback when noaa-scales.json's own R value is
  // unavailable for a given moment — the scales feed is the authoritative one.
  function xrayToRScale(cls) {
    if (!cls) return 0;
    if (cls.letter === 'X' && cls.value >= 20) return 5;
    if (cls.letter === 'X' && cls.value >= 10) return 4;
    if (cls.letter === 'X') return 3;
    if (cls.letter === 'M' && cls.value >= 5) return 2;
    if (cls.letter === 'M') return 1;
    return 0;
  }

  /* ---------- fetchers ---------- */

  function fetchSolarWind() {
    return safe(ENDPOINTS.wind).then((res) => {
      if (!res.ok) return res;
      const rows = res.data
        .filter((r) => r.active === true && r.proton_speed != null)
        .map((r) => ({ t: toDate(r.time_tag), speed: r.proton_speed, density: r.proton_density }));
      const series = lastN(sortByTime(rows, 't'), WIND_WINDOW_MIN);
      return { ok: true, series: series, latest: series[series.length - 1] || null };
    });
  }

  function fetchSolarWindMag() {
    return safe(ENDPOINTS.mag).then((res) => {
      if (!res.ok) return res;
      const rows = res.data
        .filter((r) => r.active === true && r.bz_gsm != null)
        .map((r) => ({ t: toDate(r.time_tag), bt: r.bt, bz: r.bz_gsm }));
      const series = lastN(sortByTime(rows, 't'), WIND_WINDOW_MIN);
      return { ok: true, series: series, latest: series[series.length - 1] || null };
    });
  }

  function fetchKp() {
    return safe(ENDPOINTS.kp).then((res) => {
      if (!res.ok) return res;
      const rows = res.data.map((r) => ({ t: toDate(r.time_tag), kp: r.kp_index, kpEst: r.estimated_kp }));
      const series = lastN(sortByTime(rows, 't'), KP_WINDOW_MIN);
      return { ok: true, series: series, latest: series[series.length - 1] || null };
    });
  }

  function fetchXray() {
    return safe(ENDPOINTS.xray).then((res) => {
      if (!res.ok) return res;
      const rows = res.data
        .filter((r) => r.energy === '0.1-0.8nm' && r.flux != null)
        .map((r) => ({ t: toDate(r.time_tag), flux: r.flux }));
      const series = sortByTime(rows, 't');
      const latest = series[series.length - 1] || null;
      return {
        ok: true,
        series: series,
        latest: latest,
        flareClass: latest ? classifyXray(latest.flux) : null,
      };
    });
  }

  function fetchLatestFlare() {
    return safe(ENDPOINTS.xrayFlareLatest).then((res) => {
      if (!res.ok) return res;
      const rows = res.data || [];
      if (!rows.length) return { ok: true, flare: null };
      const flare = rows.slice().sort((a, b) => toDate(a.max_time) - toDate(b.max_time)).pop();
      return { ok: true, flare: flare };
    });
  }

  function fetchProtonFlux() {
    return safe(ENDPOINTS.protons).then((res) => {
      if (!res.ok) return res;
      const rows = res.data
        .filter((r) => r.energy === '>=10 MeV' && r.flux != null)
        .map((r) => ({ t: toDate(r.time_tag), flux: r.flux }));
      const series = sortByTime(rows, 't');
      return { ok: true, series: series, latest: series[series.length - 1] || null };
    });
  }

  // OVATION gives a global lon/lat/probability grid. For a v0 "how far will
  // the aurora reach tonight" line we reduce it to one equatorward boundary
  // per hemisphere: the least-extreme latitude where any longitude reaches
  // the visibility threshold.
  const AURORA_THRESHOLD = 10;

  function fetchAurora() {
    return safe(ENDPOINTS.aurora).then((res) => {
      if (!res.ok) return res;
      const coords = res.data.coordinates || [];
      let northBoundary = null; // smallest latitude >=0 that is lit
      let southBoundary = null; // largest latitude <=0 that is lit (closest to equator)
      for (let i = 0; i < coords.length; i++) {
        const lat = coords[i][1];
        const val = coords[i][2];
        if (val < AURORA_THRESHOLD) continue;
        if (lat >= 0) {
          if (northBoundary === null || lat < northBoundary) northBoundary = lat;
        } else {
          if (southBoundary === null || lat > southBoundary) southBoundary = lat;
        }
      }
      return {
        ok: true,
        observedTime: res.data['Observation Time'] || null,
        forecastTime: res.data['Forecast Time'] || null,
        north: northBoundary,
        south: southBoundary,
      };
    });
  }

  function fetchRegions() {
    return safe(ENDPOINTS.regions).then((res) => {
      if (!res.ok) return res;
      const rows = res.data || [];
      let maxDate = null;
      for (let i = 0; i < rows.length; i++) {
        if (!maxDate || rows[i].observed_date > maxDate) maxDate = rows[i].observed_date;
      }
      const today = rows
        .filter((r) => r.observed_date === maxDate)
        .map((r) => ({
          region: r.region,
          location: r.location,
          magClass: r.mag_class,
          spotClass: r.spot_class,
          area: r.area,
          numberSpots: r.number_spots,
          cFlares: r.c_xray_events || 0,
          mFlares: r.m_xray_events || 0,
          xFlares: r.x_xray_events || 0,
          cProb: r.c_flare_probability,
          mProb: r.m_flare_probability,
          xProb: r.x_flare_probability,
        }))
        .sort((a, b) => (b.xFlares * 100 + b.mFlares * 10 + b.cFlares) - (a.xFlares * 100 + a.mFlares * 10 + a.cFlares));
      return { ok: true, observedDate: maxDate, regions: today };
    });
  }

  function fetchScales() {
    return safe(ENDPOINTS.scales).then((res) => {
      if (!res.ok) return res;
      const raw = res.data;
      const days = Object.keys(raw)
        .map((k) => ({ offset: parseInt(k, 10), ...raw[k] }))
        .sort((a, b) => a.offset - b.offset);
      const today = days.find((d) => d.offset === 0) || null;
      return { ok: true, days: days, today: today };
    });
  }

  function fetchAlerts() {
    return safe(ENDPOINTS.alerts).then((res) => {
      if (!res.ok) return res;
      const rows = (res.data || []).map(parseAlert).filter(Boolean);
      rows.sort((a, b) => b.time - a.time);
      return { ok: true, alerts: rows, total: rows.length };
    });
  }

  function fetchCME() {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const url = 'https://api.nasa.gov/DONKI/CME?startDate=' + fmt(start) + '&endDate=' + fmt(end) + '&api_key=' + DONKI_KEY;
    return safe(url).then((res) => {
      if (!res.ok) return res;
      const rows = (res.data || []).slice().sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      return { ok: true, cmes: rows, demo: DONKI_KEY === 'DEMO_KEY' };
    });
  }

  /* ---------- alert -> plain language ---------- */

  const STATUS_WORDS = ['CANCELLED WATCH', 'CANCEL WARNING', 'CANCEL ALERT', 'EXTENDED WARNING', 'CONTINUED ALERT', 'WATCH', 'WARNING', 'ALERT', 'SUMMARY'];

  function firstHeadlineLine(message) {
    const lines = message.split(/\r?\n/).map((l) => l.trim());
    for (let i = 0; i < lines.length; i++) {
      if (/^(WATCH|WARNING|ALERT|SUMMARY|CANCEL|EXTENDED|CONTINUED)/i.test(lines[i])) return lines[i];
    }
    return lines.find((l) => l.length > 0) || '';
  }

  function kToGScale(k) {
    if (k >= 9) return 5;
    if (k >= 8) return 4;
    if (k >= 7) return 3;
    if (k >= 6) return 2;
    if (k >= 5) return 1;
    return 0;
  }

  function detectSeverity(message, headline) {
    let m = message.match(/Noaa Scale:\s*[RSG](\d)/i);
    if (m) return parseInt(m[1], 10);
    m = headline.match(/Category G(\d)/i);
    if (m) return parseInt(m[1], 10);
    m = headline.match(/K-index of (\d)/i);
    if (m) return kToGScale(parseInt(m[1], 10));
    m = headline.match(/exceeded ([MX])(\d+)/i);
    if (m) return xrayToRScale({ letter: m[1].toUpperCase(), value: parseFloat(m[2]) });
    return 0;
  }

  function iconFor(code, isStandDown) {
    if (isStandDown) return '✅';
    if (/^ALTK0|^WARK0/.test(code)) return '🧲';
    if (/^WATA/.test(code)) return '🌩️';
    if (/^SUMXM|^SUMX0|^ALTXMF/.test(code)) return '☀️';
    if (/^ALTEF3|^WARPX1|^ALTPX/.test(code)) return '🛰️';
    if (/^ALTTP|^SUM10R/.test(code)) return '📡';
    if (/^WARSUD/.test(code)) return '⚡';
    return 'ℹ️';
  }

  function parseAlert(raw) {
    if (!raw || !raw.message) return null;
    const message = raw.message;
    const codeMatch = message.match(/Space Weather Message Code:\s*(\S+)/);
    const code = codeMatch ? codeMatch[1] : (raw.product_id || 'UNKNOWN');
    const headlineRaw = firstHeadlineLine(message);
    const isStandDown = /^(CANCEL|CANCELLED)/i.test(headlineRaw);
    const severity = detectSeverity(message, headlineRaw);
    const scaleNote = (message.match(/Noaa Scale:\s*([A-Z]\d\s*-\s*[A-Za-z]+)/) || [])[1] || null;
    const timeMatch = message.match(/Valid From:\s*([^\n\r]+)/);
    const detailBits = [];
    if (scaleNote) detailBits.push('NOAA scale ' + scaleNote.replace(/\s+/g, ' '));
    if (timeMatch) detailBits.push('Valid from ' + timeMatch[1].trim().replace(/\s*UTC\s*$/i, '') + ' UTC');
    return {
      id: raw.product_id + '-' + raw.issue_datetime,
      time: new Date(raw.issue_datetime.replace(' ', 'T') + 'Z'),
      code: code,
      headline: headlineRaw.replace(/\s+/g, ' ').trim(),
      detail: detailBits.join(' · '),
      severity: severity,
      isStandDown: isStandDown,
      icon: iconFor(code, isStandDown),
    };
  }

  /* ---------- public API ---------- */

  const state = {
    lastRefresh: null,
    ok: false,
    wind: null,
    mag: null,
    kp: null,
    xray: null,
    flare: null,
    protons: null,
    aurora: null,
    alerts: null,
    regions: null,
    scales: null,
    cme: null,
  };

  const listeners = [];

  function refreshAll() {
    return Promise.all([
      fetchSolarWind(),
      fetchSolarWindMag(),
      fetchKp(),
      fetchXray(),
      fetchLatestFlare(),
      fetchProtonFlux(),
      fetchAurora(),
      fetchAlerts(),
      fetchRegions(),
      fetchScales(),
      fetchCME(),
    ]).then(([wind, mag, kp, xray, flare, protons, aurora, alerts, regions, scales, cme]) => {
      state.wind = wind;
      state.mag = mag;
      state.kp = kp;
      state.xray = xray;
      state.flare = flare;
      state.protons = protons;
      state.aurora = aurora;
      state.alerts = alerts;
      state.regions = regions;
      state.scales = scales;
      state.cme = cme;
      state.lastRefresh = new Date();
      state.ok = [wind, mag, kp, xray, scales].every((r) => r.ok);
      listeners.forEach((fn) => {
        try { fn(state); } catch (e) { /* one bad renderer must not break the loop */ }
      });
      return state;
    });
  }

  function onUpdate(fn) {
    listeners.push(fn);
  }

  function start() {
    refreshAll();
    setInterval(refreshAll, REFRESH_MS);
  }

  window.SWN = {
    state: state,
    onUpdate: onUpdate,
    refreshAll: refreshAll,
    start: start,
    util: { classifyXray: classifyXray, round: round },
  };
})();
