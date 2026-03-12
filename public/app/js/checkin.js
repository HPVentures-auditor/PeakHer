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
        'border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);' +
        'color:#fff;font-size:15px;font-family:inherit;line-height:1.5;' +
        'resize:vertical;outline:none;transition:border-color 0.2s;min-height:44px;' +
      '}\n' +
      '.ph-notes::placeholder{color:rgba(255,255,255,0.35);}\n' +
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
        'height:8px;border-radius:4px;background:rgba(255,255,255,0.1);overflow:hidden;' +
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
   * @param {object} opts — label, id, leftLabel, rightLabel, value
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

    var wrapper = document.createElement('div');
    wrapper.className = 'ph-checkin';

    // ── Header ──────────────────────────────────────────────

    var greeting = document.createElement('div');
    greeting.className = 'ph-greeting';
    var name = (user && user.name) ? user.name.split(' ')[0] : '';
    greeting.textContent = 'Good ' + getGreeting() + (name ? ', ' + name : '') + '!';
    wrapper.appendChild(greeting);

    var dateEl = document.createElement('div');
    dateEl.className = 'ph-date';
    dateEl.textContent = formatFullDate(new Date());
    wrapper.appendChild(dateEl);

    // Mode badge (if tracking)
    if (trackingOn && cycleProfile) {
      var cycleDay = Cycle.getCycleDay(
        cycleProfile.lastPeriodStart,
        cycleProfile.averageCycleLength,
        new Date()
      );
      var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
      var mode = Cycle.getPerformanceMode(phase);
      var modeColor = Cycle.getModeColor(mode);
      var emoji = Cycle.getPhaseEmoji(phase);

      var badge = document.createElement('span');
      badge.className = 'ph-mode-badge';
      badge.style.background = modeColor + '1A'; // 10% opacity hex
      badge.style.color = modeColor;
      badge.textContent = emoji + ' ' + mode + ' Mode';
      wrapper.appendChild(badge);
    }

    // ── Form ────────────────────────────────────────────────

    var form = document.createElement('div');
    form.id = 'ph-checkin-form';
    form.style.marginTop = '28px';

    // Energy slider
    var energy = buildSlider({
      label: "How's your energy today?",
      id: 'ph-energy',
      value: existing ? existing.energy : 5,
      leftLabel: '1 \u2014 Running on empty',
      rightLabel: '10 \u2014 Unstoppable'
    });
    energySlider = energy.input;
    form.appendChild(energy.el);

    // Confidence slider
    var confidence = buildSlider({
      label: 'How confident are you feeling?',
      id: 'ph-confidence',
      value: existing ? existing.confidence : 5,
      leftLabel: '1 \u2014 Self-doubt',
      rightLabel: '10 \u2014 On top of the world'
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
      leftLabel: '1 \u2014 Barely slept',
      rightLabel: '10 \u2014 Best sleep ever'
    });
    sleepSlider = sleep.input;
    moreSection.appendChild(sleep.el);

    // Stress slider
    var stress = buildSlider({
      label: 'Stress level?',
      id: 'ph-stress',
      value: (existing && existing.stressLevel) ? existing.stressLevel : 5,
      leftLabel: '1 \u2014 Zen',
      rightLabel: '10 \u2014 Overwhelmed'
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
        cycleProfile.averageCycleLength + ' \u2014 ' + cdMode + ' Phase';
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
  }

  function refresh() {
    moreExpanded = false;
    render();
  }

  return {
    init: init,
    refresh: refresh
  };
})();
