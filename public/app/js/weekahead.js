/**
 * PeakHer Week Ahead Prediction Module
 * Generates a 7-day energy & confidence forecast using rolling averages,
 * day-of-week patterns, and (optionally) cycle-day averages.
 * Renders into #screen-weekahead.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.WeekAhead = (function () {
  'use strict';

  var Store  = window.PeakHer.Store;
  var Cycle  = window.PeakHer.Cycle;
  var Utils  = window.PeakHer.Utils;

  var container = null;
  var expandedCard = null;    // date string of currently expanded card
  var lastPredictions = null;

  // ── Activation thresholds ─────────────────────────────────────────

  var THRESHOLD_NO_CYCLE = 30;
  var THRESHOLD_WITH_CYCLE = 60;

  // ── Styles (injected once) ────────────────────────────────────────

  var STYLES = [
    /* Wrapper */
    '.wa-wrap { max-width: 520px; margin: 0 auto; padding: 24px 16px 40px; }',

    /* Header */
    '.wa-heading { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #fff; margin-bottom: 4px; }',
    '.wa-subtext { font-size: 15px; color: var(--gray-text); margin-bottom: 4px; line-height: 1.4; }',
    '.wa-updated { font-size: 12px; color: rgba(255,255,255,0.3); margin-bottom: 24px; }',

    /* Pre-activation state */
    '.wa-preact { text-align: center; padding: 48px 16px; }',
    '.wa-preact-icon { font-size: 48px; margin-bottom: 16px; }',
    '.wa-preact-heading { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }',
    '.wa-preact-msg { font-size: 15px; color: var(--gray-text); line-height: 1.5; margin-bottom: 24px; max-width: 320px; margin-left: auto; margin-right: auto; }',
    '.wa-progress-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); overflow: hidden; max-width: 300px; margin: 0 auto 8px; }',
    '.wa-progress-fill { height: 100%; border-radius: 4px; background: var(--teal); transition: width 0.4s ease; }',
    '.wa-progress-label { font-size: 13px; color: var(--gray-text); }',

    /* Horizontal scroll container */
    '.wa-cards { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; }',
    '.wa-cards::-webkit-scrollbar { height: 4px; }',
    '.wa-cards::-webkit-scrollbar-track { background: transparent; }',
    '.wa-cards::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }',

    /* Day card */
    '.wa-card { flex-shrink: 0; width: 140px; background: var(--navy-light); border-radius: 12px; padding: 16px; cursor: pointer; border: 2px solid transparent; transition: border-color 0.25s, box-shadow 0.25s, max-height 0.35s ease; scroll-snap-align: start; overflow: hidden; max-height: 260px; }',
    '.wa-card.best { border-color: var(--teal); box-shadow: 0 0 12px rgba(45,138,138,0.15); }',
    '.wa-card.expanded { max-height: 600px; }',

    /* Card top */
    '.wa-card-day { font-size: 16px; font-weight: 700; color: #fff; }',
    '.wa-card-date { font-size: 13px; color: var(--gray-text); margin-bottom: 12px; }',

    /* Mini bars */
    '.wa-bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }',
    '.wa-bar-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }',
    '.wa-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }',
    '.wa-bar-fill.energy { background: var(--teal); }',
    '.wa-bar-fill.confidence { background: var(--coral); }',
    '.wa-bar-val { font-size: 13px; font-weight: 700; min-width: 16px; text-align: right; }',
    '.wa-bar-val.energy { color: var(--teal); }',
    '.wa-bar-val.confidence { color: var(--coral); }',

    /* Phase badge */
    '.wa-phase-badge { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 10px; margin-top: 8px; background: rgba(255,255,255,0.06); }',

    /* Signal badge */
    '.wa-signal { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 8px; margin-top: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; }',
    '.wa-signal.teal { background: rgba(45,138,138,0.15); color: var(--teal); }',
    '.wa-signal.coral { background: rgba(232,116,97,0.15); color: var(--coral); }',
    '.wa-signal.gold { background: rgba(196,154,94,0.15); color: #C49A5E; }',

    /* Expanded detail section */
    '.wa-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); opacity: 0; transition: opacity 0.25s ease 0.1s; }',
    '.wa-card.expanded .wa-detail { opacity: 1; }',
    '.wa-detail-row { font-size: 12px; color: var(--gray-text); margin-bottom: 4px; line-height: 1.4; }',
    '.wa-detail-label { color: rgba(255,255,255,0.5); }',
    '.wa-detail-value { color: #fff; font-weight: 600; }',
    '.wa-detail-phase-desc { font-size: 12px; color: var(--gray-text); margin-top: 6px; font-style: italic; line-height: 1.4; }',
    '.wa-confidence-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-top: 6px; }',
    '.wa-confidence-badge.high { background: rgba(45,138,138,0.15); color: var(--teal); }',
    '.wa-confidence-badge.moderate { background: rgba(196,154,94,0.15); color: #C49A5E; }',
    '.wa-confidence-badge.low { background: rgba(232,116,97,0.15); color: var(--coral); }',

    /* Best day callout */
    '.wa-best-callout { text-align: center; padding: 16px; margin: 20px 0; background: rgba(45,138,138,0.08); border-radius: 12px; border: 1px solid rgba(45,138,138,0.15); }',
    '.wa-best-callout-text { font-size: 16px; font-weight: 600; color: #fff; }',
    '.wa-best-callout-text span { color: var(--teal); }',

    /* Chart section */
    '.wa-chart-section { margin-top: 28px; }',
    '.wa-chart-heading { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; }',
    '.wa-chart-canvas { width: 100%; height: 200px; background: var(--navy-light); border-radius: 12px; }'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('wa-styles')) return;
    var style = document.createElement('style');
    style.id = 'wa-styles';
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

  // ── Prediction engine ─────────────────────────────────────────────

  /**
   * Rolling average of last 7 actual check-ins for a given metric.
   */
  function getRollingAverage(checkins, metric) {
    var sorted = Object.values(checkins).sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    var recent = sorted.slice(0, 7);
    if (recent.length === 0) return null;
    return Utils.mean(recent.map(function (c) { return c[metric]; }));
  }

  /**
   * Average for a specific day-of-week (0=Sun .. 6=Sat).
   */
  function getDayOfWeekAverage(checkins, dayOfWeek, metric) {
    var matching = [];
    Object.values(checkins).forEach(function (c) {
      if (new Date(c.date + 'T12:00:00').getDay() === dayOfWeek) {
        matching.push(c[metric]);
      }
    });
    if (matching.length === 0) return null;
    return Utils.mean(matching);
  }

  /**
   * Average for a specific cycle day (1-based).
   */
  function getCycleDayAverage(checkins, targetCycleDay, metric) {
    var matching = [];
    Object.values(checkins).forEach(function (c) {
      if (c.cycleDay === targetCycleDay) {
        matching.push(c[metric]);
      }
    });
    if (matching.length === 0) return null;
    return Utils.mean(matching);
  }

  /**
   * Produce a single-day prediction object.
   */
  function predict(checkins, targetDate, cycleProfile) {
    var hasCycle = cycleProfile && cycleProfile.trackingEnabled;

    var rollingWeight = hasCycle ? 0.3 : 0.6;
    var dowWeight     = hasCycle ? 0.2 : 0.4;
    var cycleWeight   = hasCycle ? 0.5 : 0;

    var targetDow = new Date(targetDate + 'T12:00:00').getDay();
    var targetCycleDay = null;
    var targetPhase = null;

    if (hasCycle) {
      targetCycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        new Date(targetDate + 'T12:00:00')
      );
      targetPhase = Cycle.getPhase(targetCycleDay, cycleProfile.averageCycleLength);
    }

    function predictMetric(metric) {
      var rolling  = getRollingAverage(checkins, metric);
      var dow      = getDayOfWeekAverage(checkins, targetDow, metric);
      var cycleAvg = (hasCycle && targetCycleDay)
        ? getCycleDayAverage(checkins, targetCycleDay, metric)
        : null;

      var totalWeight = 0;
      var weighted = 0;

      if (rolling !== null)  { weighted += rolling * rollingWeight;  totalWeight += rollingWeight; }
      if (dow !== null)      { weighted += dow * dowWeight;          totalWeight += dowWeight; }
      if (cycleAvg !== null) { weighted += cycleAvg * cycleWeight;   totalWeight += cycleWeight; }

      if (totalWeight === 0) return 5; // fallback
      return Utils.clamp(Math.round(weighted / totalWeight), 1, 10);
    }

    var predEnergy     = predictMetric('energy');
    var predConfidence = predictMetric('confidence');

    // Prediction confidence based on how many data components contributed
    var components = 0;
    if (getRollingAverage(checkins, 'energy') !== null) components++;
    if (getDayOfWeekAverage(checkins, targetDow, 'energy') !== null) components++;
    if (hasCycle && targetCycleDay && getCycleDayAverage(checkins, targetCycleDay, 'energy') !== null) components++;
    var predictionConfidence = components / (hasCycle ? 3 : 2);

    // Store the raw component values for the detail panel
    var detailRollingEnergy  = getRollingAverage(checkins, 'energy');
    var detailDowEnergy      = getDayOfWeekAverage(checkins, targetDow, 'energy');
    var detailCycleEnergy    = (hasCycle && targetCycleDay)
      ? getCycleDayAverage(checkins, targetCycleDay, 'energy')
      : null;
    var detailRollingConf    = getRollingAverage(checkins, 'confidence');
    var detailDowConf        = getDayOfWeekAverage(checkins, targetDow, 'confidence');
    var detailCycleConf      = (hasCycle && targetCycleDay)
      ? getCycleDayAverage(checkins, targetCycleDay, 'confidence')
      : null;

    return {
      date: targetDate,
      predictedEnergy: predEnergy,
      predictedConfidence: predConfidence,
      cycleDay: targetCycleDay,
      cyclePhase: targetPhase,
      predictionConfidence: predictionConfidence,
      // Detail breakdown
      _rollingEnergy: detailRollingEnergy,
      _dowEnergy: detailDowEnergy,
      _cycleEnergy: detailCycleEnergy,
      _rollingConf: detailRollingConf,
      _dowConf: detailDowConf,
      _cycleConf: detailCycleConf,
      _hasCycle: hasCycle,
      _rollingWeight: rollingWeight,
      _dowWeight: dowWeight,
      _cycleWeight: cycleWeight
    };
  }

  /**
   * Generate forecasts for the next 7 days, persist to Store.
   */
  function generateForecast() {
    var checkins = Store.getCheckins();
    var cycleProfile = Store.getCycleProfile();
    var predictions = {};

    for (var i = 1; i <= 7; i++) {
      var targetDate = Utils.addDays(Utils.getToday(), i);
      var pred = predict(checkins, targetDate, cycleProfile);
      predictions[targetDate] = pred;
    }

    Store.setPredictions(predictions);
    lastPredictions = predictions;
    return predictions;
  }

  // ── Activation check ──────────────────────────────────────────────

  function isActivated() {
    var count = Store.getCheckinCount();
    var cycleProfile = Store.getCycleProfile();
    var hasCycle = cycleProfile && cycleProfile.trackingEnabled;
    var threshold = hasCycle ? THRESHOLD_WITH_CYCLE : THRESHOLD_NO_CYCLE;
    return count >= threshold;
  }

  function getActivationInfo() {
    var count = Store.getCheckinCount();
    var cycleProfile = Store.getCycleProfile();
    var hasCycle = cycleProfile && cycleProfile.trackingEnabled;
    var threshold = hasCycle ? THRESHOLD_WITH_CYCLE : THRESHOLD_NO_CYCLE;
    return {
      count: count,
      threshold: threshold,
      hasCycle: hasCycle,
      percent: Math.min(100, Math.round((count / threshold) * 100))
    };
  }

  // ── Signal badges ─────────────────────────────────────────────────

  function getSignal(pred) {
    var e = pred.predictedEnergy;
    var c = pred.predictedConfidence;

    if (e >= 7 && c >= 7) return { text: 'Great Day Ahead', cls: 'gold' };
    if (e >= 8)           return { text: 'High Energy Expected', cls: 'teal' };
    if (c >= 8)           return { text: 'Peak Confidence', cls: 'teal' };
    if (e <= 4)           return { text: 'Rest Day', cls: 'coral' };
    return null;
  }

  // ── Find best day ─────────────────────────────────────────────────

  function findBestDay(predictions) {
    var bestDate = null;
    var bestScore = -1;
    var keys = Object.keys(predictions);
    for (var i = 0; i < keys.length; i++) {
      var p = predictions[keys[i]];
      var score = p.predictedEnergy + p.predictedConfidence;
      if (score > bestScore) {
        bestScore = score;
        bestDate = keys[i];
      }
    }
    return bestDate;
  }

  // ── Format helpers ────────────────────────────────────────────────

  function roundDisplay(val) {
    if (val === null || val === undefined) return '--';
    return Math.round(val * 10) / 10;
  }

  function confidenceLabel(val) {
    if (val >= 0.8) return { text: 'High', cls: 'high' };
    if (val >= 0.5) return { text: 'Moderate', cls: 'moderate' };
    return { text: 'Low', cls: 'low' };
  }

  function formatTimestamp() {
    var d = new Date();
    var hh = d.getHours();
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return hh + ':' + mm + ' ' + ampm;
  }

  // ── Render: pre-activation state ──────────────────────────────────

  function renderPreActivation() {
    container.innerHTML = '';
    var wrap = el('div', 'wa-wrap');

    var preact = el('div', 'wa-preact');

    var icon = el('div', 'wa-preact-icon', '\uD83D\uDD2E'); // crystal ball
    preact.appendChild(icon);

    var heading = el('div', 'wa-preact-heading', 'Week Ahead Predictions');
    preact.appendChild(heading);

    var info = getActivationInfo();
    var msg;
    if (info.hasCycle) {
      msg = 'With cycle tracking enabled, we need ' + info.threshold +
        ' check-ins to build accurate cycle-day averages for your predictions.';
    } else {
      msg = 'We need ' + info.threshold +
        ' check-ins to learn your patterns and generate reliable predictions.';
    }
    var msgEl = el('div', 'wa-preact-msg', msg);
    preact.appendChild(msgEl);

    // Progress bar
    var barOuter = el('div', 'wa-progress-bar');
    var barFill = el('div', 'wa-progress-fill');
    barFill.style.width = info.percent + '%';
    barOuter.appendChild(barFill);
    preact.appendChild(barOuter);

    var label = el('div', 'wa-progress-label',
      info.count + ' of ' + info.threshold + ' check-ins (' + info.percent + '%)');
    preact.appendChild(label);

    wrap.appendChild(preact);
    container.appendChild(wrap);
  }

  // ── Render: active state ──────────────────────────────────────────

  function renderActive(predictions) {
    container.innerHTML = '';
    var wrap = el('div', 'wa-wrap');

    // Header
    var heading = el('div', 'wa-heading', 'Week Ahead');
    wrap.appendChild(heading);

    var sub = el('div', 'wa-subtext', 'Based on your patterns');
    wrap.appendChild(sub);

    var updated = el('div', 'wa-updated', 'Updated at ' + formatTimestamp());
    wrap.appendChild(updated);

    // Find best day
    var bestDate = findBestDay(predictions);

    // Card container
    var cardsWrap = el('div', 'wa-cards');

    var dates = Object.keys(predictions).sort();
    for (var i = 0; i < dates.length; i++) {
      var dateStr = dates[i];
      var pred = predictions[dateStr];
      var card = buildDayCard(dateStr, pred, dateStr === bestDate);
      cardsWrap.appendChild(card);
    }

    wrap.appendChild(cardsWrap);

    // Best day callout
    if (bestDate) {
      var bestPred = predictions[bestDate];
      var bestDateObj = Utils.parseDate(bestDate);
      var bestDayName = bestDateObj ? Utils.formatDayName(bestDateObj) : '';
      var callout = el('div', 'wa-best-callout');
      callout.innerHTML = '<div class="wa-best-callout-text">Your best day this week: <span>' +
        bestDayName + '</span></div>';
      wrap.appendChild(callout);
    }

    // Chart section
    var chartSection = el('div', 'wa-chart-section');
    var chartHeading = el('div', 'wa-chart-heading', '7-Day Energy & Confidence Forecast');
    chartSection.appendChild(chartHeading);

    var canvas = document.createElement('canvas');
    canvas.id = 'weekahead-chart';
    canvas.className = 'wa-chart-canvas';
    chartSection.appendChild(canvas);

    wrap.appendChild(chartSection);
    container.appendChild(wrap);

    // Render chart if Charts module is available
    if (window.PeakHer.Charts && typeof window.PeakHer.Charts.renderWeekAheadBars === 'function') {
      var chartData = dates.map(function (d) {
        var p = predictions[d];
        var dateObj = Utils.parseDate(d);
        return {
          dayName: dateObj ? Utils.formatDayShort(dateObj) : d,
          predictedEnergy: p.predictedEnergy,
          predictedConfidence: p.predictedConfidence
        };
      });
      window.PeakHer.Charts.renderWeekAheadBars('weekahead-chart', chartData);
    }
  }

  // ── Build a single day card ───────────────────────────────────────

  function buildDayCard(dateStr, pred, isBest) {
    var dateObj = Utils.parseDate(dateStr);
    var dayName = dateObj ? Utils.formatDayShort(dateObj) : '';
    var dateDisplay = dateObj ? Utils.formatDateShort(dateObj) : '';

    var card = el('div', 'wa-card' + (isBest ? ' best' : ''));
    card.setAttribute('data-date', dateStr);

    // Day name
    var dayEl = el('div', 'wa-card-day', dayName);
    card.appendChild(dayEl);

    // Date
    var dateEl = el('div', 'wa-card-date', dateDisplay);
    card.appendChild(dateEl);

    // Energy bar
    var energyRow = el('div', 'wa-bar-row');
    var energyTrack = el('div', 'wa-bar-track');
    var energyFill = el('div', 'wa-bar-fill energy');
    energyFill.style.width = (pred.predictedEnergy * 10) + '%';
    energyTrack.appendChild(energyFill);
    energyRow.appendChild(energyTrack);
    var energyVal = el('span', 'wa-bar-val energy', String(pred.predictedEnergy));
    energyRow.appendChild(energyVal);
    card.appendChild(energyRow);

    // Confidence bar
    var confRow = el('div', 'wa-bar-row');
    var confTrack = el('div', 'wa-bar-track');
    var confFill = el('div', 'wa-bar-fill confidence');
    confFill.style.width = (pred.predictedConfidence * 10) + '%';
    confTrack.appendChild(confFill);
    confRow.appendChild(confTrack);
    var confVal = el('span', 'wa-bar-val confidence', String(pred.predictedConfidence));
    confRow.appendChild(confVal);
    card.appendChild(confRow);

    // Cycle phase badge (if tracking)
    if (pred.cyclePhase) {
      var phaseEmoji = Cycle.getPhaseEmoji(pred.cyclePhase);
      var mode = Cycle.getPerformanceMode(pred.cyclePhase);
      var modeColor = Cycle.getModeColor(mode);
      var badge = el('div', 'wa-phase-badge');
      badge.textContent = phaseEmoji + ' ' + mode;
      badge.style.color = modeColor;
      badge.style.background = modeColor + '1A';
      card.appendChild(badge);
    }

    // Signal badge
    var signal = getSignal(pred);
    if (signal) {
      var sigEl = el('div', 'wa-signal ' + signal.cls, signal.text);
      card.appendChild(sigEl);
    }

    // Detail panel (hidden until expanded)
    var detail = buildDetailPanel(pred);
    card.appendChild(detail);

    // Tap-to-expand
    card.addEventListener('click', function () {
      toggleCardExpand(card, dateStr);
    });

    return card;
  }

  // ── Build detail panel for a card ─────────────────────────────────

  function buildDetailPanel(pred) {
    var detail = el('div', 'wa-detail');

    // Energy breakdown
    var energyTitle = el('div', 'wa-detail-row');
    energyTitle.innerHTML = '<strong style="color:#fff;">Energy Breakdown</strong>';
    detail.appendChild(energyTitle);

    var rollingRow = el('div', 'wa-detail-row');
    rollingRow.innerHTML = '<span class="wa-detail-label">Rolling avg: </span>' +
      '<span class="wa-detail-value">' + roundDisplay(pred._rollingEnergy) + '</span>' +
      '<span class="wa-detail-label"> (w: ' + Math.round(pred._rollingWeight * 100) + '%)</span>';
    detail.appendChild(rollingRow);

    var dowRow = el('div', 'wa-detail-row');
    dowRow.innerHTML = '<span class="wa-detail-label">Day-of-week avg: </span>' +
      '<span class="wa-detail-value">' + roundDisplay(pred._dowEnergy) + '</span>' +
      '<span class="wa-detail-label"> (w: ' + Math.round(pred._dowWeight * 100) + '%)</span>';
    detail.appendChild(dowRow);

    if (pred._hasCycle) {
      var cycleRow = el('div', 'wa-detail-row');
      cycleRow.innerHTML = '<span class="wa-detail-label">Cycle-day avg: </span>' +
        '<span class="wa-detail-value">' + roundDisplay(pred._cycleEnergy) + '</span>' +
        '<span class="wa-detail-label"> (w: ' + Math.round(pred._cycleWeight * 100) + '%)</span>';
      detail.appendChild(cycleRow);
    }

    // Confidence breakdown
    var confTitle = el('div', 'wa-detail-row');
    confTitle.style.marginTop = '8px';
    confTitle.innerHTML = '<strong style="color:#fff;">Confidence Breakdown</strong>';
    detail.appendChild(confTitle);

    var rollingConfRow = el('div', 'wa-detail-row');
    rollingConfRow.innerHTML = '<span class="wa-detail-label">Rolling avg: </span>' +
      '<span class="wa-detail-value">' + roundDisplay(pred._rollingConf) + '</span>';
    detail.appendChild(rollingConfRow);

    var dowConfRow = el('div', 'wa-detail-row');
    dowConfRow.innerHTML = '<span class="wa-detail-label">Day-of-week avg: </span>' +
      '<span class="wa-detail-value">' + roundDisplay(pred._dowConf) + '</span>';
    detail.appendChild(dowConfRow);

    if (pred._hasCycle) {
      var cycleConfRow = el('div', 'wa-detail-row');
      cycleConfRow.innerHTML = '<span class="wa-detail-label">Cycle-day avg: </span>' +
        '<span class="wa-detail-value">' + roundDisplay(pred._cycleConf) + '</span>';
      detail.appendChild(cycleConfRow);
    }

    // Phase description (if cycle tracking)
    if (pred.cyclePhase) {
      var mode = Cycle.getPerformanceMode(pred.cyclePhase);
      var desc = Cycle.getModeDescription(mode);
      var phaseDesc = el('div', 'wa-detail-phase-desc',
        Cycle.getPhaseEmoji(pred.cyclePhase) + ' ' + desc);
      detail.appendChild(phaseDesc);
    }

    // Prediction confidence
    var confInfo = confidenceLabel(pred.predictionConfidence);
    var confBadge = el('div', 'wa-confidence-badge ' + confInfo.cls,
      'Prediction confidence: ' + confInfo.text);
    detail.appendChild(confBadge);

    return detail;
  }

  // ── Card expand / collapse ────────────────────────────────────────

  function toggleCardExpand(card, dateStr) {
    if (expandedCard === dateStr) {
      // Collapse current
      card.classList.remove('expanded');
      expandedCard = null;
    } else {
      // Collapse any previously expanded
      if (container) {
        var prev = container.querySelector('.wa-card.expanded');
        if (prev) prev.classList.remove('expanded');
      }
      // Expand this one
      card.classList.add('expanded');
      expandedCard = dateStr;
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  function init() {
    container = document.getElementById('screen-weekahead');
    if (!container) {
      console.warn('PeakHer.WeekAhead: #screen-weekahead not found');
      return;
    }

    injectStyles();

    if (!isActivated()) {
      renderPreActivation();
      return;
    }

    var predictions = generateForecast();
    renderActive(predictions);
  }

  function refresh() {
    container = document.getElementById('screen-weekahead');
    if (!container) return;

    injectStyles();
    expandedCard = null;

    if (!isActivated()) {
      renderPreActivation();
      return;
    }

    var predictions = generateForecast();
    renderActive(predictions);
  }

  return {
    init: init,
    refresh: refresh
  };
})();
