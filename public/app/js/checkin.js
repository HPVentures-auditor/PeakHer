/**
 * PeakHer Daily Check-in
 * Renders the check-in form, handles save/edit, shows post-submit view.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Checkin = (function () {
  'use strict';

  var Store  = window.PeakHer.Store;
  var Cycle  = window.PeakHer.Cycle;
  var Utils  = window.PeakHer.Utils;
  var Router = window.PeakHer.Router;

  // ── State ───────────────────────────────────────────────────────────
  var container = null;
  var moreExpanded = false;

  // Slider references (set during render)
  var energySlider     = null;
  var confidenceSlider = null;
  var sleepSlider      = null;
  var stressSlider     = null;
  var notesField       = null;

  // ── Helpers ─────────────────────────────────────────────────────────

  function getGreeting() {
    var h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  function formatFullDate(date) {
    return Utils.formatDayName(date) + ', ' + Utils.formatDate(date);
  }

  function formatTime(isoStr) {
    var d = new Date(isoStr);
    var hh = d.getHours();
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return hh + ':' + mm + ' ' + ampm;
  }

  /** Inject the slider styles once into <head>. */
  function injectStyles() {
    if (document.getElementById('peakher-checkin-styles')) return;

    var css =
      '/* ── PeakHer Check-in Styles ────────────────────────────── */\n' +

      /* Range slider base */
      '.ph-checkin input[type="range"]{' +
        '-webkit-appearance:none;width:100%;height:6px;border-radius:3px;' +
        'background:linear-gradient(to right,var(--coral),#e8a961,var(--teal));' +
        'outline:none;opacity:0.85;transition:opacity 0.2s;margin:0;' +
      '}\n' +
      '.ph-checkin input[type="range"]:hover{opacity:1;}\n' +
      '.ph-checkin input[type="range"]::-webkit-slider-thumb{' +
        '-webkit-appearance:none;width:28px;height:28px;border-radius:50%;' +
        'background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);' +
      '}\n' +
      '.ph-checkin input[type="range"]::-moz-range-thumb{' +
        'width:28px;height:28px;border-radius:50%;background:#fff;' +
        'cursor:pointer;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);' +
      '}\n' +

      /* Slider wrapper (44px min touch target) */
      '.ph-slider-wrap{padding:8px 0;min-height:44px;display:flex;align-items:center;}\n' +

      /* Large value readout */
      '.ph-slider-value{' +
        'font-size:48px;font-weight:700;line-height:1;text-align:center;margin-bottom:4px;' +
      '}\n' +

      /* Endpoint labels */
      '.ph-slider-labels{display:flex;justify-content:space-between;font-size:12px;' +
        'color:var(--gray-text);margin-top:4px;}\n' +

      /* Field group */
      '.ph-field{margin-bottom:28px;}\n' +
      '.ph-field-label{font-size:16px;font-weight:600;margin-bottom:8px;}\n' +

      /* More details toggle */
      '.ph-more-toggle{' +
        'background:none;border:none;color:var(--teal);font-size:14px;font-weight:600;' +
        'cursor:pointer;display:flex;align-items:center;gap:6px;padding:0;margin-bottom:20px;' +
        'font-family:inherit;' +
      '}\n' +
      '.ph-more-toggle .chevron{' +
        'display:inline-block;transition:transform 0.25s ease;font-size:12px;' +
      '}\n' +
      '.ph-more-toggle.open .chevron{transform:rotate(180deg);}\n' +

      /* Expandable section */
      '.ph-more-section{' +
        'max-height:0;overflow:hidden;transition:max-height 0.35s ease;' +
      '}\n' +
      '.ph-more-section.open{max-height:600px;}\n' +

      /* Notes textarea */
      '.ph-notes{' +
        'width:100%;padding:14px 16px;border-radius:8px;' +
        'border:1px solid var(--border-light);background:var(--warm-gray);' +
        'color:var(--text-dark);font-size:15px;font-family:inherit;line-height:1.5;' +
        'resize:vertical;outline:none;transition:border-color 0.2s;min-height:44px;' +
      '}\n' +
      '.ph-notes::placeholder{color:var(--gray-text);}\n' +
      '.ph-notes:focus{border-color:var(--teal);}\n' +

      /* Cycle day display */
      '.ph-cycle-display{' +
        'font-size:14px;color:var(--gray-text);padding:10px 0;' +
      '}\n' +

      /* Submit button */
      '.ph-submit{' +
        'width:100%;padding:16px;border:none;border-radius:8px;' +
        'background:var(--coral);color:#fff;font-size:16px;font-weight:700;' +
        'cursor:pointer;font-family:inherit;transition:background 0.2s,transform 0.2s;' +
        'min-height:44px;' +
      '}\n' +
      '.ph-submit:hover{background:var(--coral-hover);transform:translateY(-1px);}\n' +

      /* Updated-at hint */
      '.ph-updated-at{font-size:12px;color:var(--gray-text);text-align:center;margin-top:8px;}\n' +

      /* Mode badge */
      '.ph-mode-badge{' +
        'display:inline-block;padding:6px 14px;border-radius:20px;font-size:14px;' +
        'font-weight:600;margin-top:8px;' +
      '}\n' +

      /* ── Post-submit ─────────────────────────────────────── */

      /* Checkmark animation */
      '@keyframes ph-pop{0%{transform:scale(0);opacity:0}' +
        '60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}\n' +
      '.ph-checkmark{' +
        'width:64px;height:64px;border-radius:50%;background:var(--teal);' +
        'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;' +
        'animation:ph-pop 0.5s ease forwards;' +
      '}\n' +
      '.ph-checkmark svg{width:32px;height:32px;stroke:#fff;stroke-width:3;' +
        'fill:none;stroke-linecap:round;stroke-linejoin:round;}\n' +

      '.ph-post-title{font-size:22px;font-weight:700;text-align:center;margin-bottom:8px;}\n' +
      '.ph-streak{font-size:20px;font-weight:700;text-align:center;margin-bottom:20px;}\n' +

      /* Mode card */
      '.ph-mode-card{' +
        'padding:20px;border-radius:12px;text-align:center;margin-bottom:20px;' +
      '}\n' +
      '.ph-mode-card-name{font-size:18px;font-weight:700;margin-bottom:4px;}\n' +
      '.ph-mode-card-desc{font-size:14px;opacity:0.85;}\n' +

      /* Progress bar */
      '.ph-progress-wrap{margin-bottom:20px;}\n' +
      '.ph-progress-label{font-size:14px;color:var(--gray-text);text-align:center;margin-bottom:8px;}\n' +
      '.ph-progress-bar{' +
        'height:8px;border-radius:4px;background:rgba(0,0,0,0.04);overflow:hidden;' +
      '}\n' +
      '.ph-progress-fill{height:100%;border-radius:4px;background:var(--teal);transition:width 0.4s ease;}\n' +

      /* Link */
      '.ph-link{' +
        'display:inline-block;color:var(--teal);font-size:15px;font-weight:600;' +
        'text-decoration:none;text-align:center;cursor:pointer;' +
      '}\n' +
      '.ph-link:hover{text-decoration:underline;}\n' +

      /* Header */
      '.ph-greeting{font-size:24px;font-weight:700;margin-bottom:2px;}\n' +
      '.ph-date{font-size:14px;color:var(--gray-text);margin-bottom:16px;}\n' +

      /* General wrapper */
      '.ph-checkin{padding:24px 0;max-width:480px;margin:0 auto;}\n';

    var style = document.createElement('style');
    style.id = 'peakher-checkin-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Slider factory ──────────────────────────────────────────────────

  /**
   * Build a slider field and return { el, input }.
   * @param {object} opts - label, id, leftLabel, rightLabel, value
   */
  function buildSlider(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'ph-field';

    var label = document.createElement('div');
    label.className = 'ph-field-label';
    label.textContent = opts.label;
    wrap.appendChild(label);

    var valueDisplay = document.createElement('div');
    valueDisplay.className = 'ph-slider-value';
    valueDisplay.textContent = opts.value;
    wrap.appendChild(valueDisplay);

    var sliderWrap = document.createElement('div');
    sliderWrap.className = 'ph-slider-wrap';

    var input = document.createElement('input');
    input.type = 'range';
    input.min = '1';
    input.max = '10';
    input.value = String(opts.value);
    input.id = opts.id;
    input.setAttribute('aria-label', opts.label);

    input.addEventListener('input', function () {
      valueDisplay.textContent = input.value;
    });

    sliderWrap.appendChild(input);
    wrap.appendChild(sliderWrap);

    var labels = document.createElement('div');
    labels.className = 'ph-slider-labels';

    var leftLbl = document.createElement('span');
    leftLbl.textContent = opts.leftLabel;
    var rightLbl = document.createElement('span');
    rightLbl.textContent = opts.rightLabel;
    labels.appendChild(leftLbl);
    labels.appendChild(rightLbl);
    wrap.appendChild(labels);

    return { el: wrap, input: input };
  }

  // ── Phase Circle SVG Builder ─────────────────────────────────────

  var RING_COLORS = {
    restore: '#C77DBA',
    rise:    '#00E5A0',
    peak:    '#FFD700',
    sustain: '#8B7BDB'
  };

  function buildPhaseRingSVG(cycleDay, cycleLength, currentPhase) {
    var size = 200;
    var cx = size / 2;
    var cy = size / 2;
    var radius = 82;
    var strokeWidth = 12;
    var activeStrokeWidth = 16;
    var gap = 0.02; // small gap between segments in radians

    var phases = [
      { key: 'restore',  ratio: Cycle.PHASE_RATIOS.menstrual },
      { key: 'rise',     ratio: Cycle.PHASE_RATIOS.follicular },
      { key: 'peak',     ratio: Cycle.PHASE_RATIOS.ovulatory },
      { key: 'sustain',  ratio: Cycle.PHASE_RATIOS.luteal }
    ];

    var currentMode = Cycle.getPerformanceMode(currentPhase).toLowerCase();
    var svgParts = [];
    svgParts.push('<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" fill="none" xmlns="http://www.w3.org/2000/svg">');

    // Background track
    svgParts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" stroke="var(--bg-elevated)" stroke-width="' + strokeWidth + '" fill="none" class="ph-phase-circle-bg"/>');

    phases.forEach(function(p) {
      var startAngle = (p.ratio.start * 2 * Math.PI) - (Math.PI / 2) + gap;
      var endAngle = (p.ratio.end * 2 * Math.PI) - (Math.PI / 2) - gap;
      var isActive = (p.key === currentMode);
      var sw = isActive ? activeStrokeWidth : strokeWidth;
      var opacity = isActive ? '1' : '0.4';

      var x1 = cx + radius * Math.cos(startAngle);
      var y1 = cy + radius * Math.sin(startAngle);
      var x2 = cx + radius * Math.cos(endAngle);
      var y2 = cy + radius * Math.sin(endAngle);
      var largeArc = (endAngle - startAngle > Math.PI) ? 1 : 0;

      svgParts.push(
        '<path d="M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
        ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' +
        x2.toFixed(2) + ' ' + y2.toFixed(2) + '"' +
        ' stroke="' + RING_COLORS[p.key] + '"' +
        ' stroke-width="' + sw + '"' +
        ' stroke-linecap="round"' +
        ' opacity="' + opacity + '"' +
        ' fill="none"/>'
      );
    });

    // Current position indicator dot
    var dayRatio = (cycleDay - 1) / cycleLength;
    var posAngle = (dayRatio * 2 * Math.PI) - (Math.PI / 2);
    var dotX = cx + radius * Math.cos(posAngle);
    var dotY = cy + radius * Math.sin(posAngle);
    svgParts.push('<circle cx="' + dotX.toFixed(2) + '" cy="' + dotY.toFixed(2) + '" r="6" fill="white" stroke="var(--bg-primary)" stroke-width="2"/>');

    svgParts.push('</svg>');
    return svgParts.join('');
  }

  function getDaysRemaining(cycleDay, cycleLength, phase) {
    var ratios = Cycle.PHASE_RATIOS;
    var phaseEnd;
    if (phase === 'menstrual')  phaseEnd = ratios.menstrual.end;
    else if (phase === 'follicular') phaseEnd = ratios.follicular.end;
    else if (phase === 'ovulatory')  phaseEnd = ratios.ovulatory.end;
    else phaseEnd = ratios.luteal.end;

    var endDay = Math.round(phaseEnd * cycleLength);
    var remaining = endDay - cycleDay;
    if (remaining < 0) remaining = 0;
    return remaining;
  }

  // ── Bento Score Ring SVG ───────────────────────────────────────────

  function buildScoreRingSVG(score, color, size) {
    size = size || 48;
    var cx = size / 2;
    var cy = size / 2;
    var r = (size / 2) - 4;
    var circumference = 2 * Math.PI * r;
    var pct = Math.min(score, 100) / 100;
    var dashOffset = circumference * (1 - pct);

    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--bg-elevated)" stroke-width="4"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="4"' +
      ' stroke-linecap="round" stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '"' +
      ' transform="rotate(-90 ' + cx + ' ' + cy + ')"/>' +
      '</svg>';
  }

  // ── Phase Insight Content ──────────────────────────────────────────

  var PHASE_INSIGHTS = {
    menstrual: [
      'Your cortisol is naturally lower right now. Gentle movement and warm foods support your body best during Restore.',
      'Both brain hemispheres communicate more during Restore, making this a powerful window for reflection and creative problem-solving.'
    ],
    follicular: [
      'Estrogen is climbing, bringing sharper cognition and faster recovery. Your brain is hungry for novelty right now.',
      'Your hippocampus increases in volume during Rise. You literally have more brain capacity for learning right now.'
    ],
    ovulatory: [
      'Verbal fluency and confidence peak with estrogen. This is your window for presentations, pitches, and bold conversations.',
      'Testosterone and estrogen peak together during Peak, creating your highest energy and social magnetism of the entire cycle.'
    ],
    luteal: [
      'Your serotonin dips this week. Cravings for carbs and chocolate are your body asking for serotonin support. Lean into sweet potatoes and dark chocolate.',
      'Progesterone peaks mid-luteal, shifting your brain toward detail-oriented work and completion. Great time for editing, auditing, and finishing projects.'
    ]
  };

  // ── Render ──────────────────────────────────────────────────────────

  function render() {
    injectStyles();

    container = document.getElementById('screen-checkin');
    if (!container) return;
    container.innerHTML = '';

    var user = Store.getUser();
    var today = Utils.getToday();
    var existing = Store.getCheckin(today);
    var cycleProfile = Store.getCycleProfile();
    var trackingOn = Cycle.isTrackingEnabled();

    // Apply phase accent to body
    if (window.PeakHer.applyPhaseAccent) window.PeakHer.applyPhaseAccent();

    var wrapper = document.createElement('div');
    wrapper.className = 'ph-checkin';

    // ── Greeting ──────────────────────────────────────────────

    var greeting = document.createElement('div');
    greeting.className = 'ph-greeting';
    var name = (user && user.name) ? user.name.split(' ')[0] : '';
    greeting.textContent = 'Good ' + getGreeting() + (name ? ', ' + name : '');
    wrapper.appendChild(greeting);

    // ── Phase Circle Hero ────────────────────────────────────

    if (trackingOn && cycleProfile) {
      var cycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        new Date()
      );
      var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
      var mode = Cycle.getPerformanceMode(phase);
      var modeColor = Cycle.getModeColor(mode);
      var remaining = getDaysRemaining(cycleDay, cycleProfile.averageCycleLength, phase);

      var hero = document.createElement('div');
      hero.className = 'ph-phase-hero';

      // Ring
      var ringWrap = document.createElement('div');
      ringWrap.className = 'ph-phase-ring-wrap';
      ringWrap.innerHTML = buildPhaseRingSVG(cycleDay, cycleProfile.averageCycleLength, phase);

      // Center content
      var center = document.createElement('div');
      center.className = 'ph-phase-center';

      var dayNum = document.createElement('div');
      dayNum.className = 'ph-phase-day-num';
      dayNum.textContent = cycleDay;
      center.appendChild(dayNum);

      var dayLabel = document.createElement('div');
      dayLabel.className = 'ph-phase-day-label';
      dayLabel.textContent = 'DAY OF CYCLE';
      center.appendChild(dayLabel);

      ringWrap.appendChild(center);
      hero.appendChild(ringWrap);

      // Phase name below ring
      var phaseName = document.createElement('div');
      phaseName.className = 'ph-phase-name';
      phaseName.textContent = mode + ' Phase';
      hero.appendChild(phaseName);

      // Days remaining
      var remainEl = document.createElement('div');
      remainEl.className = 'ph-phase-remaining';
      remainEl.textContent = '~' + remaining + ' day' + (remaining !== 1 ? 's' : '') + ' remaining';
      hero.appendChild(remainEl);

      wrapper.appendChild(hero);

      // ── Bento Grid ──────────────────────────────────────────

      var bento = document.createElement('div');
      bento.className = 'ph-bento-grid';

      // Card 1: Energy Score
      var energyScore = existing ? (existing.energy * 10) : 0;
      var energyCard = document.createElement('div');
      energyCard.className = 'ph-bento-card';
      var energyLabel = document.createElement('div');
      energyLabel.className = 'ph-bento-label';
      energyLabel.textContent = 'Energy Score';
      energyCard.appendChild(energyLabel);

      var scoreRow = document.createElement('div');
      scoreRow.className = 'ph-bento-score-ring';
      scoreRow.innerHTML = buildScoreRingSVG(energyScore, modeColor, 48);
      var scoreNum = document.createElement('div');
      scoreNum.className = 'ph-bento-value';
      scoreNum.textContent = energyScore || '--';
      scoreRow.appendChild(scoreNum);
      energyCard.appendChild(scoreRow);
      bento.appendChild(energyCard);

      // Card 2: Today's Move
      var moveDefaults = {
        menstrual: { move: 'Gentle Yoga', detail: '25 min, Restorative' },
        follicular: { move: 'Strength Training', detail: '40 min, Moderate' },
        ovulatory: { move: 'HIIT or Running', detail: '35 min, High Intensity' },
        luteal: { move: 'Pilates', detail: '35 min, Low Impact' }
      };
      var moveData = moveDefaults[phase] || moveDefaults.follicular;
      var moveCard = document.createElement('div');
      moveCard.className = 'ph-bento-card';
      moveCard.innerHTML =
        '<div class="ph-bento-label">Today\'s Move</div>' +
        '<div class="ph-bento-value" style="font-size:18px;">' + moveData.move + '</div>' +
        '<div class="ph-bento-detail">' + moveData.detail + '</div>';
      bento.appendChild(moveCard);

      // Card 3: Nutrition
      var nutritionDefaults = {
        menstrual: 'Iron-rich foods, warm soups, dark chocolate',
        follicular: 'Fresh salads, lean proteins, fermented foods',
        ovulatory: 'Fiber-rich veggies, light grains, antioxidants',
        luteal: 'Complex carbs + magnesium'
      };
      var nutritionCard = document.createElement('div');
      nutritionCard.className = 'ph-bento-card';
      nutritionCard.innerHTML =
        '<div class="ph-bento-label">Nutrition</div>' +
        '<div class="ph-bento-detail" style="font-size:14px;color:var(--text-primary);margin-top:8px;">' +
        (nutritionDefaults[phase] || 'Balanced, whole foods') + '</div>';
      bento.appendChild(nutritionCard);

      // Card 4: Rest
      var restDefaults = {
        menstrual: 'Prioritize 8+ hours tonight',
        follicular: 'Energy is rising, stay consistent',
        ovulatory: 'Wind down early, you may feel wired',
        luteal: 'Prioritize sleep tonight'
      };
      var restCard = document.createElement('div');
      restCard.className = 'ph-bento-card';
      restCard.innerHTML =
        '<div class="ph-bento-label">Rest</div>' +
        '<div class="ph-bento-detail" style="font-size:14px;color:var(--text-primary);margin-top:8px;">' +
        (restDefaults[phase] || 'Listen to your body') + '</div>';
      bento.appendChild(restCard);

      wrapper.appendChild(bento);

      // ── Phase Insight Card ──────────────────────────────────

      var insights = PHASE_INSIGHTS[phase] || PHASE_INSIGHTS.follicular;
      var insightText = insights[Math.floor(Math.random() * insights.length)];

      var insightCard = document.createElement('div');
      insightCard.className = 'ph-phase-insight';

      var insightLabel = document.createElement('div');
      insightLabel.className = 'ph-phase-insight-label';
      insightLabel.textContent = mode.toUpperCase() + ' INSIGHT';
      insightCard.appendChild(insightLabel);

      var insightBody = document.createElement('div');
      insightBody.className = 'ph-phase-insight-text';
      insightBody.textContent = insightText;
      insightCard.appendChild(insightBody);

      wrapper.appendChild(insightCard);
    }

    // ── Daily Briefing container (populated by Briefing module) ──
    var briefingContainer = document.createElement('div');
    briefingContainer.id = 'briefing-container';
    wrapper.appendChild(briefingContainer);

    // ── Form ────────────────────────────────────────────────

    var form = document.createElement('div');
    form.id = 'ph-checkin-form';
    form.style.marginTop = '28px';

    // Energy slider
    var energy = buildSlider({
      label: "How's your energy today?",
      id: 'ph-energy',
      value: existing ? existing.energy : 5,
      leftLabel: '1: Running on empty',
      rightLabel: '10: Unstoppable'
    });
    energySlider = energy.input;
    form.appendChild(energy.el);

    // Confidence slider
    var confidence = buildSlider({
      label: 'How confident are you feeling?',
      id: 'ph-confidence',
      value: existing ? existing.confidence : 5,
      leftLabel: '1: Self-doubt',
      rightLabel: '10: On top of the world'
    });
    confidenceSlider = confidence.input;
    form.appendChild(confidence.el);

    // ── More details toggle ─────────────────────────────────

    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'ph-more-toggle';
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = 'More details <span class="chevron">\u25BC</span>';

    var moreSection = document.createElement('div');
    moreSection.className = 'ph-more-section';

    // If existing checkin had optional fields, default open
    var shouldExpand = existing && (existing.sleepQuality !== null || existing.stressLevel !== null);

    // Sleep slider
    var sleep = buildSlider({
      label: "How'd you sleep?",
      id: 'ph-sleep',
      value: (existing && existing.sleepQuality) ? existing.sleepQuality : 5,
      leftLabel: '1: Barely slept',
      rightLabel: '10: Best sleep ever'
    });
    sleepSlider = sleep.input;
    moreSection.appendChild(sleep.el);

    // Stress slider
    var stress = buildSlider({
      label: 'Stress level?',
      id: 'ph-stress',
      value: (existing && existing.stressLevel) ? existing.stressLevel : 5,
      leftLabel: '1: Zen',
      rightLabel: '10: Overwhelmed'
    });
    stressSlider = stress.input;
    moreSection.appendChild(stress.el);

    // Notes textarea
    var notesWrap = document.createElement('div');
    notesWrap.className = 'ph-field';

    var notesLabel = document.createElement('div');
    notesLabel.className = 'ph-field-label';
    notesLabel.textContent = 'Notes';
    notesWrap.appendChild(notesLabel);

    notesField = document.createElement('textarea');
    notesField.className = 'ph-notes';
    notesField.rows = 3;
    notesField.placeholder = 'Any thoughts, wins, or observations...';
    if (existing && existing.notes) {
      notesField.value = existing.notes;
    }
    notesWrap.appendChild(notesField);
    moreSection.appendChild(notesWrap);

    // Cycle day display (read-only)
    if (trackingOn && cycleProfile) {
      var cdDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        new Date()
      );
      var cdPhase = Cycle.getPhase(cdDay, cycleProfile.averageCycleLength);
      var cdMode  = Cycle.getPerformanceMode(cdPhase);

      var cycleDayDisplay = document.createElement('div');
      cycleDayDisplay.className = 'ph-cycle-display';
      cycleDayDisplay.textContent = 'Day ' + cdDay + ' of ' +
        cycleProfile.averageCycleLength + ', ' + cdMode + ' Phase';
      moreSection.appendChild(cycleDayDisplay);
    }

    toggleBtn.addEventListener('click', function () {
      moreExpanded = !moreExpanded;
      toggleBtn.classList.toggle('open', moreExpanded);
      moreSection.classList.toggle('open', moreExpanded);
    });

    form.appendChild(toggleBtn);
    form.appendChild(moreSection);

    // Open if restoring optional fields
    if (shouldExpand) {
      moreExpanded = true;
      toggleBtn.classList.add('open');
      moreSection.classList.add('open');
    } else {
      moreExpanded = false;
    }

    // ── Submit button ───────────────────────────────────────

    var submitBtn = document.createElement('button');
    submitBtn.className = 'ph-submit';
    submitBtn.type = 'button';
    submitBtn.textContent = existing ? 'Update Check-in' : 'Done \u2713';

    submitBtn.addEventListener('click', function () {
      saveCheckin();
    });

    form.appendChild(submitBtn);

    // Last-updated hint (edit mode)
    if (existing && existing.createdAt) {
      var updatedAt = document.createElement('div');
      updatedAt.className = 'ph-updated-at';
      updatedAt.textContent = 'Last updated at ' + formatTime(existing.createdAt);
      form.appendChild(updatedAt);
    }

    wrapper.appendChild(form);
    container.appendChild(wrapper);
  }

  // ── Save ────────────────────────────────────────────────────────────

  function saveCheckin() {
    var today = Utils.getToday();
    var cycleProfile = Store.getCycleProfile();
    var cycleDay = null;
    var cyclePhase = null;

    if (cycleProfile && cycleProfile.trackingEnabled) {
      cycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        new Date()
      );
      cyclePhase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
    }

    var data = {
      date: today,
      energy: parseInt(energySlider.value, 10),
      confidence: parseInt(confidenceSlider.value, 10),
      sleepQuality: moreExpanded ? parseInt(sleepSlider.value, 10) : null,
      stressLevel: moreExpanded ? parseInt(stressSlider.value, 10) : null,
      cycleDay: cycleDay,
      cyclePhase: cyclePhase,
      notes: notesField.value.trim() || null,
      createdAt: new Date().toISOString()
    };

    Store.setCheckin(today, data);
    Store.updateStreak(today);

    // Sync to server
    PeakHer.API.saveCheckin(data);

    showPostSubmit();
  }

  // ── Post-submit view ────────────────────────────────────────────────

  function showPostSubmit() {
    if (!container) return;
    container.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'ph-checkin';
    wrapper.style.textAlign = 'center';

    // Animated checkmark
    var checkmark = document.createElement('div');
    checkmark.className = 'ph-checkmark';
    checkmark.innerHTML =
      '<svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"></polyline></svg>';
    wrapper.appendChild(checkmark);

    // Title
    var title = document.createElement('div');
    title.className = 'ph-post-title';
    title.textContent = 'Check-in recorded!';
    wrapper.appendChild(title);

    // Streak
    var streak = Store.getStreak();
    var streakEl = document.createElement('div');
    streakEl.className = 'ph-streak';
    if (streak.current === 1) {
      streakEl.textContent = 'First check-in! \uD83C\uDF89';
    } else {
      streakEl.textContent = '\uD83D\uDD25 ' + streak.current + ' day streak';
    }
    wrapper.appendChild(streakEl);

    // Mode card (if tracking)
    var cycleProfile = Store.getCycleProfile();
    if (cycleProfile && cycleProfile.trackingEnabled) {
      var cycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        new Date()
      );
      var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
      var mode  = Cycle.getPerformanceMode(phase);
      var color = Cycle.getModeColor(mode);
      var desc  = Cycle.getModeDescription(mode);

      var modeCard = document.createElement('div');
      modeCard.className = 'ph-mode-card';
      modeCard.style.background = color + '1A';
      modeCard.style.border = '1px solid ' + color + '40';

      var modeName = document.createElement('div');
      modeName.className = 'ph-mode-card-name';
      modeName.style.color = color;
      modeName.textContent = Cycle.getPhaseEmoji(phase) + ' ' + mode + ' Mode';
      modeCard.appendChild(modeName);

      var modeDesc = document.createElement('div');
      modeDesc.className = 'ph-mode-card-desc';
      modeDesc.style.color = color;
      modeDesc.textContent = desc;
      modeCard.appendChild(modeDesc);

      wrapper.appendChild(modeCard);
    }

    // Progress toward patterns
    var count = Store.getCheckinCount();
    var PATTERN_THRESHOLD = 25;
    var progressWrap = document.createElement('div');
    progressWrap.className = 'ph-progress-wrap';

    var progressLabel = document.createElement('div');
    progressLabel.className = 'ph-progress-label';

    if (count >= PATTERN_THRESHOLD) {
      progressLabel.textContent = 'Pattern Insights available!';
      progressWrap.appendChild(progressLabel);

      var patternsLink = document.createElement('a');
      patternsLink.className = 'ph-link';
      patternsLink.href = '#patterns';
      patternsLink.textContent = 'View Pattern Insights \u2192';
      patternsLink.addEventListener('click', function (e) {
        e.preventDefault();
        Router.navigate('patterns');
      });
      progressWrap.appendChild(patternsLink);
    } else {
      progressLabel.textContent = count + ' of ' + PATTERN_THRESHOLD +
        ' check-ins to unlock Pattern Insights';
      progressWrap.appendChild(progressLabel);

      var barOuter = document.createElement('div');
      barOuter.className = 'ph-progress-bar';
      var barFill = document.createElement('div');
      barFill.className = 'ph-progress-fill';
      barFill.style.width = Math.min(100, Math.round((count / PATTERN_THRESHOLD) * 100)) + '%';
      barOuter.appendChild(barFill);
      progressWrap.appendChild(barOuter);
    }

    wrapper.appendChild(progressWrap);

    // View History link
    var historyLink = document.createElement('a');
    historyLink.className = 'ph-link';
    historyLink.href = '#history';
    historyLink.textContent = 'View History \u2192';
    historyLink.style.display = 'block';
    historyLink.style.marginTop = '16px';
    historyLink.addEventListener('click', function (e) {
      e.preventDefault();
      Router.navigate('history');
    });
    wrapper.appendChild(historyLink);

    container.appendChild(wrapper);
  }

  // ── Public API ──────────────────────────────────────────────────────

  function init() {
    render();
    // Briefing.init() will fire separately and populate #briefing-container,
    // but if Check-in renders after Briefing, Briefing's data would be wiped.
    // Ask Briefing to (re)render on any init.
    if (window.PeakHer && window.PeakHer.Briefing && window.PeakHer.Briefing.refresh) {
      setTimeout(function(){ window.PeakHer.Briefing.refresh(); }, 0);
    }
  }

  function refresh() {
    moreExpanded = false;
    render();
    // Re-populate the briefing section after re-render (critical: render() wipes
    // the #briefing-container so we need to ask Briefing to redraw)
    if (window.PeakHer && window.PeakHer.Briefing && window.PeakHer.Briefing.refresh) {
      window.PeakHer.Briefing.refresh();
    }
  }

  return {
    init: init,
    refresh: refresh
  };
})();
