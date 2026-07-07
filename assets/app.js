/* ============================================================
   SPACE WEATHER NEWS — render layer
   Reads window.SWN state, draws gauges/sparklines/panels.
   Vanilla DOM + inline SVG, no chart library. Luke × Claude.
   ============================================================ */

(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function $(sel) { return document.querySelector(sel); }

  function fmtTime(d) {
    if (!d) return '—';
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC';
  }

  // Alerts can span several days, so the ticker needs the date whenever an
  // item isn't from today — otherwise "11:50" appearing under "05:07" reads
  // as out of order when it's actually a different (earlier) UTC day.
  function fmtTickerTime(d) {
    if (!d) return '—';
    const now = new Date();
    const sameDay = d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
    if (sameDay) return fmtTime(d);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }) + ', ' + fmtTime(d);
  }

  function fmtDay(dateStamp, offset) {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    if (!dateStamp) return '+' + offset + 'd';
    const d = new Date(dateStamp + 'T00:00:00Z');
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  function timeAgoMin(d) {
    if (!d) return null;
    return Math.round((Date.now() - d.getTime()) / 60000);
  }

  /* ---------- scale colour + plain-language tables ---------- */

  const SCALE_COLOR = ['var(--scale-0)', 'var(--scale-1)', 'var(--scale-2)', 'var(--scale-3)', 'var(--scale-4)', 'var(--scale-5)'];
  const SCALE_NAME = ['None', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme'];

  const G_TEXT = [
    'No storm — grid operations normal.',
    'Minor storm — weak power-grid fluctuations possible; little practical impact.',
    'Moderate storm — high-latitude power systems may see voltage alarms; some grid management needed.',
    'Strong storm — voltage corrections may be required; some protective systems can false-trip.',
    'Severe storm — widespread voltage control problems possible; protective systems may trip incorrectly.',
    'Extreme storm — grid systems may see complete voltage collapse or blackouts; transformer damage possible.',
  ];
  const S_TEXT = [
    'No radiation storm — satellite operations normal.',
    'Minor — negligible effect on satellites.',
    'Moderate — infrequent single-event upsets in satellite electronics possible.',
    'Strong — satellites may enter safe mode; more radiation exposure for high-latitude flight crews.',
    'Severe — satellite memory/orientation problems likely; meaningful radiation exposure on polar flight routes.',
    'Extreme — satellite systems may be disabled or damaged; significant radiation risk for unshielded crews.',
  ];
  const R_TEXT = [
    'No blackout — HF radio and navigation normal.',
    'Minor — weak HF radio degradation on the sunlit side, tens of minutes.',
    'Moderate — limited HF blackout on the sunlit side; low-frequency navigation degraded briefly.',
    'Strong — wide-area HF blackout for about an hour; navigation signals degraded.',
    'Severe — HF blackout across most of the sunlit side for 1–2 hours; navigation outages likely.',
    'Extreme — complete HF blackout on the sunlit side for hours at a time.',
  ];

  function scaleNum(x) {
    const n = parseInt(x, 10);
    return isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
  }

  /* ---------- header / freshness ---------- */

  function renderHeader(state) {
    const dot = $('#freshnessDot');
    const label = $('#asOf');
    if (!state.lastRefresh) return;
    label.textContent = 'As of ' + fmtTime(state.lastRefresh);
    const age = timeAgoMin(state.lastRefresh);
    dot.classList.remove('stale', 'down');
    if (!state.ok) {
      dot.classList.add('down');
      label.textContent += ' — some feeds unavailable';
    } else if (age !== null && age >= 4) {
      dot.classList.add('stale');
      label.textContent += ' (refreshing…)';
    }
  }

  /* ---------- scale badges + outlook ---------- */

  function renderScaleBadges(state) {
    const el = $('#scaleBadges');
    const scales = state.scales;
    if (!scales || !scales.ok || !scales.today) {
      el.innerHTML = '<div class="state is-error">⚠ NOAA scales feed unavailable right now.</div>';
      return;
    }
    const t = scales.today;
    const defs = [
      { key: 'R', label: 'Radio blackouts', obj: t.R, text: R_TEXT },
      { key: 'S', label: 'Solar radiation', obj: t.S, text: S_TEXT },
      { key: 'G', label: 'Geomagnetic storms', obj: t.G, text: G_TEXT },
    ];
    el.innerHTML = defs.map((d) => {
      const lvl = scaleNum(d.obj && d.obj.Scale);
      return (
        '<div class="scale-badge">' +
        '<div class="lvl" style="background:' + SCALE_COLOR[lvl] + '">' + d.key + lvl + '</div>' +
        '<div><div class="lbl">' + d.label + '</div>' +
        '<div class="txt">' + SCALE_NAME[lvl] + '</div>' +
        '<p>' + esc(d.text[lvl]) + '</p></div></div>'
      );
    }).join('');
  }

  function renderOutlook(state) {
    const el = $('#outlookStrip');
    const scales = state.scales;
    if (!scales || !scales.ok) { el.innerHTML = ''; return; }
    const rows = scales.days.filter((d) => d.offset >= 0 && d.offset <= 3);
    const cell = (obj) => {
      if (!obj) return '—';
      if (obj.Scale != null) {
        const lvl = scaleNum(obj.Scale);
        return '<span style="color:' + SCALE_COLOR[lvl] + '">●</span> ' + obj.Scale + ' – ' + (obj.Text || SCALE_NAME[lvl]);
      }
      const minor = obj.MinorProb != null ? obj.MinorProb + '%' : '—';
      const major = obj.MajorProb != null ? obj.MajorProb + '%' : (obj.Prob != null ? obj.Prob + '%' : '—');
      return 'minor ' + minor + ' · major ' + major;
    };
    el.innerHTML =
      '<table><thead><tr><th>Day</th><th>Radio (R)</th><th>Radiation (S)</th><th>Geomagnetic (G)</th></tr></thead><tbody>' +
      rows.map((d) => (
        '<tr><td>' + fmtDay(d.DateStamp, d.offset) + '</td>' +
        '<td class="lvl">' + cell(d.R) + '</td>' +
        '<td class="lvl">' + cell(d.S) + '</td>' +
        '<td class="lvl">' + cell(d.G) + '</td></tr>'
      )).join('') +
      '</tbody></table>';
  }

  /* ---------- gauges ---------- */

  function polar(cx, cy, r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  function kpColor(kp) {
    if (kp >= 8) return 'var(--scale-5)';
    if (kp >= 7) return 'var(--scale-4)';
    if (kp >= 6) return 'var(--scale-3)';
    if (kp >= 5) return 'var(--scale-2)';
    if (kp >= 4) return 'var(--scale-1)';
    return 'var(--scale-0)';
  }

  function kpDialSvg(kp) {
    const cx = 100, cy = 100, r = 78;
    const val = kp == null ? 0 : Math.max(0, Math.min(9, kp));
    const angle = 180 - (val / 9) * 180;
    const p0 = polar(cx, cy, r, 180);
    const p1 = polar(cx, cy, r, 0);
    const pv = polar(cx, cy, r, angle);
    const needle = polar(cx, cy, r - 16, angle);
    const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
      const a = 180 - (i / 9) * 180;
      const o = polar(cx, cy, r + 12, a);
      const inn = polar(cx, cy, r + 4, a);
      return '<line class="tick" x1="' + inn.x + '" y1="' + inn.y + '" x2="' + o.x + '" y2="' + o.y + '"/>' +
        '<text x="' + o.x + '" y="' + (o.y + (a > 90 ? -4 : a < 90 ? 10 : 10)) + '" text-anchor="middle">' + i + '</text>';
    }).join('');
    return (
      '<svg class="gauge-svg" viewBox="0 0 200 118" role="img" aria-label="Kp index ' + (kp == null ? 'unavailable' : val.toFixed(1)) + ' of 9">' +
      '<path class="track" d="M ' + p0.x + ' ' + p0.y + ' A ' + r + ' ' + r + ' 0 0 1 ' + p1.x + ' ' + p1.y + '"/>' +
      '<path class="fill" style="stroke:' + kpColor(val) + '" d="M ' + p0.x + ' ' + p0.y + ' A ' + r + ' ' + r + ' 0 0 1 ' + pv.x + ' ' + pv.y + '"/>' +
      ticks +
      '<line class="needle" x1="' + cx + '" y1="' + cy + '" x2="' + needle.x + '" y2="' + needle.y + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#fff"/>' +
      '</svg>'
    );
  }

  function buildSpark(points, w, h, opts) {
    opts = opts || {};
    const vals = points.filter((p) => p.v != null && isFinite(p.v));
    if (!vals.length) return null;
    const xform = opts.log ? (v) => Math.log(Math.max(v, opts.logFloor || 1e-9)) : (v) => v;
    const ys = vals.map((p) => xform(p.v));
    let min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    const t0 = vals[0].t.getTime(), t1 = vals[vals.length - 1].t.getTime();
    const tSpan = Math.max(t1 - t0, 1);
    const px = (p) => ((p.t.getTime() - t0) / tSpan) * w;
    const py = (v) => h - ((xform(v) - min) / (max - min)) * h;
    const pathPts = vals.map((p) => px(p) + ',' + py(p.v));
    const zeroY = opts.zero != null && opts.zero >= min && opts.zero <= max ? py(opts.zero) : (opts.zero != null ? (opts.zero < min ? h : 0) : null);
    return {
      path: 'M ' + pathPts.join(' L '),
      fillPath: 'M ' + px(vals[0]) + ',' + h + ' L ' + pathPts.join(' L ') + ' L ' + px(vals[vals.length - 1]) + ',' + h + ' Z',
      zeroY: zeroY,
      last: vals[vals.length - 1].v,
    };
  }

  function sparkSvg(points, opts) {
    const w = 300, h = 56;
    const s = buildSpark(points, w, h, opts);
    if (!s) return '<div class="state">No recent data.</div>';
    const zeroLine = s.zeroY != null ? '<line class="zero" x1="0" y1="' + s.zeroY + '" x2="' + w + '" y2="' + s.zeroY + '"/>' : '';
    return (
      '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="sparkFade" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--accent-2)" stop-opacity=".35"/>' +
      '<stop offset="100%" stop-color="var(--accent-2)" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="fill" d="' + s.fillPath + '"/>' + zeroLine +
      '<path class="line" d="' + s.path + '"/>' +
      '</svg>'
    );
  }

  function renderGauges(state) {
    const el = $('#gauges');
    const cards = [];

    // Kp
    const kp = state.kp;
    if (kp && kp.ok && kp.latest) {
      cards.push(
        '<div class="card"><span class="tag">Geomagnetic</span><h3>Kp index</h3>' +
        kpDialSvg(kp.latest.kpEst) +
        '<div class="big">' + kp.latest.kpEst.toFixed(1) + '<span class="unit">of 9</span></div>' +
        '<p class="sub">1-minute nowcast · updates continuously</p></div>'
      );
    } else {
      cards.push('<div class="card"><span class="tag">Geomagnetic</span><h3>Kp index</h3><div class="state is-error">⚠ Feed unavailable.</div></div>');
    }

    // Solar wind speed/density
    const wind = state.wind;
    if (wind && wind.ok && wind.latest) {
      cards.push(
        '<div class="card"><span class="tag">Solar wind</span><h3>Speed &amp; density</h3>' +
        sparkSvg(wind.series.map((p) => ({ t: p.t, v: p.speed })), {}) +
        '<div class="big">' + Math.round(wind.latest.speed) + '<span class="unit">km/s</span></div>' +
        '<p class="sub">Density ' + (wind.latest.density != null ? wind.latest.density.toFixed(1) : '—') + ' p/cm³ · 6h trend</p></div>'
      );
    } else {
      cards.push('<div class="card"><span class="tag">Solar wind</span><h3>Speed &amp; density</h3><div class="state is-error">⚠ Feed unavailable.</div></div>');
    }

    // IMF Bz
    const mag = state.mag;
    if (mag && mag.ok && mag.latest) {
      const bz = mag.latest.bz;
      cards.push(
        '<div class="card"><span class="tag">Interplanetary field</span><h3>IMF Bz</h3>' +
        sparkSvg(mag.series.map((p) => ({ t: p.t, v: p.bz })), { zero: 0 }) +
        '<div class="big" style="color:' + (bz < 0 ? 'var(--c-red)' : '#fff') + '">' + bz.toFixed(1) + '<span class="unit">nT</span></div>' +
        '<p class="sub">' + (bz < 0 ? 'Southward — geoeffective, favours aurora/storms' : 'Northward — less geoeffective') + '</p></div>'
      );
    } else {
      cards.push('<div class="card"><span class="tag">Interplanetary field</span><h3>IMF Bz</h3><div class="state is-error">⚠ Feed unavailable.</div></div>');
    }

    // X-ray flux / flare class
    const xray = state.xray;
    if (xray && xray.ok && xray.latest) {
      const cls = xray.flareClass;
      cards.push(
        '<div class="card"><span class="tag">X-ray flux</span><h3>Flare class</h3>' +
        sparkSvg(xray.series.map((p) => ({ t: p.t, v: p.flux })), { log: true, logFloor: 1e-9 }) +
        '<div class="big">' + (cls ? cls.label : '—') + '</div>' +
        '<p class="sub">GOES long-channel (0.1–0.8 nm) · 6h trend</p></div>'
      );
    } else {
      cards.push('<div class="card"><span class="tag">X-ray flux</span><h3>Flare class</h3><div class="state is-error">⚠ Feed unavailable.</div></div>');
    }

    el.innerHTML = cards.join('');
  }

  /* ---------- news ticker ---------- */

  function renderTicker(state) {
    const el = $('#ticker');
    const a = state.alerts;
    if (!a || !a.ok) {
      el.innerHTML = '<li class="state is-error">⚠ NOAA alerts feed unavailable right now.</li>';
      return;
    }
    if (!a.alerts.length) {
      el.innerHTML = '<li class="ticker-empty">No active space-weather alerts in the current window — quiet skies.</li>';
      return;
    }
    const capNews = 10, capOps = 40;
    const isOps = document.body.getAttribute('data-mode') === 'ops';
    const cap = isOps ? capOps : capNews;
    const shown = a.alerts.slice(0, cap);
    const rows = shown.map((al) => (
      '<li class="ticker-item lvl-' + al.severity + (al.isStandDown ? ' is-cancelled' : '') + '">' +
      '<span class="icon">' + al.icon + '</span>' +
      '<div class="body"><div class="headline">' + esc(al.headline) + '</div>' +
      '<div class="meta">' + fmtTickerTime(al.time) + (al.detail ? ' · ' + esc(al.detail) : '') + '</div></div></li>'
    )).join('');
    const more = a.alerts.length > cap ? '<li class="ticker-empty">+ ' + (a.alerts.length - cap) + ' earlier alerts not shown</li>' : '';
    el.innerHTML = rows + more;
  }

  /* ---------- ops impact ---------- */

  function renderOps(state) {
    const el = $('#opsPanel');
    const scales = state.scales;
    if (!scales || !scales.ok || !scales.today) {
      el.innerHTML = '<div class="state is-error">⚠ Scales feed unavailable — impact panel needs it.</div>';
      return;
    }
    const t = scales.today;
    const defs = [
      { title: 'Power grids', icon: '⚡', obj: t.G, text: G_TEXT, thresh: 'G1 ≥ Kp 5 · G5 ≥ Kp 9' },
      { title: 'Satellites & radiation', icon: '🛰️', obj: t.S, text: S_TEXT, thresh: 'S1 ≥ 10 pfu · S5 ≥ 10⁵ pfu (>10 MeV protons)' },
      { title: 'Aviation & HF comms', icon: '📡', obj: t.R, text: R_TEXT, thresh: 'R1 ≥ M1 flare · R5 ≥ X20 flare' },
    ];
    el.innerHTML = defs.map((d) => {
      const lvl = scaleNum(d.obj && d.obj.Scale);
      return (
        '<div class="card ops-card"><span class="tag">' + d.icon + ' ' + d.title + '</span>' +
        '<div class="mt-1"><span class="status-pill" style="background:' + SCALE_COLOR[lvl] + '">' + SCALE_NAME[lvl] + '</span></div>' +
        '<p class="impact">' + esc(d.text[lvl]) + '</p>' +
        '<div class="thresholds ops-only"><div><span>Scale thresholds</span><span>' + d.thresh + '</span></div></div>' +
        '<p class="disclaimer">Guidance only, not an official warning — see NOAA SWPC.</p></div>'
      );
    }).join('');
  }

  /* ---------- aurora ---------- */

  function renderAurora(state) {
    const el = $('#auroraPanel');
    const a = state.aurora;
    if (!a || !a.ok) {
      el.innerHTML = '<div class="state is-error">⚠ Aurora forecast unavailable right now.</div>';
      return;
    }
    // Bar spans -90° (south pole, left) to +90° (north pole, right); each
    // mark sits at (lat+90)/180 of the way across.
    const pct = (lat) => ((lat + 90) / 180) * 100;
    const marks =
      (a.south != null ? '<span class="mark" style="left:' + pct(a.south) + '%"><span class="lbl">' + Math.round(Math.abs(a.south)) + '°S</span></span>' : '') +
      (a.north != null ? '<span class="mark" style="left:' + pct(a.north) + '%"><span class="lbl">' + Math.round(a.north) + '°N</span></span>' : '');
    el.innerHTML =
      '<div class="aurora-bar">' + marks + '</div>' +
      '<div class="aurora-scale"><span>South pole</span><span>Equator</span><span>North pole</span></div>' +
      '<div class="aurora-line mt-1">' +
      (a.south != null ? '<strong>Southern hemisphere:</strong> aurora possible equatorward to about ' + Math.round(Math.abs(a.south)) + '° latitude tonight.<br>' : 'Southern hemisphere: no significant activity forecast.<br>') +
      (a.north != null ? '<strong>Northern hemisphere:</strong> aurora possible equatorward to about ' + Math.round(a.north) + '° latitude tonight.' : 'Northern hemisphere: no significant activity forecast.') +
      '</div>' +
      '<p class="sub mt-1">OVATION forecast for ' + esc(a.forecastTime || '—') + ' UTC · threshold-based estimate, not a precise viewing guarantee.</p>';
  }

  /* ---------- active regions ---------- */

  function renderRegions(state) {
    const el = $('#regionsPanel');
    const r = state.regions;
    if (!r || !r.ok) {
      el.innerHTML = '<div class="state is-error">⚠ Solar regions feed unavailable right now.</div>';
      return;
    }
    if (!r.regions.length) {
      el.innerHTML = '<p class="muted">No numbered active regions reported today.</p>';
      return;
    }
    const top = r.regions.slice(0, 8);
    const simple = top.map((reg) => (
      '<div class="region-row"><span class="num">AR' + reg.region + '</span>' +
      '<span class="loc">' + esc(reg.location || '—') + '</span>' +
      '<span class="faint">' + esc(reg.magClass || '') + '</span>' +
      '<span class="flag">' + (reg.xFlares ? reg.xFlares + '× X ' : '') + (reg.mFlares ? reg.mFlares + '× M' : (!reg.xFlares ? 'quiet' : '')) + '</span></div>'
    )).join('');
    const table =
      '<table class="regions-table ops-only"><thead><tr><th>Region</th><th>Location</th><th>Mag class</th><th>Spot class</th><th>C</th><th>M</th><th>X</th><th>M% / X%</th></tr></thead><tbody>' +
      top.map((reg) => (
        '<tr><td>AR' + reg.region + '</td><td>' + esc(reg.location || '—') + '</td><td>' + esc(reg.magClass || '—') + '</td><td>' + esc(reg.spotClass || '—') + '</td>' +
        '<td>' + reg.cFlares + '</td><td>' + reg.mFlares + '</td><td>' + reg.xFlares + '</td>' +
        '<td>' + (reg.mProb != null ? reg.mProb : '—') + '% / ' + (reg.xProb != null ? reg.xProb : '—') + '%</td></tr>'
      )).join('') + '</tbody></table>';
    el.innerHTML = '<div class="regions-list">' + simple + '</div>' + table +
      (r.regions.length > top.length ? '<p class="sub mt-1">+ ' + (r.regions.length - top.length) + ' quieter regions not shown.</p>' : '');
  }

  /* ---------- CME (demo) ---------- */

  function renderCME(state) {
    const el = $('#cmePanel');
    const c = state.cme;
    if (!c) { el.innerHTML = '<div class="state"><span class="spin"></span> Loading…</div>'; return; }
    if (!c.ok) {
      el.innerHTML = '<div class="state is-error">⚠ NASA DONKI demo feed unavailable or rate-limited right now — this endpoint uses the public DEMO_KEY.</div>';
      return;
    }
    if (!c.cmes.length) {
      el.innerHTML = '<p class="muted">No coronal mass ejections catalogued in the last 7 days.</p>';
      return;
    }
    el.innerHTML = c.cmes.slice(0, 8).map((cme) => {
      const a = (cme.cmeAnalyses || []).find((x) => x.isMostAccurate) || (cme.cmeAnalyses || [])[0] || {};
      const speed = a.speed != null ? Math.round(a.speed) + ' km/s' : 'speed unknown';
      const when = cme.startTime ? new Date(cme.startTime).toLocaleString('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC' : '—';
      const note = cme.note ? esc(cme.note).slice(0, 220) + (cme.note.length > 220 ? '…' : '') : 'No further detail supplied by DONKI.';
      return (
        '<div class="cme-item"><div class="headline">Eruption from ' + esc(cme.sourceLocation || 'an unnumbered region') + ' — ' + speed + '</div>' +
        '<div class="meta">' + when + '</div>' +
        '<div class="tech ops-only">Half-angle ' + (a.halfAngle != null ? a.halfAngle + '°' : '—') + ' · lat/long ' + (a.latitude != null ? a.latitude : '—') + '/' + (a.longitude != null ? a.longitude : '—') + ' · ' + note + '</div></div>'
      );
    }).join('');
  }

  /* ---------- mode toggle ---------- */

  function initMode() {
    const saved = localStorage.getItem('swn-mode') || 'news';
    document.body.setAttribute('data-mode', saved);
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-mode') === saved);
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        document.body.setAttribute('data-mode', mode);
        localStorage.setItem('swn-mode', mode);
        document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
        if (window.SWN && window.SWN.state.lastRefresh) renderTicker(window.SWN.state);
      });
    });
  }

  /* ---------- boot ---------- */

  function renderAll(state) {
    renderHeader(state);
    renderScaleBadges(state);
    renderOutlook(state);
    renderGauges(state);
    renderTicker(state);
    renderOps(state);
    renderAurora(state);
    renderRegions(state);
    renderCME(state);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMode();
    const yearEl = document.querySelector('[data-year]');
    if (yearEl) yearEl.textContent = new Date().getUTCFullYear();
    window.SWN.onUpdate(renderAll);
    window.SWN.start();
  });
})();
