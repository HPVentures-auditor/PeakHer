/**
 * PeakHer Patterns Dashboard
 * Detects performance patterns from check-in data and renders
 * an interactive insights dashboard with charts.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Patterns = (function () {
  'use strict';

  var Store  = window.PeakHer.Store;
  var Utils  = window.PeakHer.Utils;
  var Cycle  = window.PeakHer.Cycle;
  var Charts = window.PeakHer.Charts;

  var UNLOCK_THRESHOLD = 25;
  var container;          // #screen-patterns
  var activeRange = 30;   // default time range in days

  // ── Styles (injected once) ────────────────────────────────────────

  var STYLES = [
    '.pat-wrap { max-width: 600px; margin: 0 auto; padding: 24px 16px 100px; }',

    /* Heading */
    '.pat-heading { font-size: 24px; font-weight: 800; color: var(--text-dark, #1a1a2e); margin-bottom: 4px; letter-spacing: -0.3px; }',
    '.pat-subtext { font-size: 14px; color: var(--gray-text, #6b7280); margin-bottom: 24px; }',

    /* Pre-activation lock state */
    '.pat-lock-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px 16px; }',
    '.pat-lock-icon { width: 64px; height: 64px; position: relative; margin-bottom: 20px; }',
    '.pat-lock-body { width: 40px; height: 28px; background: rgba(0,0,0,0.08); border-radius: 6px; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-shackle { width: 24px; height: 22px; border: 3px solid rgba(0,0,0,0.15); border-bottom: none; border-radius: 12px 12px 0 0; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-keyhole { width: 6px; height: 6px; background: rgba(0,0,0,0.15); border-radius: 50%; position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-keyhole::after { content: ""; width: 2px; height: 6px; background: rgba(0,0,0,0.15); position: absolute; top: 5px; left: 50%; transform: translateX(-50%); }',
    '.pat-lock-count { font-size: 20px; font-weight: 700; color: var(--text-dark, #1a1a2e); margin-bottom: 8px; text-align: center; }',
    '.pat-lock-msg { font-size: 15px; color: var(--gray-text, #6b7280); text-align: center; margin-bottom: 24px; line-height: 1.5; }',

    /* Progress bar */
    '.pat-progress-track { width: 100%; max-width: 280px; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; margin-bottom: 24px; }',
    '.pat-progress-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #E87461, #2D8A8A); transition: width 0.6s ease; }',

    /* Go to check-in button */
    '.pat-cta-btn { background: var(--coral, #E87461); color: #fff; border: none; border-radius: 8px; padding: 14px 32px; font-size: 16px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.2s, transform 0.15s; }',
    '.pat-cta-btn:hover { background: var(--coral-hover, #d4634f); }',
    '.pat-cta-btn:active { transform: scale(0.98); }',

    /* Time range selector */
    '.pat-range-row { display: flex; gap: 0; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-light, rgba(0,0,0,0.06)); }',
    '.pat-range-btn { flex: 1; padding: 10px 0; font-size: 14px; font-weight: 600; text-align: center; border: none; background: transparent; color: var(--gray-text, #6b7280); cursor: pointer; font-family: inherit; transition: background 0.2s, color 0.2s; }',
    '.pat-range-btn.active { background: var(--teal, #2D8A8A); color: #fff; }',

    /* Chart containers */
    '.pat-chart-wrap { width: 100%; height: 200px; margin-bottom: 32px; position: relative; }',
    '.pat-chart-wrap canvas { width: 100% !important; height: 100% !important; }',
    '.pat-section-heading { font-size: 16px; font-weight: 700; color: var(--text-dark, #1a1a2e); margin-bottom: 12px; }',

    /* Pattern cards */
    '.pat-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }',
    '.pat-card { background: var(--warm-gray, #f3f0ec); border-radius: 12px; padding: 16px; position: relative; overflow: hidden; }',
    '.pat-card-accent { position: absolute; top: 0; left: 0; width: 4px; height: 100%; }',
    '.pat-card-accent.positive { background: #2D8A8A; }',
    '.pat-card-accent.negative { background: #E87461; }',
    '.pat-card-body { padding-left: 12px; }',
    '.pat-card-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 2px 8px; border-radius: 4px; background: rgba(0,0,0,0.05); color: var(--gray-text, #6b7280); margin-bottom: 8px; }',
    '.pat-card-desc { font-size: 16px; color: var(--text-dark, #1a1a2e); line-height: 1.45; margin-bottom: 8px; }',
    '.pat-card-meta { display: flex; align-items: center; gap: 12px; }',
    '.pat-conf-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 4px; }',
    '.pat-conf-high { background: rgba(45,138,138,0.2); color: #5EC49A; }',
    '.pat-conf-moderate { background: rgba(196,154,94,0.2); color: #C49A5E; }',
    '.pat-conf-emerging { background: rgba(0,0,0,0.05); color: var(--gray-text, #6b7280); }',
    '.pat-card-points { font-size: 12px; color: var(--gray-text, #6b7280); }',

    /* Empty state */
    '.pat-empty { text-align: center; padding: 32px 16px; color: var(--gray-text, #6b7280); font-size: 15px; line-height: 1.5; }',

    /* AI Insights section */
    '.pat-ai-section { margin-bottom: 28px; }',
    '.pat-ai-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }',
    '.pat-ai-badge { display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; border-radius: 4px; background: linear-gradient(135deg, rgba(45,138,138,0.25), rgba(232,116,97,0.25)); color: #5EC49A; }',
    '.pat-ai-card { background: linear-gradient(135deg, rgba(45,138,138,0.08), rgba(232,116,97,0.05)); border: 1px solid rgba(45,138,138,0.15); border-radius: 12px; padding: 16px; margin-bottom: 10px; }',
    '.pat-ai-card-title { font-size: 15px; font-weight: 700; color: var(--text-dark, #1a1a2e); margin-bottom: 6px; }',
    '.pat-ai-card-desc { font-size: 14px; color: var(--text-body, #374151); line-height: 1.5; margin-bottom: 8px; }',
    '.pat-ai-card-tip { font-size: 13px; color: var(--teal, #2D8A8A); font-style: italic; }',
    '.pat-ai-card-type { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 3px; background: rgba(0,0,0,0.05); color: var(--gray-text, #6b7280); margin-bottom: 8px; }',
    '.pat-ai-sentiment { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }',
    '.pat-ai-sentiment.positive { background: #2D8A8A; }',
    '.pat-ai-sentiment.negative { background: #E87461; }',
    '.pat-ai-sentiment.neutral { background: rgba(0,0,0,0.15); }',

    /* AI loading shimmer */
    '.pat-ai-shimmer { border-radius: 12px; padding: 16px; margin-bottom: 10px; background: var(--warm-gray, #f3f0ec); overflow: hidden; position: relative; }',
    '.pat-ai-shimmer::after { content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent); animation: pat-shimmer 1.5s infinite; }',
    '@keyframes pat-shimmer { 0% { left: -100%; } 100% { left: 100%; } }',
    '.pat-ai-shimmer-line { height: 14px; border-radius: 4px; background: rgba(0,0,0,0.06); margin-bottom: 8px; }',
    '.pat-ai-shimmer-line:last-child { width: 60%; margin-bottom: 0; }',

    /* AI recommendation cards */
    '.pat-ai-rec { background: var(--warm-gray, #f3f0ec); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; border-left: 3px solid; }',
    '.pat-ai-rec.high { border-left-color: #E87461; }',
    '.pat-ai-rec.medium { border-left-color: #C49A5E; }',
    '.pat-ai-rec.low { border-left-color: rgba(0,0,0,0.12); }',
    '.pat-ai-rec-text { font-size: 14px; color: var(--text-body, #374151); line-height: 1.45; }',
    '.pat-ai-rec-meta { font-size: 11px; color: var(--gray-text, #6b7280); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }'
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

  // ── Data gathering ────────────────────────────────────────────────

  function getFilteredCheckins(days) {
    var all = Store.getCheckins();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var cutoffStr = Utils.getDateString(cutoff);
    var result = [];
    var keys = Object.keys(all);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] >= cutoffStr) {
        result.push(all[keys[i]]);
      }
    }
    result.sort(function (a, b) { return a.date.localeCompare(b.date); });
    return result;
  }

  function computeDayOfWeekData(checkins) {
    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var buckets = {};
    for (var d = 0; d < 7; d++) {
      buckets[d] = { energies: [], confidences: [] };
    }
    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      var dt = Utils.parseDate(c.date);
      if (!dt) continue;
      var dow = dt.getDay();
      buckets[dow].energies.push(c.energy);
      buckets[dow].confidences.push(c.confidence);
    }
    var result = [];
    for (var d2 = 0; d2 < 7; d2++) {
      result.push({
        day: dayNames[d2],
        energy: Utils.mean(buckets[d2].energies),
        confidence: Utils.mean(buckets[d2].confidences)
      });
    }
    return result;
  }

  // ── Pattern Detection Strategy 1: Correlations ────────────────────

  function detectCorrelations(checkins) {
    var patterns = [];
    var sleeps = [];
    var stresses = [];

    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      if (c.sleepQuality != null) {
        sleeps.push({ sleep: c.sleepQuality, energy: c.energy, confidence: c.confidence });
      }
      if (c.stressLevel != null) {
        stresses.push({ stress: c.stressLevel, energy: c.energy, confidence: c.confidence });
      }
    }

    // Sleep-Energy correlation
    if (sleeps.length >= 14) {
      var r = Utils.pearsonCorrelation(
        sleeps.map(function (s) { return s.sleep; }),
        sleeps.map(function (s) { return s.energy; })
      );
      if (r !== null && Math.abs(r) >= 0.4) {
        patterns.push({
          id: 'corr-sleep-energy',
          type: 'correlation',
          description: r > 0
            ? 'Better sleep strongly correlates with higher energy'
            : 'Sleep quality shows inverse pattern with energy',
          confidenceScore: Math.min(Math.abs(r), 1),
          dataPointsUsed: sleeps.length,
          positive: r > 0
        });
      }
    }

    // Sleep-Confidence correlation
    if (sleeps.length >= 14) {
      var r2 = Utils.pearsonCorrelation(
        sleeps.map(function (s) { return s.sleep; }),
        sleeps.map(function (s) { return s.confidence; })
      );
      if (r2 !== null && Math.abs(r2) >= 0.4) {
        patterns.push({
          id: 'corr-sleep-confidence',
          type: 'correlation',
          description: r2 > 0
            ? 'Better sleep boosts your confidence levels'
            : 'Sleep quality shows inverse pattern with confidence',
          confidenceScore: Math.min(Math.abs(r2), 1),
          dataPointsUsed: sleeps.length,
          positive: r2 > 0
        });
      }
    }

    // Stress-Energy correlation
    if (stresses.length >= 14) {
      var r3 = Utils.pearsonCorrelation(
        stresses.map(function (s) { return s.stress; }),
        stresses.map(function (s) { return s.energy; })
      );
      if (r3 !== null && Math.abs(r3) >= 0.4) {
        patterns.push({
          id: 'corr-stress-energy',
          type: 'correlation',
          description: r3 < 0
            ? 'Higher stress drains your energy levels'
            : 'Stress shows an unusual positive link with energy',
          confidenceScore: Math.min(Math.abs(r3), 1),
          dataPointsUsed: stresses.length,
          positive: r3 < 0
        });
      }
    }

    // Stress-Confidence correlation
    if (stresses.length >= 14) {
      var r4 = Utils.pearsonCorrelation(
        stresses.map(function (s) { return s.stress; }),
        stresses.map(function (s) { return s.confidence; })
      );
      if (r4 !== null && Math.abs(r4) >= 0.4) {
        patterns.push({
          id: 'corr-stress-confidence',
          type: 'correlation',
          description: r4 < 0
            ? 'Higher stress reduces your confidence'
            : 'Stress shows an unusual positive link with confidence',
          confidenceScore: Math.min(Math.abs(r4), 1),
          dataPointsUsed: stresses.length,
          positive: r4 < 0
        });
      }
    }

    return patterns;
  }

  // ── Pattern Detection Strategy 2: Cycle Phases ────────────────────

  function detectCyclePatterns(checkins, cycleProfile) {
    if (!cycleProfile || !cycleProfile.trackingEnabled) return [];

    var phaseData = { Menstrual: [], Follicular: [], Ovulatory: [], Luteal: [] };

    for (var i = 0; i < checkins.length; i++) {
      var c = checkins[i];
      // Determine phase from cycle engine
      var cycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        c.date
      );
      if (!cycleDay) continue;
      var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
      if (!phase) continue;
      var phaseKey = phase.charAt(0).toUpperCase() + phase.slice(1);
      if (phaseData[phaseKey]) {
        phaseData[phaseKey].push(c);
      }
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

      // Energy pattern
      var phaseEnergy = Utils.mean(data.map(function (c) { return c.energy; }));
      var energyDev = phaseEnergy - overallEnergy;
      if (Math.abs(energyDev) >= 0.8) {
        patterns.push({
          id: 'cycle-energy-' + phaseName.toLowerCase(),
          type: 'cycle',
          description: energyDev > 0
            ? 'Your energy peaks during ' + phaseName + ' phase (' + mode + ' mode)'
            : 'Energy dips during ' + phaseName + ' phase \u2014 schedule lighter tasks',
          confidenceScore: Math.min(Math.abs(energyDev) / 3, 1),
          dataPointsUsed: data.length,
          positive: energyDev > 0
        });
      }

      // Confidence pattern
      var phaseConfidence = Utils.mean(data.map(function (c) { return c.confidence; }));
      var confDev = phaseConfidence - overallConfidence;
      if (Math.abs(confDev) >= 0.8) {
        patterns.push({
          id: 'cycle-confidence-' + phaseName.toLowerCase(),
          type: 'cycle',
          description: confDev > 0
            ? 'Confidence rises during ' + phaseName + ' phase (' + mode + ' mode)'
            : 'Confidence dips during ' + phaseName + ' phase \u2014 lean on your routines',
          confidenceScore: Math.min(Math.abs(confDev) / 3, 1),
          dataPointsUsed: data.length,
          positive: confDev > 0
        });
      }
    }

    return patterns;
  }

  // ── Pattern Detection Strategy 3: Day of Week ────────────────────

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
          id: 'day-energy-' + dow,
          type: 'day-of-week',
          description: energyDev > 0
            ? dayNames[dow] + 's are your highest-energy day!'
            : dayNames[dow] + 's tend to be lower energy \u2014 plan accordingly',
          confidenceScore: Math.min(Math.abs(energyDev) / 3, 1),
          dataPointsUsed: data.length,
          positive: energyDev > 0
        });
      }

      var dayConf = Utils.mean(data.map(function (c) { return c.confidence; }));
      var confDev = dayConf - overallConfidence;
      if (Math.abs(confDev) >= 1.0) {
        patterns.push({
          id: 'day-confidence-' + dow,
          type: 'day-of-week',
          description: confDev > 0
            ? dayNames[dow] + 's are your peak confidence day!'
            : dayNames[dow] + 's tend to be lower confidence \u2014 schedule supportive tasks',
          confidenceScore: Math.min(Math.abs(confDev) / 3, 1),
          dataPointsUsed: data.length,
          positive: confDev > 0
        });
      }
    }

    return patterns;
  }

  // ── Render: Pre-activation (locked) state ─────────────────────────

  function renderLockedState(count) {
    var remaining = UNLOCK_THRESHOLD - count;
    var pct = Math.round((count / UNLOCK_THRESHOLD) * 100);

    var wrap = el('div', 'pat-lock-wrap');

    // CSS-only padlock
    var lockIcon = el('div', 'pat-lock-icon');
    lockIcon.appendChild(el('div', 'pat-lock-shackle'));
    var body = el('div', 'pat-lock-body');
    body.appendChild(el('div', 'pat-lock-keyhole'));
    lockIcon.appendChild(body);
    wrap.appendChild(lockIcon);

    wrap.appendChild(el('div', 'pat-lock-count', remaining + ' more check-in' + (remaining !== 1 ? 's' : '') + ' to unlock patterns'));

    // Progress bar
    var track = el('div', 'pat-progress-track');
    var fill = el('div', 'pat-progress-fill');
    fill.style.width = pct + '%';
    track.appendChild(fill);
    wrap.appendChild(track);

    // Encouraging message
    var msg = '';
    if (count <= 5) {
      msg = 'Every check-in teaches us about your rhythms';
    } else if (count <= 15) {
      msg = 'Patterns are forming \u2014 keep going!';
    } else {
      msg = 'Almost there! Your data is getting powerful';
    }
    wrap.appendChild(el('p', 'pat-lock-msg', msg));

    // CTA button
    var btn = el('button', 'pat-cta-btn', 'Go to Check-in \u2192');
    btn.addEventListener('click', function () {
      if (window.PeakHer.Router) {
        window.PeakHer.Router.navigate('#checkin');
      }
    });
    wrap.appendChild(btn);

    return wrap;
  }

  // ── Render: Pattern card ──────────────────────────────────────────

  function renderPatternCard(pattern) {
    var card = el('div', 'pat-card');

    // Left accent bar
    var accent = el('div', 'pat-card-accent ' + (pattern.positive ? 'positive' : 'negative'));
    card.appendChild(accent);

    var body = el('div', 'pat-card-body');

    // Type badge
    var typeLabelMap = {
      'correlation': 'Correlation',
      'cycle': 'Cycle',
      'day-of-week': 'Day of Week'
    };
    var badge = el('span', 'pat-card-badge', typeLabelMap[pattern.type] || pattern.type);
    body.appendChild(badge);

    // Description
    body.appendChild(el('p', 'pat-card-desc', pattern.description));

    // Meta row: confidence + data points
    var meta = el('div', 'pat-card-meta');

    var confLabel, confClass;
    if (pattern.confidenceScore >= 0.7) {
      confLabel = 'High';
      confClass = 'pat-conf-badge pat-conf-high';
    } else if (pattern.confidenceScore >= 0.4) {
      confLabel = 'Moderate';
      confClass = 'pat-conf-badge pat-conf-moderate';
    } else {
      confLabel = 'Emerging';
      confClass = 'pat-conf-badge pat-conf-emerging';
    }
    meta.appendChild(el('span', confClass, confLabel));
    meta.appendChild(el('span', 'pat-card-points', 'Based on ' + pattern.dataPointsUsed + ' data points'));

    body.appendChild(meta);
    card.appendChild(body);

    return card;
  }

  // ── AI Insights rendering ────────────────────────────────────────

  var aiInsightsLoading = false;

  function renderAIShimmer() {
    var section = el('div', 'pat-ai-section');
    var headingRow = el('div', 'pat-ai-heading');
    headingRow.appendChild(el('h3', 'pat-section-heading', 'AI Insights'));
    headingRow.appendChild(el('span', 'pat-ai-badge', 'AI'));
    section.appendChild(headingRow);

    for (var i = 0; i < 3; i++) {
      var shimmer = el('div', 'pat-ai-shimmer');
      shimmer.appendChild(el('div', 'pat-ai-shimmer-line'));
      shimmer.appendChild(el('div', 'pat-ai-shimmer-line'));
      shimmer.appendChild(el('div', 'pat-ai-shimmer-line'));
      section.appendChild(shimmer);
    }
    return section;
  }

  function renderAIInsightsSection(insights) {
    var section = el('div', 'pat-ai-section');
    section.id = 'pat-ai-section';

    var headingRow = el('div', 'pat-ai-heading');
    headingRow.appendChild(el('h3', 'pat-section-heading', 'AI Insights'));
    headingRow.appendChild(el('span', 'pat-ai-badge', 'AI'));
    section.appendChild(headingRow);

    // Pattern insight cards
    var patternInsights = insights.patternInsights || [];
    for (var i = 0; i < patternInsights.length; i++) {
      var pi = patternInsights[i];
      var card = el('div', 'pat-ai-card');

      // Type badge
      if (pi.type) {
        card.appendChild(el('span', 'pat-ai-card-type', pi.type));
      }

      // Title with sentiment dot
      var titleRow = el('div', 'pat-ai-card-title');
      if (pi.sentiment) {
        titleRow.appendChild(el('span', 'pat-ai-sentiment ' + pi.sentiment));
      }
      titleRow.appendChild(document.createTextNode(pi.title || ''));
      card.appendChild(titleRow);

      // Description
      if (pi.description) {
        card.appendChild(el('p', 'pat-ai-card-desc', pi.description));
      }

      // Action tip
      if (pi.actionTip) {
        card.appendChild(el('p', 'pat-ai-card-tip', '\u2192 ' + pi.actionTip));
      }

      section.appendChild(card);
    }

    // Recommendations
    var recs = insights.recommendations || [];
    if (recs.length > 0) {
      var recHeadingRow = el('div', 'pat-ai-heading');
      recHeadingRow.style.marginTop = '20px';
      recHeadingRow.appendChild(el('h3', 'pat-section-heading', 'Recommendations'));
      recHeadingRow.appendChild(el('span', 'pat-ai-badge', 'AI'));
      section.appendChild(recHeadingRow);

      for (var r = 0; r < recs.length; r++) {
        var rec = recs[r];
        var recCard = el('div', 'pat-ai-rec ' + (rec.priority || 'medium'));
        recCard.appendChild(el('div', 'pat-ai-rec-text', rec.text || ''));
        if (rec.category) {
          recCard.appendChild(el('div', 'pat-ai-rec-meta', rec.category));
        }
        section.appendChild(recCard);
      }
    }

    return section;
  }

  function fetchAndRenderAI() {
    if (aiInsightsLoading) return;
    aiInsightsLoading = true;

    // Check localStorage cache first
    var cached = Store.getInsights();
    if (cached && cached.ready && cached.patternInsights) {
      replaceAISection(renderAIInsightsSection(cached));
      aiInsightsLoading = false;
      return;
    }

    // Fetch from server
    if (!window.PeakHer.API || !window.PeakHer.API.getInsights) {
      aiInsightsLoading = false;
      return;
    }

    window.PeakHer.API.getInsights().then(function (result) {
      aiInsightsLoading = false;
      if (!result || !result.ready) return;

      replaceAISection(renderAIInsightsSection(result));
    }).catch(function () {
      aiInsightsLoading = false;
    });
  }

  function replaceAISection(newSection) {
    var existing = document.getElementById('pat-ai-section');
    if (existing) {
      existing.parentNode.replaceChild(newSection, existing);
    }
  }

  // ── Render: Active state ──────────────────────────────────────────

  function renderActiveState(checkins) {
    var cycleProfile = Store.getCycleProfile();
    var frag = document.createDocumentFragment();

    // AI Insights section (shimmer while loading)
    var aiSection = renderAIShimmer();
    aiSection.id = 'pat-ai-section';
    frag.appendChild(aiSection);

    // Time range selector
    var rangeRow = el('div', 'pat-range-row');
    var ranges = [30, 60, 90];
    var rangeButtons = [];

    for (var r = 0; r < ranges.length; r++) {
      (function (days) {
        var btn = el('button', 'pat-range-btn' + (days === activeRange ? ' active' : ''), days + ' Days');
        btn.addEventListener('click', function () {
          activeRange = days;
          refresh();
        });
        rangeButtons.push(btn);
        rangeRow.appendChild(btn);
      })(ranges[r]);
    }
    frag.appendChild(rangeRow);

    // Timeline chart
    var timelineHeading = el('h3', 'pat-section-heading', 'Energy & Confidence Over Time');
    frag.appendChild(timelineHeading);

    var timelineWrap = el('div', 'pat-chart-wrap');
    var timelineCanvas = document.createElement('canvas');
    timelineCanvas.id = 'patterns-timeline-chart';
    timelineWrap.appendChild(timelineCanvas);
    frag.appendChild(timelineWrap);

    // Pattern cards
    var patternsHeading = el('h3', 'pat-section-heading', 'Detected Patterns');
    frag.appendChild(patternsHeading);

    var allPatterns = [];
    allPatterns = allPatterns.concat(detectCorrelations(checkins));
    allPatterns = allPatterns.concat(detectCyclePatterns(checkins, cycleProfile));
    allPatterns = allPatterns.concat(detectDayPatterns(checkins));

    // Sort by confidence score descending
    allPatterns.sort(function (a, b) { return b.confidenceScore - a.confidenceScore; });

    // Cache patterns in Store
    Store.setPatterns(allPatterns);

    if (allPatterns.length > 0) {
      var cardsWrap = el('div', 'pat-cards');
      for (var i = 0; i < allPatterns.length; i++) {
        cardsWrap.appendChild(renderPatternCard(allPatterns[i]));
      }
      frag.appendChild(cardsWrap);
    } else {
      frag.appendChild(el('div', 'pat-empty', 'Keep checking in! Patterns will appear as we gather more data.'));
    }

    // Day-of-week chart
    var dowHeading = el('h3', 'pat-section-heading', 'Energy & Confidence by Day of Week');
    frag.appendChild(dowHeading);

    var dowWrap = el('div', 'pat-chart-wrap');
    var dowCanvas = document.createElement('canvas');
    dowCanvas.id = 'patterns-dow-chart';
    dowWrap.appendChild(dowCanvas);
    frag.appendChild(dowWrap);

    return { fragment: frag, checkins: checkins, cycleProfile: cycleProfile };
  }

  // ── Render charts (after DOM insertion) ───────────────────────────

  function renderCharts(checkins, cycleProfile) {
    Charts.renderTimeline('patterns-timeline-chart', checkins, cycleProfile);

    var dowData = computeDayOfWeekData(checkins);
    Charts.renderDayOfWeekBars('patterns-dow-chart', dowData);
  }

  // ── Build full UI ─────────────────────────────────────────────────

  function buildUI() {
    container.innerHTML = '';

    var wrap = el('div', 'pat-wrap');
    wrap.appendChild(el('h2', 'pat-heading', 'Pattern Insights'));

    var totalCount = Store.getCheckinCount();

    if (totalCount < UNLOCK_THRESHOLD) {
      wrap.appendChild(el('p', 'pat-subtext', totalCount + ' of ' + UNLOCK_THRESHOLD + ' check-ins completed'));
      wrap.appendChild(renderLockedState(totalCount));
      container.appendChild(wrap);
      return;
    }

    // Active state
    var checkins = getFilteredCheckins(activeRange);

    if (checkins.length === 0) {
      wrap.appendChild(el('p', 'pat-subtext', 'No check-ins in the last ' + activeRange + ' days'));
      wrap.appendChild(el('div', 'pat-empty', 'Try selecting a longer time range.'));
      container.appendChild(wrap);
      return;
    }

    wrap.appendChild(el('p', 'pat-subtext', checkins.length + ' check-in' + (checkins.length !== 1 ? 's' : '') + ' in the last ' + activeRange + ' days'));

    var result = renderActiveState(checkins);
    wrap.appendChild(result.fragment);
    container.appendChild(wrap);

    // Render charts after DOM is ready, then fetch AI insights
    requestAnimationFrame(function () {
      renderCharts(result.checkins, result.cycleProfile);
      fetchAndRenderAI();
    });
  }

  // ── Public: init ──────────────────────────────────────────────────

  function init() {
    container = document.getElementById('screen-patterns');
    if (!container) {
      console.warn('PeakHer.Patterns: #screen-patterns not found');
      return;
    }

    injectStyles();
    buildUI();
  }

  // ── Public: refresh ───────────────────────────────────────────────

  function refresh() {
    if (!container) {
      container = document.getElementById('screen-patterns');
    }
    if (!container) return;

    // Destroy existing charts before rebuild
    Charts.destroyAll();
    aiInsightsLoading = false;
    buildUI();
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    init: init,
    refresh: refresh
  };
})();
