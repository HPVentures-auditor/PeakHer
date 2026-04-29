/**
 * PeakHer Patterns — "Letter from Dot" (Concept A)
 * Phase-aware patterns dashboard. Story-first design.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Patterns = (function () {
  'use strict';

  var Store  = window.PeakHer.Store;
  var Utils  = window.PeakHer.Utils;
  var Cycle  = window.PeakHer.Cycle;
  var Charts = window.PeakHer.Charts;

  var UNLOCK_THRESHOLD = 25;
  var container;
  var activeRange = 30;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Phase color tokens (kept in sync with index.html)
  var PHASE_HEX = { Restore: '#C77DBA', Rise: '#00E5A0', Peak: '#FFD700', Sustain: '#8B7BDB' };
  var PHASE_ENERGY_RANGES = { Restore: '4–6', Rise: '7–9', Peak: '9–10', Sustain: '5–7' };

  // ── Styles ────────────────────────────────────────────────────────

  var STYLES = [
    '.pat-wrap { max-width: 600px; margin: 0 auto; padding: 24px 16px 100px; font-family: \'Inter\', -apple-system, sans-serif; }',
    '.pat-wrap h1, .pat-wrap h2, .pat-wrap h3, .pat-wrap .display { font-family: \'Plus Jakarta Sans\', \'Inter\', sans-serif; letter-spacing: -0.02em; }',

    '.pat-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }',
    '.pat-topbar .crumb { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: var(--teal, #00E5A0); text-transform: uppercase; }',
    '.pat-topbar .meta { font-size: 12px; color: var(--text-secondary, #A0A0B0); }',

    /* Phase pill */
    '.pat-phase-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 100px; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 18px; }',
    '.pat-phase-pill .dot { width: 8px; height: 8px; border-radius: 50%; }',

    /* Hero */
    '.pat-headline { font-size: 28px; font-weight: 800; line-height: 1.2; color: var(--text-primary, #F0F0F5); margin-bottom: 10px; }',
    '.pat-headline em { font-style: normal; }',
    '.pat-sub { font-size: 15px; color: var(--text-body, #C0C0D0); line-height: 1.55; margin-bottom: 24px; }',
    '.pat-dot-sig { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary, #A0A0B0); margin-bottom: 28px; }',
    '.pat-dot-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #00E5A0, #E87461); display: flex; align-items: center; justify-content: center; font-family: \'Plus Jakarta Sans\', sans-serif; font-weight: 800; font-size: 13px; color: #12121A; }',

    /* Range selector (compact, top-right of Truth card) */
    '.pat-range-row { display: inline-flex; background: var(--bg-surface, #1A1A26); border: 1px solid var(--border-light, rgba(255,255,255,0.06)); border-radius: 100px; padding: 3px; }',
    '.pat-range-btn { padding: 5px 11px; font-size: 11px; font-weight: 700; background: transparent; color: var(--text-secondary, #A0A0B0); border: none; border-radius: 100px; cursor: pointer; font-family: inherit; }',
    '.pat-range-btn.active { background: var(--bg-elevated, #22222F); color: var(--text-primary, #F0F0F5); }',

    /* Truth card */
    '.pat-truth-card { background: var(--bg-card, #1E1E2A); border: 1px solid var(--border-light, rgba(255,255,255,0.06)); border-radius: 18px; padding: 20px; margin-bottom: 28px; }',
    '.pat-truth-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }',
    '.pat-truth-label { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary, #A0A0B0); margin-bottom: 4px; }',
    '.pat-truth-title { font-size: 17px; font-weight: 700; color: var(--text-primary, #F0F0F5); }',

    /* Phase bands row above chart */
    '.pat-phase-bands { display: flex; width: 100%; gap: 2px; margin-bottom: 6px; }',
    '.pat-phase-band { font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; text-align: center; padding: 5px 0; border-radius: 4px 4px 0 0; }',

    '.pat-chart-svg { width: 100%; height: 140px; display: block; }',
    '.pat-chart-legend { display: flex; gap: 14px; margin-top: 10px; font-size: 11px; color: var(--text-secondary, #A0A0B0); }',
    '.pat-chart-legend span { display: inline-flex; align-items: center; gap: 5px; }',
    '.pat-truth-caption { font-size: 13px; color: var(--text-body, #C0C0D0); line-height: 1.55; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-light, rgba(255,255,255,0.06)); font-style: italic; }',

    /* Power Window */
    '.pat-section-h { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary, #A0A0B0); margin-bottom: 14px; }',
    '.pat-pw-wrap { margin-bottom: 28px; }',
    '.pat-pw-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }',
    '.pat-pw-day { aspect-ratio: 1 / 1.4; border-radius: 10px; padding: 8px 4px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-align: center; }',
    '.pat-pw-day .dow { color: rgba(255,255,255,0.7); text-transform: uppercase; }',
    '.pat-pw-day .dom { font-size: 16px; font-weight: 800; font-family: \'Plus Jakarta Sans\', sans-serif; color: var(--text-primary, #F0F0F5); }',
    '.pat-pw-day .energy { font-size: 9px; color: rgba(255,255,255,0.55); }',
    '.pat-pw-day.today { outline: 2px solid var(--text-primary, #F0F0F5); outline-offset: -2px; }',
    '.pat-pw-hint { font-size: 12px; color: var(--text-secondary, #A0A0B0); margin-top: 10px; }',

    /* Patterns I Noticed */
    '.pat-noticed-wrap { margin-bottom: 28px; }',
    '.pat-noticed-card { background: var(--bg-card, #1E1E2A); border: 1px solid var(--border-light, rgba(255,255,255,0.06)); border-left: 3px solid var(--teal, #00E5A0); border-radius: 14px; padding: 16px 16px 14px; margin-bottom: 10px; }',
    '.pat-noticed-card.warn { border-left-color: var(--coral, #E87461); }',
    '.pat-noticed-action { font-size: 16px; font-weight: 700; color: var(--text-primary, #F0F0F5); line-height: 1.35; margin-bottom: 6px; }',
    '.pat-noticed-why { font-size: 13px; color: var(--text-secondary, #A0A0B0); }',
    '.pat-noticed-meta { font-size: 11px; color: var(--text-secondary, #A0A0B0); margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }',

    /* Recommendations */
    '.pat-recs-wrap { margin-bottom: 28px; }',
    '.pat-recs-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }',
    '.pat-recs-head h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary, #F0F0F5); }',
    '.pat-ai-badge { display: inline-flex; align-items: center; background: rgba(0,229,160,0.14); border: 1px solid rgba(0,229,160,0.25); color: var(--teal, #00E5A0); font-size: 10px; font-weight: 800; letter-spacing: 1.5px; padding: 3px 8px; border-radius: 5px; }',
    '.pat-rec-card { background: var(--bg-card, #1E1E2A); border: 1px solid var(--border-light, rgba(255,255,255,0.06)); border-left: 3px solid var(--coral, #E87461); border-radius: 12px; padding: 16px 18px 14px; margin-bottom: 10px; }',
    '.pat-rec-card.sleep { border-left-color: var(--teal, #00E5A0); }',
    '.pat-rec-card.stress { border-left-color: var(--coral, #E87461); }',
    '.pat-rec-card.confidence { border-left-color: #FFD700; }',
    '.pat-rec-card.routine { border-left-color: #8B7BDB; }',
    '.pat-rec-body { font-size: 14px; color: var(--text-body, #C0C0D0); line-height: 1.55; margin-bottom: 10px; }',
    '.pat-rec-tag { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: var(--text-secondary, #A0A0B0); text-transform: uppercase; }',

    /* Recommendations shimmer */
    '.pat-shimmer-card { border-radius: 12px; padding: 16px; margin-bottom: 10px; background: var(--bg-surface, #1A1A26); overflow: hidden; position: relative; }',
    '.pat-shimmer-card::after { content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent); animation: pat-shimmer 1.5s infinite; }',
    '@keyframes pat-shimmer { 0% { left: -100%; } 100% { left: 100%; } }',
    '.pat-shimmer-line { height: 12px; border-radius: 4px; background: rgba(255,255,255,0.05); margin-bottom: 8px; }',
    '.pat-shimmer-line:last-child { width: 60%; margin-bottom: 0; }',

    /* Days-until-Peak countdown */
    '.pat-countdown { background: var(--bg-card, #1E1E2A); border: 1px solid var(--border-light, rgba(255,255,255,0.06)); border-radius: 18px; padding: 24px 20px; margin-bottom: 24px; text-align: center; position: relative; overflow: hidden; }',
    '.pat-countdown::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #FFD700, #FFB347); }',
    '.pat-countdown .label { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #FFD700; margin-bottom: 12px; }',
    '.pat-countdown .big { font-family: \'Plus Jakarta Sans\', sans-serif; font-weight: 800; font-size: 76px; line-height: 1; letter-spacing: -0.04em; background: linear-gradient(180deg, #FFD700 0%, #FFB347 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 4px; }',
    '.pat-countdown .units { font-size: 12px; font-weight: 600; color: var(--text-secondary, #A0A0B0); letter-spacing: 0.5px; margin-bottom: 12px; }',
    '.pat-countdown .window { font-size: 14px; font-weight: 700; color: var(--text-primary, #F0F0F5); }',
    '.pat-countdown .window em { font-style: normal; color: #FFD700; }',
    '.pat-countdown.in-peak .label { color: #FFD700; }',

    /* Wrapped teaser */
    '.pat-wrapped { background: linear-gradient(135deg, rgba(199,125,186,0.18), rgba(0,229,160,0.10), rgba(255,215,0,0.10), rgba(139,123,219,0.18)); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 22px; margin-bottom: 18px; text-align: center; }',
    '.pat-wrapped .label { font-size: 10px; font-weight: 800; letter-spacing: 3px; color: #FFD700; text-transform: uppercase; margin-bottom: 8px; }',
    '.pat-wrapped .title { font-family: \'Plus Jakarta Sans\', sans-serif; font-size: 24px; font-weight: 800; color: var(--text-primary, #F0F0F5); margin-bottom: 6px; }',
    '.pat-wrapped .sub { font-size: 13px; color: var(--text-body, #C0C0D0); margin-bottom: 4px; }',
    '.pat-wrapped .soon { font-size: 11px; color: var(--text-secondary, #A0A0B0); letter-spacing: 1px; text-transform: uppercase; }',

    /* Footnote / All patterns expander */
    '.pat-footnote { margin-top: 16px; }',
    '.pat-footnote summary { list-style: none; cursor: pointer; text-align: center; font-size: 12px; color: var(--teal, #00E5A0); padding: 8px; }',
    '.pat-footnote summary::-webkit-details-marker { display: none; }',
    '.pat-footnote-body { padding-top: 8px; }',
    '.pat-footnote-row { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06)); font-size: 12px; }',
    '.pat-footnote-row:last-child { border-bottom: 0; }',
    '.pat-footnote-row .sentdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }',
    '.pat-footnote-row .sentdot.pos { background: var(--teal, #00E5A0); }',
    '.pat-footnote-row .sentdot.neg { background: var(--coral, #E87461); }',
    '.pat-footnote-row .desc { flex: 1; color: var(--text-body, #C0C0D0); }',
    '.pat-footnote-row .conf { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary, #A0A0B0); }',

    /* Locked state (preserved from prior version) */
    '.pat-lock-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px 16px; }',
    '.pat-lock-icon { width: 64px; height: 64px; position: relative; margin-bottom: 20px; }',
    '.pat-lock-body { width: 40px; height: 28px; background: rgba(255,255,255,0.08); border-radius: 6px; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-shackle { width: 24px; height: 22px; border: 3px solid rgba(255,255,255,0.15); border-bottom: none; border-radius: 12px 12px 0 0; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-keyhole { width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%; position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-keyhole::after { content: ""; width: 2px; height: 6px; background: rgba(255,255,255,0.15); position: absolute; top: 5px; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-count { font-size: 20px; font-weight: 700; color: var(--text-primary, #F0F0F5); margin-bottom: 8px; text-align: center; }',
    '.pat-lock-msg { font-size: 15px; color: var(--text-secondary, #A0A0B0); text-align: center; margin-bottom: 24px; line-height: 1.5; }',
    '.pat-progress-track { width: 100%; max-width: 280px; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; margin-bottom: 24px; }',
    '.pat-progress-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #00E5A0, #E87461); transition: width 0.6s ease; }',
    '.pat-cta-btn { background: var(--coral, #E87461); color: #fff; border: none; border-radius: 8px; padding: 14px 32px; font-size: 16px; font-weight: 600; cursor: pointer; font-family: inherit; }',

    /* Empty state */
    '.pat-empty { text-align: center; padding: 32px 16px; color: var(--text-secondary, #A0A0B0); font-size: 15px; line-height: 1.5; }'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('pat-styles')) return;
    var style = document.createElement('style');
    style.id = 'pat-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ── DOM helpers ───────────────────────────────────────────────────

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function addDays(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  var DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtMonthDay(date) { return MONTH_SHORT[date.getMonth()] + ' ' + date.getDate(); }

  // ── Data gathering ────────────────────────────────────────────────

  function getFilteredCheckins(days) {
    var all = Store.getCheckins();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var cutoffStr = Utils.getDateString(cutoff);
    var result = [];
    var keys = Object.keys(all);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] >= cutoffStr) result.push(all[keys[i]]);
    }
    result.sort(function (a, b) { return a.date.localeCompare(b.date); });
    return result;
  }

  function computeDayOfWeekData(checkins) {
    var buckets = {};
    for (var d = 0; d < 7; d++) buckets[d] = { energies: [], confidences: [] };
    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      var dt = Utils.parseDate(c.date);
      if (!dt) continue;
      buckets[dt.getDay()].energies.push(c.energy);
      buckets[dt.getDay()].confidences.push(c.confidence);
    }
    var result = [];
    for (var d2 = 0; d2 < 7; d2++) {
      result.push({ day: DOW_SHORT[d2], energy: Utils.mean(buckets[d2].energies), confidence: Utils.mean(buckets[d2].confidences) });
    }
    return result;
  }

  // ── Pattern Detection ─────────────────────────────────────────────

  function detectCorrelations(checkins) {
    var patterns = [], sleeps = [], stresses = [];
    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      if (c.sleepQuality != null) sleeps.push({ sleep: c.sleepQuality, energy: c.energy, confidence: c.confidence });
      if (c.stressLevel != null) stresses.push({ stress: c.stressLevel, energy: c.energy, confidence: c.confidence });
    }

    function pushIf(id, descPos, descNeg, arr, xKey, yKey, positiveWhen) {
      if (arr.length < 14) return;
      var r = Utils.pearsonCorrelation(arr.map(function (s) { return s[xKey]; }), arr.map(function (s) { return s[yKey]; }));
      if (r === null || Math.abs(r) < 0.4) return;
      var positive = (positiveWhen === 'pos') ? r > 0 : r < 0;
      patterns.push({
        id: id, type: 'correlation',
        description: positive ? descPos : descNeg,
        confidenceScore: Math.min(Math.abs(r), 1),
        dataPointsUsed: arr.length, positive: positive
      });
    }

    pushIf('corr-sleep-energy', 'Better sleep strongly correlates with higher energy', 'Sleep quality shows inverse pattern with energy', sleeps, 'sleep', 'energy', 'pos');
    pushIf('corr-sleep-confidence', 'Better sleep boosts your confidence levels', 'Sleep quality shows inverse pattern with confidence', sleeps, 'sleep', 'confidence', 'pos');
    pushIf('corr-stress-energy', 'Higher stress drains your energy levels', 'Stress shows an unusual positive link with energy', stresses, 'stress', 'energy', 'neg');
    pushIf('corr-stress-confidence', 'Higher stress reduces your confidence', 'Stress shows an unusual positive link with confidence', stresses, 'stress', 'confidence', 'neg');

    return patterns;
  }

  function detectCyclePatterns(checkins, cycleProfile) {
    if (!cycleProfile || !cycleProfile.trackingEnabled) return [];

    var phaseData = { Menstrual: [], Follicular: [], Ovulatory: [], Luteal: [] };
    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      var cycleDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, cycleProfile.averageCycleLength, c.date);
      if (!cycleDay) continue;
      var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
      if (!phase) continue;
      var phaseKey = phase.charAt(0).toUpperCase() + phase.slice(1);
      if (phaseData[phaseKey]) phaseData[phaseKey].push(c);
    }

    var overallEnergy = Utils.mean(checkins.map(function (c) { return c.energy; }));
    var overallConfidence = Utils.mean(checkins.map(function (c) { return c.confidence; }));
    var patterns = [];

    var phases = Object.keys(phaseData);
    for (var p = 0; p < phases.length; p++) {
      var phaseName = phases[p];
      var data = phaseData[phaseName];
      if (data.length < 3) continue;
      var mode = Cycle.getPerformanceMode(phaseName.toLowerCase());

      var phaseEnergy = Utils.mean(data.map(function (c) { return c.energy; }));
      var energyDev = phaseEnergy - overallEnergy;
      if (Math.abs(energyDev) >= 0.8) {
        patterns.push({
          id: 'cycle-energy-' + phaseName.toLowerCase(), type: 'cycle',
          description: energyDev > 0
            ? 'Your energy peaks during ' + phaseName + ' phase (' + mode + ' mode)'
            : 'Energy dips during ' + phaseName + ' phase, so schedule lighter tasks',
          confidenceScore: Math.min(Math.abs(energyDev) / 3, 1),
          dataPointsUsed: data.length, positive: energyDev > 0
        });
      }

      var phaseConfidence = Utils.mean(data.map(function (c) { return c.confidence; }));
      var confDev = phaseConfidence - overallConfidence;
      if (Math.abs(confDev) >= 0.8) {
        patterns.push({
          id: 'cycle-confidence-' + phaseName.toLowerCase(), type: 'cycle',
          description: confDev > 0
            ? 'Confidence rises during ' + phaseName + ' phase (' + mode + ' mode)'
            : 'Confidence dips during ' + phaseName + ' phase, so lean on your routines',
          confidenceScore: Math.min(Math.abs(confDev) / 3, 1),
          dataPointsUsed: data.length, positive: confDev > 0
        });
      }
    }
    return patterns;
  }

  function detectDayPatterns(checkins) {
    if (checkins.length < 21) return [];
    var dayBuckets = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      var d = Utils.parseDate(c.date);
      if (!d) continue;
      dayBuckets[d.getDay()].push(c);
    }

    var overallEnergy = Utils.mean(checkins.map(function (c) { return c.energy; }));
    var overallConfidence = Utils.mean(checkins.map(function (c) { return c.confidence; }));
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var patterns = [];

    for (var dow = 0; dow < 7; dow++) {
      var data = dayBuckets[dow];
      if (data.length < 3) continue;

      var dayEnergy = Utils.mean(data.map(function (c) { return c.energy; }));
      var energyDev = dayEnergy - overallEnergy;
      if (Math.abs(energyDev) >= 1.0) {
        patterns.push({
          id: 'day-energy-' + dow, type: 'day-of-week',
          description: energyDev > 0
            ? dayNames[dow] + 's are your highest-energy day!'
            : dayNames[dow] + 's tend to be lower energy, so plan accordingly',
          confidenceScore: Math.min(Math.abs(energyDev) / 3, 1),
          dataPointsUsed: data.length, positive: energyDev > 0
        });
      }

      var dayConf = Utils.mean(data.map(function (c) { return c.confidence; }));
      var confDev = dayConf - overallConfidence;
      if (Math.abs(confDev) >= 1.0) {
        patterns.push({
          id: 'day-confidence-' + dow, type: 'day-of-week',
          description: confDev > 0
            ? dayNames[dow] + 's are your peak confidence day!'
            : dayNames[dow] + 's tend to be lower confidence, so schedule supportive tasks',
          confidenceScore: Math.min(Math.abs(confDev) / 3, 1),
          dataPointsUsed: data.length, positive: confDev > 0
        });
      }
    }
    return patterns;
  }

  // ── Phase / cycle helpers ────────────────────────────────────────

  function getCurrentPhaseInfo(cycleProfile) {
    if (!cycleProfile || !cycleProfile.trackingEnabled || !cycleProfile.lastPeriodStart) return null;
    var len = cycleProfile.averageCycleLength || 28;
    var today = Utils.getDateString(new Date());
    var day = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, today);
    if (!day) return null;
    var phase = Cycle.getPhase(day, len);
    return {
      phase: phase,
      mode: Cycle.getPerformanceMode(phase),
      day: day,
      cycleLength: len
    };
  }

  function getDaysUntilPeak(cycleProfile) {
    if (!cycleProfile || !cycleProfile.trackingEnabled || !cycleProfile.lastPeriodStart) return null;
    var len = cycleProfile.averageCycleLength || 28;
    var today = new Date();
    var todayStr = Utils.getDateString(today);
    var todayDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, todayStr);
    if (!todayDay) return null;

    // Walk forward until we hit ovulatory phase.
    for (var offset = 0; offset < len * 2; offset++) {
      var future = addDays(today, offset);
      var fStr = Utils.getDateString(future);
      var fDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, fStr);
      if (!fDay) continue;
      var fPhase = Cycle.getPhase(fDay, len);
      if (fPhase === 'ovulatory') {
        // If we're already in ovulatory today, find the END instead so the countdown shows time left in Peak.
        if (offset === 0) {
          for (var off2 = 1; off2 < len; off2++) {
            var fut2 = addDays(today, off2);
            var f2Day = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, Utils.getDateString(fut2));
            var f2Phase = Cycle.getPhase(f2Day, len);
            if (f2Phase !== 'ovulatory') {
              return { days: off2, inPeak: true, startDate: today, endDate: addDays(future, off2 - 1) };
            }
          }
          return null;
        }
        // Find the end of this ovulatory window
        var endOffset = offset;
        for (var off3 = offset + 1; off3 < len * 2; off3++) {
          var fut3 = addDays(today, off3);
          var f3Day = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, Utils.getDateString(fut3));
          var f3Phase = Cycle.getPhase(f3Day, len);
          if (f3Phase !== 'ovulatory') break;
          endOffset = off3;
        }
        return { days: offset, inPeak: false, startDate: future, endDate: addDays(today, endOffset) };
      }
    }
    return null;
  }

  var DOT_HEADLINES = {
    Restore: {
      headline: 'This week is for <em style="color:#C77DBA">recovery, not output</em>.',
      sub: 'You’re in Restore. Your energy is naturally lower right now. Rest now and you’ll come back stronger.'
    },
    Rise: {
      headline: 'Your acceleration window is <em style="color:#00E5A0">opening</em>.',
      sub: 'You’re in Rise. Energy is climbing toward your Peak. Start the harder projects this week.'
    },
    Peak: {
      headline: 'Full capacity. <em style="color:#FFD700">Spend it on what matters</em>.',
      sub: 'You’re in Peak. This is the window. Pitches, big asks, ambitious moves — schedule them now.'
    },
    Sustain: {
      headline: 'This week is for <em style="color:#8B7BDB">protecting what you’ve built</em>.',
      sub: 'You’re in Sustain. Energy will dip and that’s biological, not willpower. Sleep is your lever.'
    }
  };

  function getDotHeadline(mode, days) {
    if (mode && DOT_HEADLINES[mode]) return DOT_HEADLINES[mode];
    return {
      headline: 'Your last <em style="color:#00E5A0">' + (days || 30) + ' days</em>, at a glance.',
      sub: 'Once we know your cycle, Dot can tell you what’s coming. For now: here’s what your check-ins are saying.'
    };
  }

  // Returns array of contiguous phase bands for a date range.
  function getPhaseBandsForRange(startDate, daysCount, cycleProfile) {
    if (!cycleProfile || !cycleProfile.trackingEnabled || !cycleProfile.lastPeriodStart) return null;
    var len = cycleProfile.averageCycleLength || 28;
    var bands = [];
    var current = null;
    for (var d = 0; d < daysCount; d++) {
      var dt = addDays(startDate, d);
      var cycleDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, Utils.getDateString(dt));
      var phase = cycleDay ? Cycle.getPhase(cycleDay, len) : null;
      var mode = phase ? Cycle.getPerformanceMode(phase) : null;
      if (current && current.mode === mode) {
        current.spanDays += 1;
      } else {
        if (current) bands.push(current);
        current = { mode: mode, spanDays: 1 };
      }
    }
    if (current) bands.push(current);
    return bands;
  }

  // ── Section: top bar + hero ──────────────────────────────────────

  function renderTopbar(checkinCount, days) {
    var bar = el('div', 'pat-topbar');
    bar.appendChild(el('span', 'crumb', 'Patterns'));
    var meta = el('span', 'meta');
    meta.textContent = checkinCount + ' check-in' + (checkinCount !== 1 ? 's' : '') + ' · last ' + days + ' days';
    bar.appendChild(meta);
    return bar;
  }

  function renderHero(phaseInfo, days) {
    var frag = document.createDocumentFragment();

    if (phaseInfo) {
      var color = PHASE_HEX[phaseInfo.mode] || '#00E5A0';
      var pill = el('span', 'pat-phase-pill');
      pill.style.background = 'rgba(0,0,0,0.001)';
      pill.style.background = hexToRgba(color, 0.14);
      pill.style.border = '1px solid ' + hexToRgba(color, 0.32);
      pill.style.color = color;
      var dot = el('span', 'dot');
      dot.style.background = color;
      pill.appendChild(dot);
      pill.appendChild(document.createTextNode(' ' + phaseInfo.mode + ' · Day ' + phaseInfo.day + ' of ' + phaseInfo.cycleLength));
      frag.appendChild(pill);
    }

    var copy = getDotHeadline(phaseInfo ? phaseInfo.mode : null, days);
    var headline = el('h1', 'pat-headline');
    headline.innerHTML = copy.headline;
    frag.appendChild(headline);

    frag.appendChild(el('p', 'pat-sub', copy.sub));

    var sig = el('div', 'pat-dot-sig');
    sig.appendChild(el('div', 'pat-dot-avatar', 'D'));
    var sigTxt = el('div');
    sigTxt.textContent = 'Dot · written today';
    sig.appendChild(sigTxt);
    frag.appendChild(sig);

    return frag;
  }

  function hexToRgba(hex, alpha) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ── Section: The Truth chart ─────────────────────────────────────

  function renderTruthCard(checkins, cycleProfile, days, onRangeChange) {
    var card = el('div', 'pat-truth-card');

    // Header row: title + range selector
    var head = el('div', 'pat-truth-head');
    var titleBox = el('div');
    titleBox.appendChild(el('div', 'pat-truth-label', 'The Truth'));
    titleBox.appendChild(el('div', 'pat-truth-title', 'Your last ' + days + ' days'));
    head.appendChild(titleBox);

    var rangeRow = el('div', 'pat-range-row');
    [30, 60, 90].forEach(function (d) {
      var btn = el('button', 'pat-range-btn' + (d === days ? ' active' : ''), d + 'd');
      btn.addEventListener('click', function () { onRangeChange(d); });
      rangeRow.appendChild(btn);
    });
    head.appendChild(rangeRow);
    card.appendChild(head);

    // Phase band labels above SVG
    var rangeStart = addDays(new Date(), -(days - 1));
    var bands = getPhaseBandsForRange(rangeStart, days, cycleProfile);
    if (bands && bands.length > 0) {
      var bandsRow = el('div', 'pat-phase-bands');
      bands.forEach(function (b) {
        var band = el('div', 'pat-phase-band');
        band.style.flex = String(b.spanDays);
        if (b.mode) {
          band.textContent = b.mode;
          band.style.color = PHASE_HEX[b.mode];
          band.style.background = hexToRgba(PHASE_HEX[b.mode], 0.14);
        } else {
          band.textContent = '';
          band.style.background = 'rgba(255,255,255,0.04)';
        }
        bandsRow.appendChild(band);
      });
      card.appendChild(bandsRow);
    }

    // SVG chart
    card.appendChild(buildTruthSVG(checkins, cycleProfile, days, rangeStart, bands));

    // Legend
    var legend = el('div', 'pat-chart-legend');
    var leg1 = el('span');
    leg1.innerHTML = '<span style="width:10px;height:2px;background:#00E5A0;display:inline-block;"></span> Energy';
    var leg2 = el('span');
    leg2.innerHTML = '<span style="width:10px;height:0;border-top:2px dashed #E87461;display:inline-block;"></span> Confidence';
    legend.appendChild(leg1);
    legend.appendChild(leg2);
    card.appendChild(legend);

    // Caption (Dot voice)
    var caption = buildTruthCaption(checkins, cycleProfile);
    if (caption) {
      var cap = el('p', 'pat-truth-caption');
      cap.textContent = caption;
      card.appendChild(cap);
    }

    return card;
  }

  function buildTruthSVG(checkins, cycleProfile, days, rangeStart, bands) {
    var W = 600, H = 140;
    var TOP = 14, BOT = 126;
    var s = svg('svg', { 'class': 'pat-chart-svg', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });

    // Phase backdrop bands
    if (bands && bands.length > 0) {
      var totalDays = days;
      var cursor = 0;
      bands.forEach(function (b) {
        var x = (cursor / totalDays) * W;
        var w = (b.spanDays / totalDays) * W;
        if (b.mode) {
          var rect = svg('rect', { x: x, y: 0, width: w, height: H, fill: hexToRgba(PHASE_HEX[b.mode], 0.08) });
          s.appendChild(rect);
        }
        cursor += b.spanDays;
      });
    }

    // Build map of date->checkin within range
    var byDate = {};
    checkins.forEach(function (c) { byDate[c.date] = c; });

    function dayToX(idx) {
      if (days <= 1) return W / 2;
      return (idx / (days - 1)) * W;
    }
    function valToY(v) {
      var clamped = clamp(v, 1, 10);
      return BOT - ((clamped - 1) / 9) * (BOT - TOP);
    }

    var energyPts = [], confPts = [];
    for (var i = 0; i < days; i++) {
      var dt = addDays(rangeStart, i);
      var dStr = Utils.getDateString(dt);
      var c = byDate[dStr];
      if (!c) continue;
      var x = dayToX(i);
      energyPts.push(x + ',' + valToY(c.energy));
      confPts.push(x + ',' + valToY(c.confidence));
    }

    if (energyPts.length > 0) {
      s.appendChild(svg('polyline', {
        fill: 'none', stroke: '#00E5A0', 'stroke-width': '2.5', 'stroke-linejoin': 'round',
        points: energyPts.join(' ')
      }));
    }
    if (confPts.length > 0) {
      s.appendChild(svg('polyline', {
        fill: 'none', stroke: '#E87461', 'stroke-width': '2', 'stroke-dasharray': '3 3', 'stroke-linejoin': 'round',
        points: confPts.join(' ')
      }));
    }

    // Today marker
    var todayX = dayToX(days - 1);
    s.appendChild(svg('line', { x1: todayX, y1: 0, x2: todayX, y2: H, stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '1', 'stroke-dasharray': '2 2' }));
    var todayCheckin = byDate[Utils.getDateString(new Date())];
    if (todayCheckin) {
      s.appendChild(svg('circle', { cx: todayX, cy: valToY(todayCheckin.energy), r: 4, fill: '#F0F0F5' }));
    }

    return s;
  }

  function buildTruthCaption(checkins, cycleProfile) {
    if (!checkins.length) return null;
    var phaseInfo = getCurrentPhaseInfo(cycleProfile);
    if (!phaseInfo) return null;

    if (phaseInfo.mode === 'Peak') return 'You’re in your Peak window. Spend it.';
    if (phaseInfo.mode === 'Rise') return 'Energy is rising. The next two weeks are your acceleration zone.';
    if (phaseInfo.mode === 'Sustain') return 'Don’t expect Peak energy this week. Expect it again at your next Rise.';
    if (phaseInfo.mode === 'Restore') return 'Lowest-energy week of your cycle. Honor it. Rise is coming.';
    return null;
  }

  // ── Section: Power Window 7-day strip ────────────────────────────

  function renderPowerWindow(cycleProfile) {
    var section = el('div', 'pat-pw-wrap');
    section.appendChild(el('div', 'pat-section-h', 'Power Window — Next 7 Days'));

    var strip = el('div', 'pat-pw-strip');
    var today = new Date();
    for (var i = 0; i < 7; i++) {
      var dt = addDays(today, i);
      var dayCell = el('div', 'pat-pw-day' + (i === 0 ? ' today' : ''));

      var mode = null;
      if (cycleProfile && cycleProfile.trackingEnabled && cycleProfile.lastPeriodStart) {
        var len = cycleProfile.averageCycleLength || 28;
        var cycleDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, len, Utils.getDateString(dt));
        if (cycleDay) {
          var phase = Cycle.getPhase(cycleDay, len);
          mode = Cycle.getPerformanceMode(phase);
        }
      }
      if (mode) {
        var c = PHASE_HEX[mode];
        dayCell.style.background = 'linear-gradient(180deg, ' + hexToRgba(c, 0.35) + ', ' + hexToRgba(c, 0.10) + ')';
      } else {
        dayCell.style.background = 'rgba(255,255,255,0.05)';
      }

      var dow = el('span', 'dow', DOW_SHORT[dt.getDay()]);
      var dom = el('span', 'dom', String(dt.getDate()));
      var en = el('span', 'energy', mode ? PHASE_ENERGY_RANGES[mode] : '—');
      dayCell.appendChild(dow);
      dayCell.appendChild(dom);
      dayCell.appendChild(en);
      strip.appendChild(dayCell);
    }

    section.appendChild(strip);
    section.appendChild(el('p', 'pat-pw-hint', 'Color = phase. Numbers = expected energy range.'));
    return section;
  }

  // ── Section: Patterns I Noticed (top 3 verb-led) ─────────────────

  function renderPatternsNoticed(patterns) {
    var section = el('div', 'pat-noticed-wrap');
    section.appendChild(el('div', 'pat-section-h', 'Patterns I Noticed'));

    if (!patterns.length) {
      section.appendChild(el('div', 'pat-empty', 'Keep checking in. Patterns will appear as the data grows.'));
      return section;
    }

    var top = patterns.slice(0, 3);
    top.forEach(function (p) {
      var card = el('div', 'pat-noticed-card' + (p.positive ? '' : ' warn'));
      card.appendChild(el('div', 'pat-noticed-action', p.description));
      var conf;
      if (p.confidenceScore >= 0.7) conf = 'High confidence';
      else if (p.confidenceScore >= 0.4) conf = 'Moderate';
      else conf = 'Emerging';
      var meta = el('div', 'pat-noticed-meta');
      meta.textContent = conf + ' · ' + p.dataPointsUsed + ' data points';
      card.appendChild(meta);
      section.appendChild(card);
    });

    return section;
  }

  // ── Section: Recommendations (AI-driven) ─────────────────────────

  var aiInsightsLoading = false;

  function renderRecommendationsShimmer() {
    var section = el('div', 'pat-recs-wrap');
    section.id = 'pat-recs-section';
    var head = el('div', 'pat-recs-head');
    head.appendChild(el('h2', null, 'Recommendations'));
    head.appendChild(el('span', 'pat-ai-badge', 'AI'));
    section.appendChild(head);
    for (var i = 0; i < 3; i++) {
      var sh = el('div', 'pat-shimmer-card');
      sh.appendChild(el('div', 'pat-shimmer-line'));
      sh.appendChild(el('div', 'pat-shimmer-line'));
      sh.appendChild(el('div', 'pat-shimmer-line'));
      section.appendChild(sh);
    }
    return section;
  }

  function renderRecommendations(insights) {
    var section = el('div', 'pat-recs-wrap');
    section.id = 'pat-recs-section';

    var head = el('div', 'pat-recs-head');
    head.appendChild(el('h2', null, 'Recommendations'));
    head.appendChild(el('span', 'pat-ai-badge', 'AI'));
    section.appendChild(head);

    var recs = (insights && insights.recommendations) || [];
    if (!recs.length) {
      // Fall back to surfacing pattern-level insights as recs if API didn't return any
      var pi = (insights && insights.patternInsights) || [];
      pi.slice(0, 4).forEach(function (item) {
        var card = el('div', 'pat-rec-card ' + classifyCategory(item.type));
        var body = el('div', 'pat-rec-body');
        body.textContent = item.actionTip || item.description || item.title || '';
        card.appendChild(body);
        if (item.type) card.appendChild(el('div', 'pat-rec-tag', item.type));
        section.appendChild(card);
      });
      if (!pi.length) {
        section.appendChild(el('div', 'pat-empty', 'Recommendations will appear once the AI has enough data.'));
      }
      return section;
    }

    recs.forEach(function (r) {
      var category = (r.category || '').toLowerCase();
      var card = el('div', 'pat-rec-card ' + classifyCategory(category));
      card.appendChild(el('div', 'pat-rec-body', r.text || ''));
      if (r.category) card.appendChild(el('div', 'pat-rec-tag', r.category));
      section.appendChild(card);
    });

    return section;
  }

  function classifyCategory(cat) {
    if (!cat) return '';
    var c = String(cat).toLowerCase();
    if (c.indexOf('sleep') >= 0) return 'sleep';
    if (c.indexOf('stress') >= 0) return 'stress';
    if (c.indexOf('confidence') >= 0 || c.indexOf('cycle') >= 0) return 'confidence';
    if (c.indexOf('routine') >= 0 || c.indexOf('habit') >= 0) return 'routine';
    return '';
  }

  function fetchAndRenderAI() {
    if (aiInsightsLoading) return;
    aiInsightsLoading = true;

    var cached = Store.getInsights && Store.getInsights();
    if (cached && cached.ready && (cached.recommendations || cached.patternInsights)) {
      replaceRecsSection(renderRecommendations(cached));
      aiInsightsLoading = false;
      return;
    }

    if (!window.PeakHer.API || !window.PeakHer.API.getInsights) {
      aiInsightsLoading = false;
      return;
    }

    window.PeakHer.API.getInsights().then(function (result) {
      aiInsightsLoading = false;
      if (!result || !result.ready) return;
      replaceRecsSection(renderRecommendations(result));
    }).catch(function () {
      aiInsightsLoading = false;
    });
  }

  function replaceRecsSection(newSection) {
    var existing = document.getElementById('pat-recs-section');
    if (existing) existing.parentNode.replaceChild(newSection, existing);
  }

  // ── Section: Days until next Peak ────────────────────────────────

  function renderCountdownToPeak(cycleProfile) {
    var info = getDaysUntilPeak(cycleProfile);
    if (!info) return null;

    var card = el('div', 'pat-countdown' + (info.inPeak ? ' in-peak' : ''));
    card.appendChild(el('div', 'label', '★ Power Window'));
    card.appendChild(el('div', 'big', String(info.days)));
    card.appendChild(el('div', 'units', info.inPeak ? 'days left in your Peak' : 'days until your next Peak'));
    var win = el('div', 'window');
    win.innerHTML = fmtMonthDay(info.startDate) + ' → ' + fmtMonthDay(info.endDate) + ' · <em>full capacity</em>';
    card.appendChild(win);
    return card;
  }

  // ── Section: Wrapped teaser ──────────────────────────────────────

  function renderWrapped() {
    var w = el('div', 'pat-wrapped');
    w.appendChild(el('div', 'label', '★ PeakHer Wrapped'));
    var monthName = MONTH_SHORT[new Date().getMonth()];
    w.appendChild(el('div', 'title', 'Your ' + monthName + ', in one read.'));
    w.appendChild(el('div', 'sub', 'Peak days, power windows, what the data caught.'));
    w.appendChild(el('div', 'soon', 'Coming soon'));
    return w;
  }

  // ── Section: All-patterns expander ───────────────────────────────

  function renderAllPatternsFootnote(patterns) {
    if (!patterns.length) return null;
    var det = document.createElement('details');
    det.className = 'pat-footnote';
    var summary = document.createElement('summary');
    summary.textContent = 'View all ' + patterns.length + ' detected patterns →';
    det.appendChild(summary);

    var body = el('div', 'pat-footnote-body');
    patterns.forEach(function (p) {
      var row = el('div', 'pat-footnote-row');
      row.appendChild(el('span', 'sentdot ' + (p.positive ? 'pos' : 'neg')));
      row.appendChild(el('span', 'desc', p.description));
      var conf;
      if (p.confidenceScore >= 0.7) conf = 'High';
      else if (p.confidenceScore >= 0.4) conf = 'Mod';
      else conf = 'Em';
      row.appendChild(el('span', 'conf', conf));
      body.appendChild(row);
    });
    det.appendChild(body);
    return det;
  }

  // ── Locked state ─────────────────────────────────────────────────

  function renderLockedState(count) {
    var remaining = UNLOCK_THRESHOLD - count;
    var pct = Math.round((count / UNLOCK_THRESHOLD) * 100);

    var wrap = el('div', 'pat-lock-wrap');

    var lockIcon = el('div', 'pat-lock-icon');
    lockIcon.appendChild(el('div', 'pat-lock-shackle'));
    var body = el('div', 'pat-lock-body');
    body.appendChild(el('div', 'pat-lock-keyhole'));
    lockIcon.appendChild(body);
    wrap.appendChild(lockIcon);

    wrap.appendChild(el('div', 'pat-lock-count', remaining + ' more check-in' + (remaining !== 1 ? 's' : '') + ' to unlock patterns'));

    var track = el('div', 'pat-progress-track');
    var fill = el('div', 'pat-progress-fill');
    fill.style.width = pct + '%';
    track.appendChild(fill);
    wrap.appendChild(track);

    var msg = '';
    if (count <= 5) msg = 'Every check-in teaches us about your rhythms';
    else if (count <= 15) msg = 'Patterns are forming. Keep going!';
    else msg = 'Almost there! Your data is getting powerful';
    wrap.appendChild(el('p', 'pat-lock-msg', msg));

    var btn = el('button', 'pat-cta-btn', 'Go to Check-in →');
    btn.addEventListener('click', function () {
      if (window.PeakHer.Router) window.PeakHer.Router.navigate('#checkin');
    });
    wrap.appendChild(btn);

    return wrap;
  }

  // ── Compose: active state ────────────────────────────────────────

  function buildActiveUI(checkins, cycleProfile, days) {
    var frag = document.createDocumentFragment();
    var phaseInfo = getCurrentPhaseInfo(cycleProfile);

    frag.appendChild(renderTopbar(checkins.length, days));
    frag.appendChild(renderHero(phaseInfo, days));

    frag.appendChild(renderTruthCard(checkins, cycleProfile, days, function (newDays) {
      activeRange = newDays;
      refresh();
    }));

    if (cycleProfile && cycleProfile.trackingEnabled) {
      frag.appendChild(renderPowerWindow(cycleProfile));
    }

    var allPatterns = []
      .concat(detectCorrelations(checkins))
      .concat(detectCyclePatterns(checkins, cycleProfile))
      .concat(detectDayPatterns(checkins));
    allPatterns.sort(function (a, b) { return b.confidenceScore - a.confidenceScore; });
    Store.setPatterns(allPatterns);

    frag.appendChild(renderPatternsNoticed(allPatterns));

    var recsShimmer = renderRecommendationsShimmer();
    frag.appendChild(recsShimmer);

    var countdown = renderCountdownToPeak(cycleProfile);
    if (countdown) frag.appendChild(countdown);

    frag.appendChild(renderWrapped());

    var foot = renderAllPatternsFootnote(allPatterns);
    if (foot) frag.appendChild(foot);

    return frag;
  }

  // ── Top-level UI ─────────────────────────────────────────────────

  function buildUI() {
    container.innerHTML = '';
    var wrap = el('div', 'pat-wrap');
    var totalCount = Store.getCheckinCount();

    if (totalCount < UNLOCK_THRESHOLD) {
      wrap.appendChild(el('div', 'pat-topbar', '<span class="crumb">Patterns</span><span class="meta">' + totalCount + ' of ' + UNLOCK_THRESHOLD + ' check-ins</span>'));
      wrap.appendChild(renderLockedState(totalCount));
      container.appendChild(wrap);
      return;
    }

    var checkins = getFilteredCheckins(activeRange);
    if (checkins.length === 0) {
      wrap.appendChild(renderTopbar(0, activeRange));
      wrap.appendChild(el('div', 'pat-empty', 'No check-ins in the last ' + activeRange + ' days. Try a longer range.'));
      container.appendChild(wrap);
      return;
    }

    var cycleProfile = Store.getCycleProfile();
    wrap.appendChild(buildActiveUI(checkins, cycleProfile, activeRange));
    container.appendChild(wrap);

    requestAnimationFrame(function () { fetchAndRenderAI(); });
  }

  function init() {
    container = document.getElementById('screen-patterns');
    if (!container) {
      console.warn('PeakHer.Patterns: #screen-patterns not found');
      return;
    }
    injectStyles();
    buildUI();
  }

  function refresh() {
    if (!container) container = document.getElementById('screen-patterns');
    if (!container) return;
    // Note: no longer using Chart.js on this screen; other screens manage their own chart lifecycle.
    aiInsightsLoading = false;
    buildUI();
  }

  return { init: init, refresh: refresh };
})();
