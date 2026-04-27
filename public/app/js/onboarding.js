/**
 * PeakHer Onboarding Module
 * 6-step onboarding flow: Welcome, Hats, Cycle, Voice, Integrations, Ready.
 * Renders dynamically into #screen-onboarding.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Onboarding = (function () {
  'use strict';

  var Store  = window.PeakHer.Store;
  var Router = window.PeakHer.Router;

  var TOTAL_STEPS = 6;
  var currentStep = 1;
  var container;   // #screen-onboarding

  // Collected data
  var userData = {
    name: '',
    email: '',
    password: '',
    hats: [],
    cycleTracking: false,
    cycleLength: 28,
    lastPeriodDate: '',
    cycleDateConfidence: 'exact',
    coachVoice: 'dot',
    onboardingComplete: false,
    lifestyle: {
      dietType: '',
      dietaryRestrictions: [],
      trainingPlan: '',
      fastingEnabled: false,
      fastingProtocol: ''
    }
  };

  // ── Styles (injected once) ──────────────────────────────────────────

  var STYLES = [
    '.ob-wrap { max-width: 480px; margin: 0 auto; padding: 24px 16px 40px; position: relative; min-height: 100vh; display: flex; flex-direction: column; }',

    /* Progress dots */
    '.ob-progress { display: flex; justify-content: center; gap: 10px; padding: 16px 0 24px; }',
    '.ob-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.15); transition: background 0.3s; }',
    '.ob-dot.completed, .ob-dot.active { background: var(--teal); }',

    /* Back arrow */
    '.ob-back { position: absolute; top: 18px; left: 16px; background: none; border: none; color: var(--gray-text); font-size: 22px; cursor: pointer; padding: 4px 8px; transition: color 0.2s; z-index: 2; }',
    '.ob-back:hover { color: var(--text-dark); }',

    /* Step containers */
    '.onboarding-step { display: none; flex-direction: column; align-items: center; flex: 1; }',
    '.onboarding-step.active { display: flex; }',

    /* Typography */
    '.ob-heading { font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 8px; letter-spacing: -0.5px; color: var(--text-dark); }',
    '.ob-subtext { font-size: 16px; color: var(--gray-text); text-align: center; margin-bottom: 32px; line-height: 1.5; }',

    /* Inputs */
    '.ob-input { background: var(--warm-gray); border: 1px solid var(--border-light); border-radius: 8px; color: var(--text-dark); padding: 14px 16px; font-size: 16px; width: 100%; font-family: inherit; margin-bottom: 16px; transition: border-color 0.2s, box-shadow 0.2s; }',
    '.ob-input:focus { border-color: var(--teal); outline: none; box-shadow: 0 0 0 3px rgba(45,138,138,0.2); }',
    '.ob-input::placeholder { color: var(--gray-text); }',

    /* Buttons */
    '.ob-btn { background: var(--coral); color: white; border: none; border-radius: 8px; padding: 16px; font-size: 16px; font-weight: 600; width: 100%; cursor: pointer; font-family: inherit; transition: background 0.2s, transform 0.15s; margin-top: auto; }',
    '.ob-btn:hover { background: var(--coral-hover); }',
    '.ob-btn:active { transform: scale(0.98); }',
    '.ob-btn.large { padding: 18px; font-size: 18px; }',

    /* Validation message */
    '.ob-validation { font-size: 13px; color: var(--coral); text-align: center; min-height: 20px; margin-bottom: 8px; }',

    /* Hat tiles */
    '.ob-hats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; margin-bottom: 24px; }',
    '@media (max-width: 360px) { .ob-hats-grid { grid-template-columns: repeat(2, 1fr); } }',
    '.ob-hat-tile { min-width: 120px; background: var(--warm-gray); border: 2px solid transparent; border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; user-select: none; -webkit-user-select: none; }',
    '.ob-hat-tile .ob-hat-emoji { font-size: 28px; display: block; margin-bottom: 6px; }',
    '.ob-hat-tile .ob-hat-label { font-size: 14px; font-weight: 600; color: var(--text-dark); }',
    '.ob-hat-tile.selected { border-color: var(--teal); background: rgba(45,138,138,0.1); }',

    /* Toggle switch */
    '.ob-toggle-row { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; width: 100%; }',
    '.ob-toggle-label { font-size: 16px; font-weight: 500; color: var(--text-dark); }',
    '.ob-toggle { position: relative; width: 52px; height: 28px; flex-shrink: 0; }',
    '.ob-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }',
    '.ob-toggle-track { position: absolute; inset: 0; background: rgba(0,0,0,0.12); border-radius: 14px; cursor: pointer; transition: background 0.25s; }',
    '.ob-toggle-track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; background: #fff; border-radius: 50%; transition: transform 0.25s; }',
    '.ob-toggle input:checked + .ob-toggle-track { background: var(--teal); }',
    '.ob-toggle input:checked + .ob-toggle-track::after { transform: translateX(24px); }',

    /* Cycle fields (slide reveal) */
    '.ob-cycle-fields { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.35s ease, opacity 0.3s ease; width: 100%; }',
    '.ob-cycle-fields.open { max-height: 800px; opacity: 1; }',
    '.ob-cycle-off-msg { font-size: 14px; color: var(--gray-text); text-align: center; line-height: 1.5; margin-bottom: 16px; }',
    '.ob-field-label { font-size: 14px; font-weight: 500; color: var(--gray-text); margin-bottom: 6px; display: block; width: 100%; }',

    /* Integration cards */
    '.ob-integrations { display: flex; flex-direction: column; gap: 12px; width: 100%; margin-bottom: 24px; }',
    '.ob-int-card { background: var(--warm-gray); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; opacity: 0.5; }',
    '.ob-int-icon { font-size: 28px; flex-shrink: 0; width: 40px; text-align: center; }',
    '.ob-int-info { flex: 1; }',
    '.ob-int-name { font-size: 15px; font-weight: 600; color: var(--text-dark); }',
    '.ob-int-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gray-text); background: rgba(0,0,0,0.06); padding: 3px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }',
    '.ob-int-lock { font-size: 20px; flex-shrink: 0; opacity: 0.4; }',

    /* Checkmark animation */
    '.ob-checkmark-circle { width: 80px; height: 80px; border-radius: 50%; background: rgba(45,138,138,0.15); border: 3px solid var(--teal); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; animation: ob-pop 0.5s ease; }',
    '.ob-checkmark { width: 36px; height: 36px; position: relative; }',
    '.ob-checkmark::after { content: ""; position: absolute; left: 8px; top: 2px; width: 14px; height: 28px; border: solid var(--teal); border-width: 0 3.5px 3.5px 0; transform: rotate(45deg); animation: ob-check-draw 0.4s ease 0.3s both; }',
    '@keyframes ob-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }',
    '@keyframes ob-check-draw { 0% { opacity: 0; transform: rotate(45deg) scale(0.5); } 100% { opacity: 1; transform: rotate(45deg) scale(1); } }',

    '.ob-streak-msg { font-size: 16px; font-weight: 600; color: var(--teal); margin-bottom: 32px; }',

    /* Spacer for pushing button down */
    '.ob-spacer { flex: 1; min-height: 16px; }',

    /* Auth link */
    '.ob-auth-link { font-size: 14px; color: var(--teal); text-align: center; margin-top: 12px; cursor: pointer; background: none; border: none; font-family: inherit; }',
    '.ob-auth-link:hover { text-decoration: underline; }',

    /* Error message */
    '.ob-error { font-size: 14px; color: var(--coral); text-align: center; margin-bottom: 12px; min-height: 20px; }',

    /* Loading state */
    '.ob-btn.loading { opacity: 0.6; pointer-events: none; }',

    /* Login step */
    '.ob-login-step { display: none; flex-direction: column; align-items: center; flex: 1; }',
    '.ob-login-step.active { display: flex; }',

    /* ── Day 1 Education Panel ─────────────────────────────────── */
    '.ob-edu-panel { background: var(--teal-soft); border: 1px solid rgba(45,138,138,0.2); border-radius: 12px; padding: 20px; width: 100%; margin-bottom: 24px; }',
    '.ob-edu-title { font-size: 16px; font-weight: 700; color: var(--teal); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }',
    '.ob-edu-icon { font-size: 24px; }',
    '.ob-edu-list { list-style: none; padding: 0; margin: 0; }',
    '.ob-edu-list li { font-size: 14px; color: var(--text-body); line-height: 1.6; padding: 4px 0 4px 24px; position: relative; }',
    '.ob-edu-list li::before { content: ""; position: absolute; left: 6px; top: 12px; width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }',

    /* ── Input Mode Toggle ─────────────────────────────────────── */
    '.ob-mode-toggle { display: flex; background: var(--warm-gray); border-radius: 8px; padding: 3px; width: 100%; margin-bottom: 20px; }',
    '.ob-mode-btn { flex: 1; padding: 10px 8px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.25s; background: transparent; color: var(--gray-text); text-align: center; }',
    '.ob-mode-btn.active { background: var(--teal); color: var(--bg-primary, #12121A); font-weight: 700; box-shadow: 0 1px 4px rgba(0,229,160,0.3); }',

    /* ── Estimation Questions ──────────────────────────────────── */
    '.ob-estimate-group { width: 100%; margin-bottom: 16px; }',
    '.ob-estimate-label { font-size: 14px; font-weight: 500; color: var(--text-dark); margin-bottom: 8px; display: block; }',
    '.ob-estimate-options { display: flex; flex-wrap: wrap; gap: 8px; }',
    '.ob-estimate-chip { background: var(--warm-gray); border: 2px solid transparent; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 500; color: var(--text-dark); cursor: pointer; transition: all 0.2s; font-family: inherit; }',
    '.ob-estimate-chip.selected { border-color: var(--teal); background: rgba(45,138,138,0.1); color: var(--teal); }',

    /* ── Confidence Disclaimer ─────────────────────────────────── */
    '.ob-confidence-card { background: var(--warm-gray); border-radius: 12px; padding: 16px 20px; width: 100%; margin-top: 16px; margin-bottom: 16px; display: none; }',
    '.ob-confidence-card.visible { display: block; }',
    '.ob-confidence-card.exact { background: rgba(94,196,154,0.1); border: 1px solid rgba(94,196,154,0.2); }',
    '.ob-confidence-card.estimated { background: rgba(232,169,97,0.1); border: 1px solid rgba(232,169,97,0.2); }',
    '.ob-confidence-icon { font-size: 18px; margin-right: 8px; }',
    '.ob-confidence-text { font-size: 14px; line-height: 1.5; color: var(--text-body); }',

    /* ── Voice Selector (Step 4) ───────────────────────────────── */
    '.ob-voice-grid { display: flex; flex-direction: column; gap: 12px; width: 100%; margin-bottom: 24px; }',
    '.ob-voice-card { background: var(--warm-gray); border: 2px solid transparent; border-radius: 12px; padding: 16px 20px; cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.15s; user-select: none; -webkit-user-select: none; }',
    '.ob-voice-card:active { transform: scale(0.98); }',
    '.ob-voice-card.selected { border-color: var(--teal); background: rgba(45,138,138,0.08); }',
    '.ob-voice-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }',
    '.ob-voice-emoji { font-size: 24px; }',
    '.ob-voice-name { font-size: 16px; font-weight: 700; color: var(--text-dark); }',
    '.ob-voice-preview { font-size: 13px; line-height: 1.5; color: var(--gray-text); font-style: italic; }'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('ob-styles')) return;
    var style = document.createElement('style');
    style.id = 'ob-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ── DOM helpers ─────────────────────────────────────────────────────

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function createInput(type, placeholder, className) {
    var inp = document.createElement('input');
    inp.type = type;
    inp.className = className || 'ob-input';
    if (placeholder) inp.placeholder = placeholder;
    return inp;
  }

  // ── Progress bar ────────────────────────────────────────────────────

  var progressDots = [];

  function buildProgress() {
    var bar = el('div', 'ob-progress');
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var dot = el('div', 'ob-dot');
      dot.setAttribute('data-dot', i);
      progressDots.push(dot);
      bar.appendChild(dot);
    }
    return bar;
  }

  function updateProgress() {
    for (var i = 0; i < progressDots.length; i++) {
      var step = i + 1;
      progressDots[i].className = 'ob-dot';
      if (step < currentStep) progressDots[i].classList.add('completed');
      if (step === currentStep) progressDots[i].classList.add('active');
    }
    // Show/hide back arrow
    var backBtn = container.querySelector('.ob-back');
    if (backBtn) {
      backBtn.style.display = currentStep > 1 ? 'block' : 'none';
    }
  }

  // ── Step animation ──────────────────────────────────────────────────

  function showStep(stepNum) {
    var direction = stepNum > currentStep ? 'forward' : 'backward';
    var allSteps = container.querySelectorAll('.onboarding-step');
    allSteps.forEach(function (s) {
      if (s.classList.contains('active')) {
        s.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        s.style.opacity = '0';
        s.style.transform = direction === 'forward' ? 'translateX(-30px)' : 'translateX(30px)';
        setTimeout(function () {
          s.classList.remove('active');
          s.style.transform = '';
          s.style.opacity = '';
        }, 250);
      }
    });
    setTimeout(function () {
      var target = container.querySelector('[data-step="' + stepNum + '"]');
      target.style.transform = direction === 'forward' ? 'translateX(30px)' : 'translateX(-30px)';
      target.style.opacity = '0';
      target.classList.add('active');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          target.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          target.style.opacity = '1';
          target.style.transform = 'translateX(0)';
        });
      });
    }, 260);
    currentStep = stepNum;
    updateProgress();
  }

  // ── Step 1: Welcome + Name & Email ──────────────────────────────────

  function buildStep1() {
    var step = el('div', 'onboarding-step active');
    step.setAttribute('data-step', '1');

    step.appendChild(el('h2', 'ob-heading', "Hey, I'm Dot."));
    step.appendChild(el('p', 'ob-subtext', "I'm about to become your new favorite notification. I just need a few things to build your first daily brief."));

    var nameInput = createInput('text', 'Your first name');
    nameInput.id = 'ob-name';
    nameInput.autocomplete = 'given-name';

    var emailInput = createInput('email', 'your@email.com');
    emailInput.id = 'ob-email';
    emailInput.autocomplete = 'email';

    var passwordInput = createInput('password', 'Create a password (6+ characters)');
    passwordInput.id = 'ob-password';
    passwordInput.autocomplete = 'new-password';

    var validation = el('div', 'ob-validation');
    validation.id = 'ob-val-1';

    var btn = el('button', 'ob-btn', 'Continue');
    btn.type = 'button';

    btn.addEventListener('click', function () {
      var name  = nameInput.value.trim();
      var email = emailInput.value.trim();
      var password = passwordInput.value;
      if (!name || !email || !password) {
        validation.textContent = 'Please fill in all fields';
        return;
      }
      // Basic email check
      if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
        validation.textContent = 'Please enter a valid email address';
        return;
      }
      if (password.length < 8) {
        validation.textContent = 'Password must be at least 8 characters';
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        validation.textContent = 'Password must contain at least one letter and one number';
        return;
      }
      validation.textContent = '';
      userData.name = name;
      userData.email = email;
      userData.password = password;
      showStep(2);
    });

    // "Already have an account?" link
    var loginLink = el('button', 'ob-auth-link', 'Already have an account? Log in');
    loginLink.type = 'button';
    loginLink.addEventListener('click', function () {
      showLoginStep();
    });

    // Enter key support
    function handleEnter(e) {
      if (e.key === 'Enter') { btn.click(); }
    }
    nameInput.addEventListener('keydown', handleEnter);
    emailInput.addEventListener('keydown', handleEnter);
    passwordInput.addEventListener('keydown', handleEnter);

    step.appendChild(nameInput);
    step.appendChild(emailInput);
    step.appendChild(passwordInput);
    step.appendChild(validation);
    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(btn);
    step.appendChild(loginLink);

    return step;
  }

  // ── Step 2: Hat Selection ───────────────────────────────────────────

  var HATS = [
    { id: 'businesswoman', label: 'Business Woman', emoji: '\uD83D\uDCBC' },
    { id: 'athlete',       label: 'Athlete',        emoji: '\uD83C\uDFCB\uFE0F\u200D\u2640\uFE0F' },
    { id: 'mom',           label: 'Mom',             emoji: '\uD83D\uDC69\u200D\uD83D\uDC67' },
    { id: 'caregiver',     label: 'Caregiver',       emoji: '\uD83D\uDC9C' },
    { id: 'creative',      label: 'Creative',        emoji: '\uD83C\uDFA8' }
  ];

  function buildStep2() {
    var step = el('div', 'onboarding-step');
    step.setAttribute('data-step', '2');

    step.appendChild(el('h2', 'ob-heading', 'What does your day look like?'));
    step.appendChild(el('p', 'ob-subtext', 'Pick all that fit. This shapes how I prioritize your insights.'));

    var grid = el('div', 'ob-hats-grid');
    var selectedHats = {};

    HATS.forEach(function (hat) {
      var tile = el('div', 'ob-hat-tile');
      tile.setAttribute('data-hat', hat.id);
      tile.innerHTML = '<span class="ob-hat-emoji">' + hat.emoji + '</span><span class="ob-hat-label">' + hat.label + '</span>';

      tile.addEventListener('click', function () {
        if (selectedHats[hat.id]) {
          delete selectedHats[hat.id];
          tile.classList.remove('selected');
        } else {
          selectedHats[hat.id] = true;
          tile.classList.add('selected');
        }
      });

      grid.appendChild(tile);
    });

    var validation = el('div', 'ob-validation');
    validation.id = 'ob-val-2';

    var btn = el('button', 'ob-btn', 'Continue');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      var keys = Object.keys(selectedHats);
      if (keys.length === 0) {
        validation.textContent = 'Please select at least one hat';
        return;
      }
      validation.textContent = '';
      userData.hats = keys;
      showStep(3);
    });

    step.appendChild(grid);
    step.appendChild(validation);
    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(btn);

    return step;
  }

  // ── Step 3: Cycle Context (Overhauled) ────────────────────────────

  function buildStep3() {
    var step = el('div', 'onboarding-step');
    step.setAttribute('data-step', '3');

    step.appendChild(el('h2', 'ob-heading', "Let's get your cycle dialed in."));
    step.appendChild(el('p', 'ob-subtext', 'This is how I know what your hormones are doing today. Optional, but it changes everything.'));

    // Toggle row
    var toggleRow = el('div', 'ob-toggle-row');
    var toggleLabel = el('span', 'ob-toggle-label', 'Track my cycle');
    var toggleWrap = el('label', 'ob-toggle');
    var toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    var toggleTrack = el('span', 'ob-toggle-track');
    toggleWrap.appendChild(toggleInput);
    toggleWrap.appendChild(toggleTrack);
    toggleRow.appendChild(toggleLabel);
    toggleRow.appendChild(toggleWrap);

    // Off message
    var offMsg = el('p', 'ob-cycle-off-msg', "No problem! You'll still get great insights from your daily data.");

    // Cycle fields container (everything that shows when toggle is on)
    var cycleFields = el('div', 'ob-cycle-fields');

    // ── Day 1 Education Panel ──
    var eduPanel = el('div', 'ob-edu-panel');
    eduPanel.innerHTML =
      '<div class="ob-edu-title"><span class="ob-edu-icon">\uD83D\uDCA1</span> What counts as Day 1?</div>' +
      '<ul class="ob-edu-list">' +
        '<li>Day 1 = the first day of <strong>full flow</strong> (not spotting)</li>' +
        '<li>Spotting or light brown discharge before full flow does <strong>NOT</strong> count as Day 1</li>' +
        '<li>If unsure, pick the day bleeding became <strong>steady and red</strong></li>' +
      '</ul>';
    cycleFields.appendChild(eduPanel);

    // ── Average cycle length ──
    var lengthLabel = el('label', 'ob-field-label', 'Average cycle length');
    var lengthInput = createInput('number', '');
    lengthInput.value = '28';
    lengthInput.min = '21';
    lengthInput.max = '45';
    lengthInput.id = 'ob-cycle-length';
    cycleFields.appendChild(lengthLabel);
    cycleFields.appendChild(lengthInput);

    // ── Input Mode Toggle ──
    var modeToggle = el('div', 'ob-mode-toggle');
    var modeBtnExact = el('button', 'ob-mode-btn active', 'I know my start date');
    modeBtnExact.type = 'button';
    var modeBtnEstimate = el('button', 'ob-mode-btn', 'Help me estimate');
    modeBtnEstimate.type = 'button';
    modeToggle.appendChild(modeBtnExact);
    modeToggle.appendChild(modeBtnEstimate);
    cycleFields.appendChild(modeToggle);

    // Current mode tracker
    var currentMode = 'exact';

    // ── Exact Mode: Date picker ──
    var exactContainer = el('div', '');
    exactContainer.id = 'ob-exact-container';
    var dateLabel = el('label', 'ob-field-label', 'First day of last period');
    dateLabel.style.marginTop = '4px';
    var dateInput = createInput('date', '');
    dateInput.id = 'ob-last-period';
    exactContainer.appendChild(dateLabel);
    exactContainer.appendChild(dateInput);
    cycleFields.appendChild(exactContainer);

    // ── Estimate Mode: Guided questions ──
    var estimateContainer = el('div', '');
    estimateContainer.id = 'ob-estimate-container';
    estimateContainer.style.display = 'none';

    // Question 1: How many weeks ago?
    var weeksGroup = el('div', 'ob-estimate-group');
    weeksGroup.appendChild(el('label', 'ob-estimate-label', 'Roughly how long ago did your last period start?'));
    var weeksOptions = el('div', 'ob-estimate-options');
    var weekChoices = [
      { label: 'This week', value: 0.5 },
      { label: '1 week ago', value: 1 },
      { label: '2 weeks ago', value: 2 },
      { label: '3 weeks ago', value: 3 },
      { label: '4+ weeks ago', value: 4 }
    ];
    var selectedWeeks = null;

    weekChoices.forEach(function (choice) {
      var chip = el('button', 'ob-estimate-chip', choice.label);
      chip.type = 'button';
      chip.setAttribute('data-weeks', choice.value);
      chip.addEventListener('click', function () {
        weeksOptions.querySelectorAll('.ob-estimate-chip').forEach(function (c) {
          c.classList.remove('selected');
        });
        chip.classList.add('selected');
        selectedWeeks = choice.value;
        updateEstimatedDate();
      });
      weeksOptions.appendChild(chip);
    });
    weeksGroup.appendChild(weeksOptions);
    estimateContainer.appendChild(weeksGroup);

    // Question 2: Any spotting recently?
    var spottingGroup = el('div', 'ob-estimate-group');
    spottingGroup.appendChild(el('label', 'ob-estimate-label', 'Have you had any spotting or bleeding in the last few days?'));
    var spottingOptions = el('div', 'ob-estimate-options');
    var spottingChoices = [
      { label: 'Yes, full flow now', value: 'full' },
      { label: 'Light spotting', value: 'spotting' },
      { label: 'No bleeding', value: 'none' }
    ];
    var selectedSpotting = null;

    spottingChoices.forEach(function (choice) {
      var chip = el('button', 'ob-estimate-chip', choice.label);
      chip.type = 'button';
      chip.setAttribute('data-spotting', choice.value);
      chip.addEventListener('click', function () {
        spottingOptions.querySelectorAll('.ob-estimate-chip').forEach(function (c) {
          c.classList.remove('selected');
        });
        chip.classList.add('selected');
        selectedSpotting = choice.value;
        updateEstimatedDate();
      });
      spottingOptions.appendChild(chip);
    });
    spottingGroup.appendChild(spottingOptions);
    estimateContainer.appendChild(spottingGroup);

    // Estimated date display
    var estimatedResult = el('div', 'ob-field-label', '');
    estimatedResult.id = 'ob-estimated-result';
    estimatedResult.style.fontWeight = '600';
    estimatedResult.style.color = 'var(--teal)';
    estimatedResult.style.textAlign = 'center';
    estimatedResult.style.marginTop = '12px';
    estimatedResult.style.minHeight = '20px';
    estimateContainer.appendChild(estimatedResult);

    cycleFields.appendChild(estimateContainer);

    // Hidden field to store the calculated estimated date
    var estimatedDateValue = '';

    function updateEstimatedDate() {
      if (selectedWeeks === null) return;
      var today = new Date();
      var daysAgo = Math.round(selectedWeeks * 7);

      // Adjust for spotting context
      if (selectedSpotting === 'full') {
        // They're in their period now. Day 1 was likely 1-2 days ago if just started
        // or use the weeks-ago answer adjusted
        if (selectedWeeks <= 0.5) {
          daysAgo = 1; // just started
        }
      } else if (selectedSpotting === 'spotting') {
        // Spotting could mean period is about to start, don't change the weeks-ago estimate
        // just keep it as is
      }

      var estimated = new Date(today);
      estimated.setDate(estimated.getDate() - daysAgo);

      var yyyy = estimated.getFullYear();
      var mm = String(estimated.getMonth() + 1).padStart(2, '0');
      var dd = String(estimated.getDate()).padStart(2, '0');
      estimatedDateValue = yyyy + '-' + mm + '-' + dd;

      var display = estimated.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
      estimatedResult.textContent = 'Estimated start: ' + display;

      // Show confidence card for estimated
      showConfidenceCard('estimated');
    }

    // ── Confidence Disclaimer Card ──
    var confidenceCard = el('div', 'ob-confidence-card');
    confidenceCard.id = 'ob-confidence-card';
    cycleFields.appendChild(confidenceCard);

    function showConfidenceCard(type) {
      confidenceCard.className = 'ob-confidence-card visible ' + type;
      if (type === 'estimated') {
        confidenceCard.innerHTML =
          '<span class="ob-confidence-icon">\uD83D\uDCA1</span>' +
          '<span class="ob-confidence-text">Based on your estimate, predictions are accurate to <strong>+/- 2-3 days</strong>. ' +
          'After one full tracked cycle (~28 days), accuracy improves significantly.</span>';
      } else {
        confidenceCard.innerHTML =
          '<span class="ob-confidence-icon">\u2705</span>' +
          '<span class="ob-confidence-text">Great! Your predictions will be <strong>accurate from day one</strong>, ' +
          'and improve further as you track.</span>';
      }
    }

    // Listen for exact date changes to show confidence card
    dateInput.addEventListener('change', function () {
      if (dateInput.value) {
        showConfidenceCard('exact');
      }
    });

    // ── Mode Toggle Behavior ──
    modeBtnExact.addEventListener('click', function () {
      currentMode = 'exact';
      modeBtnExact.classList.add('active');
      modeBtnEstimate.classList.remove('active');
      exactContainer.style.display = '';
      estimateContainer.style.display = 'none';
      // Reset confidence card
      confidenceCard.className = 'ob-confidence-card';
      if (dateInput.value) {
        showConfidenceCard('exact');
      }
    });

    modeBtnEstimate.addEventListener('click', function () {
      currentMode = 'estimated';
      modeBtnEstimate.classList.add('active');
      modeBtnExact.classList.remove('active');
      exactContainer.style.display = 'none';
      estimateContainer.style.display = '';
      // Reset confidence card
      confidenceCard.className = 'ob-confidence-card';
      if (estimatedDateValue) {
        showConfidenceCard('estimated');
      }
    });

    // Toggle behavior
    toggleInput.addEventListener('change', function () {
      if (toggleInput.checked) {
        cycleFields.classList.add('open');
        offMsg.style.display = 'none';
      } else {
        cycleFields.classList.remove('open');
        offMsg.style.display = '';
      }
    });

    var btn = el('button', 'ob-btn', 'Continue');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      userData.cycleTracking = toggleInput.checked;
      if (toggleInput.checked) {
        var len = parseInt(lengthInput.value, 10);
        if (isNaN(len) || len < 21 || len > 45) len = 28;
        userData.cycleLength = len;

        if (currentMode === 'exact') {
          userData.lastPeriodDate = dateInput.value || '';
          userData.cycleDateConfidence = 'exact';
        } else {
          userData.lastPeriodDate = estimatedDateValue || '';
          userData.cycleDateConfidence = 'estimated';
        }
      }
      showStep(4);
    });

    step.appendChild(toggleRow);
    step.appendChild(offMsg);
    step.appendChild(cycleFields);
    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(btn);

    return step;
  }

  // ── Step 4: Lifestyle Sync ───────────────────────────────────────────

  function buildStep4() {
    var step = el('div', 'onboarding-step');
    step.setAttribute('data-step', '4');

    step.appendChild(el('h2', 'ob-heading', 'Now let\'s make this actually useful.'));
    step.appendChild(el('p', 'ob-subtext', 'The more I know, the sharper your daily brief gets.'));

    var scrollWrap = el('div', '');
    scrollWrap.style.cssText = 'width:100%;overflow-y:auto;';

    // ── Diet Type (single select) ──
    var dietLabel = el('div', 'ob-field-label', 'How do you eat?');
    dietLabel.style.marginBottom = '10px';
    dietLabel.style.fontWeight = '600';
    dietLabel.style.color = 'var(--text-primary)';
    scrollWrap.appendChild(dietLabel);

    var DIETS = ['No specific diet', 'Keto / Low Carb', 'Vegan / Plant-Based', 'Paleo', 'Mediterranean', 'Whole30', 'Vegetarian', 'Gluten-Free'];
    var dietGrid = el('div', 'ob-estimate-options');
    dietGrid.style.marginBottom = '24px';
    var selectedDiet = '';

    DIETS.forEach(function (diet) {
      var chip = el('button', 'ob-estimate-chip', diet);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        dietGrid.querySelectorAll('.ob-estimate-chip').forEach(function (c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        selectedDiet = diet;
      });
      dietGrid.appendChild(chip);
    });
    scrollWrap.appendChild(dietGrid);

    // ── Dietary Restrictions (multi select) ──
    var restrictLabel = el('div', 'ob-field-label', 'Any restrictions or allergies?');
    restrictLabel.style.marginBottom = '10px';
    restrictLabel.style.fontWeight = '600';
    restrictLabel.style.color = 'var(--text-primary)';
    scrollWrap.appendChild(restrictLabel);

    var RESTRICTIONS = ['None', 'Dairy-free', 'Nut allergy', 'Gluten-free', 'Soy-free', 'Shellfish allergy', 'Egg-free'];
    var restrictGrid = el('div', 'ob-estimate-options');
    restrictGrid.style.marginBottom = '24px';
    var selectedRestrictions = {};

    RESTRICTIONS.forEach(function (r) {
      var chip = el('button', 'ob-estimate-chip', r);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        if (r === 'None') {
          restrictGrid.querySelectorAll('.ob-estimate-chip').forEach(function (c) { c.classList.remove('selected'); });
          selectedRestrictions = {};
          chip.classList.add('selected');
          selectedRestrictions['None'] = true;
        } else {
          var noneChip = restrictGrid.querySelector('.ob-estimate-chip.selected');
          if (noneChip && noneChip.textContent === 'None') {
            noneChip.classList.remove('selected');
            delete selectedRestrictions['None'];
          }
          chip.classList.toggle('selected');
          if (selectedRestrictions[r]) {
            delete selectedRestrictions[r];
          } else {
            selectedRestrictions[r] = true;
          }
        }
      });
      restrictGrid.appendChild(chip);
    });
    scrollWrap.appendChild(restrictGrid);

    // ── Training Plan (single select) ──
    var trainLabel = el('div', 'ob-field-label', 'What\'s your movement style?');
    trainLabel.style.marginBottom = '10px';
    trainLabel.style.fontWeight = '600';
    trainLabel.style.color = 'var(--text-primary)';
    scrollWrap.appendChild(trainLabel);

    var TRAINING = ['No specific plan', 'Strength training', 'Running / Cardio', 'Yoga / Pilates', 'CrossFit / HIIT', 'Team sports', 'Training for an event', 'Just staying active'];
    var trainGrid = el('div', 'ob-estimate-options');
    trainGrid.style.marginBottom = '24px';
    var selectedTraining = '';

    TRAINING.forEach(function (t) {
      var chip = el('button', 'ob-estimate-chip', t);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        trainGrid.querySelectorAll('.ob-estimate-chip').forEach(function (c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        selectedTraining = t;
      });
      trainGrid.appendChild(chip);
    });
    scrollWrap.appendChild(trainGrid);

    // ── Intermittent Fasting ──
    var ifLabel = el('div', 'ob-field-label', 'Do you practice intermittent fasting?');
    ifLabel.style.marginBottom = '10px';
    ifLabel.style.fontWeight = '600';
    ifLabel.style.color = 'var(--text-primary)';
    scrollWrap.appendChild(ifLabel);

    var ifToggleRow = el('div', 'ob-toggle-row');
    var ifToggleLabel = el('span', 'ob-toggle-label', 'I do IF');
    var ifToggleWrap = el('label', 'ob-toggle');
    var ifToggleInput = document.createElement('input');
    ifToggleInput.type = 'checkbox';
    var ifToggleTrack = el('span', 'ob-toggle-track');
    ifToggleWrap.appendChild(ifToggleInput);
    ifToggleWrap.appendChild(ifToggleTrack);
    ifToggleRow.appendChild(ifToggleLabel);
    ifToggleRow.appendChild(ifToggleWrap);
    scrollWrap.appendChild(ifToggleRow);

    var PROTOCOLS = ['16:8', '14:10', '12:12', '18:6', 'OMAD', '5:2', 'Flexible / Varies'];
    var protocolSection = el('div', 'ob-cycle-fields');
    var protocolGrid = el('div', 'ob-estimate-options');
    protocolGrid.style.marginBottom = '12px';
    var selectedProtocol = '';

    PROTOCOLS.forEach(function (p) {
      var chip = el('button', 'ob-estimate-chip', p);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        protocolGrid.querySelectorAll('.ob-estimate-chip').forEach(function (c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        selectedProtocol = p;
      });
      protocolGrid.appendChild(chip);
    });
    protocolSection.appendChild(protocolGrid);

    // Dot note about IF adjustment
    var ifNote = el('div', '');
    ifNote.style.cssText = 'background:rgba(0,229,160,0.08);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--teal);line-height:1.5;margin-bottom:12px;';
    ifNote.textContent = "I'll adjust your fasting windows based on where you are in your cycle. Your protocol is a baseline, not a rule.";
    protocolSection.appendChild(ifNote);

    scrollWrap.appendChild(protocolSection);

    ifToggleInput.addEventListener('change', function () {
      if (ifToggleInput.checked) {
        protocolSection.classList.add('open');
      } else {
        protocolSection.classList.remove('open');
      }
    });

    step.appendChild(scrollWrap);

    var btn = el('button', 'ob-btn', 'Continue');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      userData.coachVoice = 'dot';
      userData.lifestyle.dietType = selectedDiet;
      userData.lifestyle.dietaryRestrictions = Object.keys(selectedRestrictions).filter(function(k) { return k !== 'None'; });
      userData.lifestyle.trainingPlan = selectedTraining;
      userData.lifestyle.fastingEnabled = ifToggleInput.checked;
      userData.lifestyle.fastingProtocol = ifToggleInput.checked ? selectedProtocol : '';
      showStep(5);
    });

    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(btn);

    return step;
  }

  // ── Step 5: Connect (Calendar + Wearables) ──────────────────────────

  function buildStep5() {
    var step = el('div', 'onboarding-step');
    step.setAttribute('data-step', '5');

    step.appendChild(el('h2', 'ob-heading', 'Last thing. Want to connect your life?'));
    step.appendChild(el('p', 'ob-subtext', 'Calendar and wearable data make your daily brief dramatically better.'));

    var list = el('div', 'ob-integrations');

    // Helper to build a connect card
    function makeConnectCard(icon, name, desc, onClick) {
      var card = el('div', 'ob-int-card');
      card.style.opacity = '1';
      card.style.cursor = 'pointer';
      card.style.border = '2px solid transparent';
      card.style.transition = 'border-color 0.2s, background 0.2s';
      card.innerHTML =
        '<span class="ob-int-icon">' + icon + '</span>' +
        '<div class="ob-int-info">' +
          '<div class="ob-int-name">' + name + '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;line-height:1.4;">' + desc + '</div>' +
          '<span class="ob-int-badge" style="background:rgba(0,229,160,0.12);color:var(--teal);margin-top:6px;">Connect</span>' +
        '</div>' +
        '<span style="font-size:16px;color:var(--teal);">\u2192</span>';
      if (onClick) card.addEventListener('click', onClick);
      return card;
    }

    // Google Calendar
    list.appendChild(makeConnectCard('\uD83D\uDCC5', 'Google Calendar', 'Sync your schedule so Dot can prep you for meetings', function () {
      var API = window.PeakHer.API;
      if (!API || !API.startCalendarAuth) return;
      var badge = this.querySelector('.ob-int-badge');
      badge.textContent = 'Connecting...';
      API.startCalendarAuth().then(function (result) {
        if (result && result.url) window.location.href = result.url;
        else { badge.textContent = 'Setup Required'; badge.style.color = 'var(--coral)'; }
      }).catch(function () { badge.textContent = 'Error'; badge.style.color = 'var(--coral)'; });
    }));

    // Oura Ring
    list.appendChild(makeConnectCard('\uD83D\uDCAD', 'Oura Ring', 'Sleep, readiness, and recovery data', function () {
      var API = window.PeakHer.API;
      if (API && API.startWearableAuth) {
        var badge = this.querySelector('.ob-int-badge');
        badge.textContent = 'Connecting...';
        API.startWearableAuth('oura').then(function (r) {
          if (r && r.url) window.location.href = r.url;
          else { badge.textContent = 'Error'; badge.style.color = 'var(--coral)'; }
        }).catch(function () { badge.textContent = 'Error'; badge.style.color = 'var(--coral)'; });
      }
    }));

    // Whoop
    list.appendChild(makeConnectCard('\uD83D\uDCAA', 'Whoop', 'Strain, recovery, and HRV', function () {
      var API = window.PeakHer.API;
      if (API && API.startWearableAuth) {
        var badge = this.querySelector('.ob-int-badge');
        badge.textContent = 'Connecting...';
        API.startWearableAuth('whoop').then(function (r) {
          if (r && r.url) window.location.href = r.url;
          else { badge.textContent = 'Error'; badge.style.color = 'var(--coral)'; }
        }).catch(function () { badge.textContent = 'Error'; badge.style.color = 'var(--coral)'; });
      }
    }));

    // Garmin (coming soon)
    var garminCard = el('div', 'ob-int-card');
    garminCard.innerHTML =
      '<span class="ob-int-icon">\u231A</span>' +
      '<div class="ob-int-info">' +
        '<div class="ob-int-name">Garmin</div>' +
        '<span class="ob-int-badge">Coming Soon</span>' +
      '</div>' +
      '<span class="ob-int-lock">\uD83D\uDD12</span>';
    list.appendChild(garminCard);

    // Apple Health (coming soon)
    var appleCard = el('div', 'ob-int-card');
    appleCard.innerHTML =
      '<span class="ob-int-icon">\u2764\uFE0F</span>' +
      '<div class="ob-int-info">' +
        '<div class="ob-int-name">Apple Health</div>' +
        '<span class="ob-int-badge">Coming Soon</span>' +
      '</div>' +
      '<span class="ob-int-lock">\uD83D\uDD12</span>';
    list.appendChild(appleCard);

    step.appendChild(list);

    // Skip link
    var skipText = el('p', 'ob-subtext', '');
    skipText.style.fontSize = '13px';
    skipText.style.marginTop = '12px';
    skipText.innerHTML = '<span style="color:var(--teal);cursor:pointer;text-decoration:underline;" id="ob-connect-skip">Skip for now</span> ... you can connect later in Settings.';
    step.appendChild(skipText);

    var btn = el('button', 'ob-btn', 'Continue');
    btn.type = 'button';
    btn.addEventListener('click', function () { showStep(6); });

    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(btn);

    // Wire up skip link
    requestAnimationFrame(function () {
      var skipLink = document.getElementById('ob-connect-skip');
      if (skipLink) skipLink.addEventListener('click', function () { showStep(6); });
    });

    return step;
  }

  // ── Step 6: Ready to Go ─────────────────────────────────────────────

  function buildStep6() {
    var step = el('div', 'onboarding-step');
    step.setAttribute('data-step', '6');

    // Animated checkmark
    var circle = el('div', 'ob-checkmark-circle');
    circle.appendChild(el('div', 'ob-checkmark'));
    step.appendChild(circle);

    step.appendChild(el('h2', 'ob-heading', "Done. Your first brief is being built."));
    step.appendChild(el('p', 'ob-subtext', 'Your first daily brief arrives tomorrow at 7 AM. In the meantime, let\'s do your first check-in.'));
    step.appendChild(el('p', 'ob-streak-msg', 'It takes 30 seconds.'));

    var errorMsg = el('div', 'ob-error');
    errorMsg.id = 'ob-register-error';

    var btn = el('button', 'ob-btn large', "Let's Go");
    btn.type = 'button';
    btn.addEventListener('click', function () {
      // Save to Store locally first
      userData.onboardingComplete = true;
      Store.setUser(userData);

      // Only enable cycle tracking when we actually captured a last period
      // date. Without one we cannot name a phase, and Dot would otherwise
      // default to "Rise" for every user who skipped the date step.
      var hasPeriodDate = !!(userData.cycleTracking && userData.lastPeriodDate);

      if (hasPeriodDate) {
        Store.setCycleProfile({
          trackingEnabled: true,
          averageCycleLength: userData.cycleLength,
          lastPeriodStart: userData.lastPeriodDate,
          cycleDateConfidence: userData.cycleDateConfidence
        });
      }

      // Show loading state
      btn.classList.add('loading');
      btn.textContent = 'Setting up your account...';
      errorMsg.textContent = '';

      // Build registration payload
      var regData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        personas: userData.hats,
        coachVoice: userData.coachVoice,
        cycleProfile: hasPeriodDate ? {
          trackingEnabled: true,
          averageCycleLength: userData.cycleLength,
          lastPeriodStart: userData.lastPeriodDate,
          cycleDateConfidence: userData.cycleDateConfidence
        } : null,
        lifestyle: userData.lifestyle
      };

      // Attempt API registration
      var API = window.PeakHer.API;
      API.register(regData)
        .then(function () {
          Router.navigate('#checkin');
        })
        .catch(function (err) {
          btn.classList.remove('loading');
          btn.textContent = 'Start My First Check-in';
          if (err.status === 409) {
            errorMsg.innerHTML = 'An account with this email already exists. <button class="ob-auth-link" type="button" style="display:inline;">Log in instead</button>';
            var loginBtn = errorMsg.querySelector('.ob-auth-link');
            if (loginBtn) {
              loginBtn.addEventListener('click', function () {
                showLoginStep();
              });
            }
          } else {
            // Still navigate; data is saved locally
            errorMsg.textContent = '';
            Router.navigate('#checkin');
          }
        });
    });

    step.appendChild(errorMsg);
    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(btn);

    return step;
  }

  // ── Login Step ────────────────────────────────────────────────────

  var loginStepEl = null;

  function buildLoginStep() {
    var step = el('div', 'ob-login-step');
    step.id = 'ob-login-step';

    step.appendChild(el('h2', 'ob-heading', 'Welcome Back'));
    step.appendChild(el('p', 'ob-subtext', 'Log in to sync your data'));

    var loginEmail = createInput('email', 'your@email.com');
    loginEmail.id = 'ob-login-email';
    loginEmail.autocomplete = 'email';

    var loginPassword = createInput('password', 'Your password');
    loginPassword.id = 'ob-login-password';
    loginPassword.autocomplete = 'current-password';

    var loginError = el('div', 'ob-error');
    loginError.id = 'ob-login-error';

    var loginBtn = el('button', 'ob-btn', 'Log In');
    loginBtn.type = 'button';

    loginBtn.addEventListener('click', function () {
      var email = loginEmail.value.trim();
      var password = loginPassword.value;

      if (!email || !password) {
        loginError.textContent = 'Please fill in both fields';
        return;
      }

      loginBtn.classList.add('loading');
      loginBtn.textContent = 'Logging in...';
      loginError.textContent = '';

      var API = window.PeakHer.API;
      API.login(email, password)
        .then(function () {
          return API.fullSync();
        })
        .then(function () {
          Router.navigate('#checkin');
          // Show logout button after login
          var logoutBtn = document.getElementById('logoutBtn');
          if (logoutBtn) logoutBtn.style.display = '';
        })
        .catch(function (err) {
          loginBtn.classList.remove('loading');
          loginBtn.textContent = 'Log In';
          if (err.status === 401) {
            loginError.textContent = 'Invalid email or password';
          } else {
            loginError.textContent = err.message || 'Login failed. Please try again.';
          }
        });
    });

    var forgotPasswordLink = el('button', 'ob-auth-link', 'Forgot password?');
    forgotPasswordLink.type = 'button';
    forgotPasswordLink.addEventListener('click', function () {
      window.location.href = '/reset-password/';
    });

    var backToSignup = el('button', 'ob-auth-link', 'Back to sign up');
    backToSignup.type = 'button';
    backToSignup.addEventListener('click', function () {
      hideLoginStep();
    });

    // Enter key support
    function handleEnter(e) {
      if (e.key === 'Enter') { loginBtn.click(); }
    }
    loginEmail.addEventListener('keydown', handleEnter);
    loginPassword.addEventListener('keydown', handleEnter);

    step.appendChild(loginEmail);
    step.appendChild(loginPassword);
    step.appendChild(forgotPasswordLink);
    step.appendChild(loginError);
    step.appendChild(el('div', 'ob-spacer'));
    step.appendChild(loginBtn);
    step.appendChild(backToSignup);

    return step;
  }

  function showLoginStep() {
    // Hide all onboarding steps and progress
    var allSteps = container.querySelectorAll('.onboarding-step');
    allSteps.forEach(function (s) { s.classList.remove('active'); });

    var progress = container.querySelector('.ob-progress');
    if (progress) progress.style.display = 'none';

    var backBtn = container.querySelector('.ob-back');
    if (backBtn) backBtn.style.display = 'none';

    if (loginStepEl) loginStepEl.classList.add('active');
  }

  function hideLoginStep() {
    if (loginStepEl) loginStepEl.classList.remove('active');

    var progress = container.querySelector('.ob-progress');
    if (progress) progress.style.display = '';

    showStep(1);
  }

  // ── Build full UI ───────────────────────────────────────────────────

  function buildUI() {
    container.innerHTML = '';

    var wrap = el('div', 'ob-wrap');

    // Back button
    var backBtn = el('button', 'ob-back', '\u2190');
    backBtn.type = 'button';
    backBtn.style.display = 'none';
    backBtn.addEventListener('click', function () {
      if (currentStep > 1) {
        showStep(currentStep - 1);
      }
    });
    wrap.appendChild(backBtn);

    // Progress
    wrap.appendChild(buildProgress());

    // Steps
    wrap.appendChild(buildStep1());
    wrap.appendChild(buildStep2());
    wrap.appendChild(buildStep3());
    wrap.appendChild(buildStep4());  // NEW: Voice selector
    wrap.appendChild(buildStep5());  // Was step 4 (Integrations)
    wrap.appendChild(buildStep6());  // Was step 5 (Ready)

    // Login step (hidden by default)
    loginStepEl = buildLoginStep();
    wrap.appendChild(loginStepEl);

    container.appendChild(wrap);
  }

  // ── Public init ─────────────────────────────────────────────────────

  function init() {
    container = document.getElementById('screen-onboarding');
    if (!container) {
      console.warn('PeakHer.Onboarding: #screen-onboarding not found');
      return;
    }

    injectStyles();
    currentStep = 1;
    progressDots = [];
    buildUI();
    updateProgress();
  }

  // ── Public API ──────────────────────────────────────────────────────

  return {
    init: init,
    showLoginStep: showLoginStep
  };
})();
