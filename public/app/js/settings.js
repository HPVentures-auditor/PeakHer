/**
 * PeakHer Settings Panel
 * Handles SMS settings, data export, and account management.
 * Renders as a slide-over panel triggered from the top nav gear icon.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Settings = (function () {
  'use strict';

  var API = window.PeakHer.API;
  var Store = window.PeakHer.Store;

  var panelEl = null;
  var overlayEl = null;
  var isOpen = false;
  var smsSettings = null;

  // Common timezone list
  var TIMEZONES = [
    { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
    { value: 'America/Anchorage', label: 'Alaska (AKST)' },
    { value: 'America/Los_Angeles', label: 'Pacific (PST)' },
    { value: 'America/Denver', label: 'Mountain (MST)' },
    { value: 'America/Chicago', label: 'Central (CST)' },
    { value: 'America/New_York', label: 'Eastern (EST)' },
    { value: 'America/Puerto_Rico', label: 'Atlantic (AST)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Central Europe (CET)' },
    { value: 'Europe/Helsinki', label: 'Eastern Europe (EET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
    { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' }
  ];

  var BRIEFING_TIMES = [
    { value: '06:00', label: '6:00 AM' },
    { value: '06:30', label: '6:30 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '07:30', label: '7:30 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '08:30', label: '8:30 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '09:30', label: '9:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '12:00', label: '12:00 PM' }
  ];

  // ── Inject styles ──────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('peakher-settings-styles')) return;

    var css =
      '.ph-settings-overlay{' +
        'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;opacity:0;' +
        'transition:opacity 0.3s ease;pointer-events:none;' +
      '}\n' +
      '.ph-settings-overlay.open{opacity:1;pointer-events:auto;}\n' +

      '.ph-settings-panel{' +
        'position:fixed;top:0;right:0;bottom:0;width:min(400px,90vw);' +
        'background:var(--cream,#faf8f5);z-index:201;' +
        'transform:translateX(100%);transition:transform 0.3s ease;' +
        'overflow-y:auto;box-shadow:-4px 0 20px rgba(0,0,0,0.1);' +
      '}\n' +
      '.ph-settings-panel.open{transform:translateX(0);}\n' +

      '.ph-settings-header{' +
        'position:sticky;top:0;background:var(--cream,#faf8f5);' +
        'display:flex;align-items:center;justify-content:space-between;' +
        'padding:20px 24px;border-bottom:1px solid var(--border-light,rgba(0,0,0,0.06));z-index:1;' +
      '}\n' +
      '.ph-settings-header h2{font-size:18px;font-weight:700;margin:0;color:var(--text-dark,#1a1a2e);}\n' +
      '.ph-settings-close{' +
        'width:36px;height:36px;border-radius:50%;border:none;background:var(--warm-gray,#f3f0ec);' +
        'cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;' +
        'color:var(--text-body,#374151);transition:background 0.2s;' +
      '}\n' +
      '.ph-settings-close:hover{background:var(--border-light,rgba(0,0,0,0.1));}\n' +

      '.ph-settings-body{padding:24px;}\n' +

      '.ph-settings-section{' +
        'background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;' +
        'border:1px solid var(--border-light,rgba(0,0,0,0.06));' +
      '}\n' +
      '.ph-settings-section h3{' +
        'font-size:15px;font-weight:700;margin:0 0 4px;color:var(--text-dark,#1a1a2e);' +
        'display:flex;align-items:center;gap:8px;' +
      '}\n' +
      '.ph-settings-section p{font-size:13px;color:var(--gray-text,#6b7280);margin:0 0 16px;line-height:1.5;}\n' +

      '.ph-sms-input-row{display:flex;gap:8px;margin-bottom:12px;}\n' +
      '.ph-sms-input-row input{' +
        'flex:1;padding:10px 14px;border:1px solid var(--border-light,rgba(0,0,0,0.1));' +
        'border-radius:8px;font-size:15px;font-family:inherit;background:#fff;' +
        'color:var(--text-dark,#1a1a2e);outline:none;' +
      '}\n' +
      '.ph-sms-input-row input:focus{border-color:var(--teal,#2d8a8a);box-shadow:0 0 0 2px rgba(45,138,138,0.15);}\n' +

      '.ph-sms-btn{' +
        'padding:10px 20px;border-radius:8px;border:none;font-size:14px;font-weight:600;' +
        'cursor:pointer;transition:background 0.2s,opacity 0.2s;font-family:inherit;' +
      '}\n' +
      '.ph-sms-btn-primary{background:var(--teal,#2d8a8a);color:#fff;}\n' +
      '.ph-sms-btn-primary:hover{background:var(--teal-hover,#247474);}\n' +
      '.ph-sms-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}\n' +
      '.ph-sms-btn-danger{background:#fff;color:#ef4444;border:1px solid #fecaca;}\n' +
      '.ph-sms-btn-danger:hover{background:#fef2f2;}\n' +
      '.ph-sms-btn-secondary{background:var(--warm-gray,#f3f0ec);color:var(--text-body,#374151);}\n' +
      '.ph-sms-btn-secondary:hover{background:#e5e1db;}\n' +

      '.ph-sms-status{' +
        'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;' +
        'border-radius:20px;font-size:12px;font-weight:600;margin-bottom:12px;' +
      '}\n' +
      '.ph-sms-status.verified{background:#dcfce7;color:#166534;}\n' +
      '.ph-sms-status.unverified{background:#fef9c3;color:#854d0e;}\n' +
      '.ph-sms-status.none{background:var(--warm-gray,#f3f0ec);color:var(--gray-text,#6b7280);}\n' +

      '.ph-sms-toggle-row{' +
        'display:flex;align-items:center;justify-content:space-between;' +
        'padding:12px 0;border-top:1px solid var(--border-light,rgba(0,0,0,0.06));' +
      '}\n' +
      '.ph-sms-toggle-row:first-child{border-top:none;padding-top:0;}\n' +
      '.ph-sms-toggle-label{font-size:14px;color:var(--text-dark,#1a1a2e);font-weight:500;}\n' +
      '.ph-sms-toggle-desc{font-size:12px;color:var(--gray-text,#6b7280);margin-top:2px;}\n' +

      '.ph-toggle{' +
        'position:relative;width:48px;height:28px;flex-shrink:0;' +
      '}\n' +
      '.ph-toggle input{opacity:0;width:0;height:0;}\n' +
      '.ph-toggle-track{' +
        'position:absolute;inset:0;border-radius:14px;background:#d1d5db;' +
        'transition:background 0.2s;cursor:pointer;' +
      '}\n' +
      '.ph-toggle input:checked + .ph-toggle-track{background:var(--teal,#2d8a8a);}\n' +
      '.ph-toggle-thumb{' +
        'position:absolute;top:2px;left:2px;width:24px;height:24px;border-radius:50%;' +
        'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:transform 0.2s;' +
      '}\n' +
      '.ph-toggle input:checked ~ .ph-toggle-thumb{transform:translateX(20px);}\n' +

      '.ph-sms-select{' +
        'width:100%;padding:10px 14px;border:1px solid var(--border-light,rgba(0,0,0,0.1));' +
        'border-radius:8px;font-size:14px;font-family:inherit;background:#fff;' +
        'color:var(--text-dark,#1a1a2e);outline:none;appearance:none;' +
        'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'7\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236b7280\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E");' +
        'background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;' +
      '}\n' +
      '.ph-sms-select:focus{border-color:var(--teal,#2d8a8a);box-shadow:0 0 0 2px rgba(45,138,138,0.15);}\n' +

      '.ph-sms-error{color:#ef4444;font-size:13px;margin-top:8px;}\n' +
      '.ph-sms-success{color:#16a34a;font-size:13px;margin-top:8px;}\n' +

      '.ph-settings-divider{height:1px;background:var(--border-light,rgba(0,0,0,0.06));margin:8px 0 16px;}\n';

    var style = document.createElement('style');
    style.id = 'peakher-settings-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Detect user timezone ──────────────────────────────────────────

  function detectTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch (e) {
      return 'America/New_York';
    }
  }

  // ── Create DOM ──────────────────────────────────────────────────────

  function createPanel() {
    if (panelEl) return;

    // Overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'ph-settings-overlay';
    overlayEl.addEventListener('click', close);
    document.body.appendChild(overlayEl);

    // Panel
    panelEl = document.createElement('div');
    panelEl.className = 'ph-settings-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Settings');
    document.body.appendChild(panelEl);
  }

  // ── Render ──────────────────────────────────────────────────────────

  function render() {
    if (!panelEl) return;

    var html = '';

    // Header
    html += '<div class="ph-settings-header">';
    html += '<h2>Settings</h2>';
    html += '<button class="ph-settings-close" id="settingsClose" aria-label="Close">&times;</button>';
    html += '</div>';

    html += '<div class="ph-settings-body">';

    // ── SMS Section ─────────────────────────────────────────────
    html += '<div class="ph-settings-section">';
    html += '<h3>SMS Briefings</h3>';
    html += '<p>Get your daily briefing + check in via text. Like having a coach in your pocket.</p>';

    html += '<div id="smsContent">';
    html += renderSmsContent();
    html += '</div>';

    html += '</div>'; // end section

    // ── Coach Voice Section ───────────────────────────────────────
    html += renderCoachVoiceSection();

    // ── Cycle Tracking Section ───────────────────────────────────
    html += renderCycleSection();

    // ── Calendar Integration Section ────────────────────────────
    html += renderCalendarSection();

    // ── Account Section ─────────────────────────────────────────
    html += '<div class="ph-settings-section">';
    html += '<h3>Account</h3>';

    var user = Store.getUser();
    if (user) {
      html += '<p style="margin-bottom:8px;">' + escapeHtml(user.name) + ' &mdash; ' + escapeHtml(user.email) + '</p>';
    }

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="ph-sms-btn ph-sms-btn-secondary" id="btnExportData">Export My Data</button>';
    html += '<button class="ph-sms-btn ph-sms-btn-danger" id="btnDeleteAccount">Delete Account</button>';
    html += '</div>';
    html += '</div>';

    html += '</div>'; // end body

    panelEl.innerHTML = html;

    // Bind events
    var closeBtn = document.getElementById('settingsClose');
    if (closeBtn) closeBtn.addEventListener('click', close);

    bindSmsEvents();
    bindAccountEvents();
    bindVoiceEvents();
    bindCycleEvents();
    bindCalendarEvents();

    // Check URL for calendar callback status
    if (window.location.hash.indexOf('calendar=connected') !== -1) {
      fetchCalendarStatus();
      // Clean up URL
      window.location.hash = window.location.hash.replace(/[?&]calendar=connected/, '');
    }
  }

  // ── Coach Voice ────────────────────────────────────────────────────

  var VOICE_OPTIONS = [
    {
      id: 'sassy',
      name: 'Sassy Bestie',
      emoji: '\uD83D\uDC85',
      preview: "Girl, you're on day 14. Go get that raise and eat a steak tonight. This is YOUR window."
    },
    {
      id: 'scientific',
      name: 'Science-Backed & Precise',
      emoji: '\uD83D\uDD2C',
      preview: 'Estrogen peaks around ovulation, day 14. Verbal fluency and spatial reasoning are elevated. Optimal for high-stakes communication.'
    },
    {
      id: 'spiritual',
      name: 'Spiritually Centered',
      emoji: '\uD83C\uDF19',
      preview: "You're entering your inner summer. Your energy wants to expand outward. Honor that flow and let your light radiate today."
    },
    {
      id: 'hype',
      name: 'Hyped Motivator',
      emoji: '\uD83D\uDD25',
      preview: 'THIS IS YOUR WINDOW! Day 14! You are MAGNETIC right now! Go crush that meeting, hit the gym hard, OWN today!'
    }
  ];

  function renderCoachVoiceSection() {
    var user = Store.getUser() || {};
    var currentVoice = user.coachVoice || 'sassy';

    var html = '<div class="ph-settings-section">';
    html += '<h3>Coach Voice</h3>';
    html += '<p>Choose how your daily briefings sound</p>';

    for (var i = 0; i < VOICE_OPTIONS.length; i++) {
      var voice = VOICE_OPTIONS[i];
      var isSelected = voice.id === currentVoice;
      var borderStyle = isSelected ? 'border:2px solid var(--teal,#2d8a8a);background:rgba(45,138,138,0.06);' : 'border:2px solid transparent;background:var(--warm-gray,#f3f0ec);';
      html += '<div class="ph-voice-card" data-voice-id="' + voice.id + '" style="' + borderStyle + 'border-radius:12px;padding:14px 18px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;">';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
      html += '<span style="font-size:22px;">' + voice.emoji + '</span>';
      html += '<span style="font-size:15px;font-weight:700;color:var(--text-dark,#1a1a2e);">' + escapeHtml(voice.name) + '</span>';
      if (isSelected) {
        html += '<span style="margin-left:auto;font-size:12px;color:var(--teal,#2d8a8a);font-weight:600;background:rgba(45,138,138,0.1);padding:2px 8px;border-radius:10px;">Active</span>';
      }
      html += '</div>';
      html += '<div style="font-size:12px;line-height:1.5;color:var(--gray-text,#6b7280);font-style:italic;">&ldquo;' + escapeHtml(voice.preview) + '&rdquo;</div>';
      html += '</div>';
    }

    html += '<div id="voiceStatus" style="font-size:13px;text-align:center;min-height:20px;margin-top:4px;"></div>';
    html += '</div>';

    return html;
  }

  function bindVoiceEvents() {
    var cards = document.querySelectorAll('.ph-voice-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.addEventListener('click', function () {
          var voiceId = card.getAttribute('data-voice-id');
          if (!voiceId) return;

          // Update local store
          var user = Store.getUser() || {};
          user.coachVoice = voiceId;
          Store.setUser(user);

          // Re-render just the voice section
          render();

          // Re-load SMS settings (already cached)
          refreshSmsContent();

          // Push to server
          var statusEl = document.getElementById('voiceStatus');
          if (API.isLoggedIn()) {
            if (statusEl) {
              statusEl.textContent = 'Saving...';
              statusEl.style.color = 'var(--gray-text,#6b7280)';
            }

            API.updateUser({ coachVoice: voiceId })
              .then(function () {
                if (statusEl) {
                  statusEl.textContent = 'Saved! Your next briefing will use this voice.';
                  statusEl.style.color = 'var(--teal,#2d8a8a)';
                }
                setTimeout(function () {
                  if (statusEl) statusEl.textContent = '';
                }, 3000);
              })
              .catch(function (err) {
                if (statusEl) {
                  statusEl.textContent = 'Saved locally. Will sync when online.';
                  statusEl.style.color = 'var(--gray-text,#6b7280)';
                }
                console.warn('Voice save failed:', err.message);
              });
          }
        });
      })(cards[i]);
    }
  }

  function renderSmsContent() {
    if (!smsSettings) {
      return '<p style="color:var(--gray-text);">Loading...</p>';
    }

    var html = '';

    if (!smsSettings.hasPhone) {
      // No phone: show add phone form
      html += '<div class="ph-sms-status none">No phone number</div>';
      html += '<div class="ph-sms-input-row">';
      html += '<input type="tel" id="smsPhoneInput" placeholder="+1 (555) 123-4567" maxlength="20" autocomplete="tel">';
      html += '<button class="ph-sms-btn ph-sms-btn-primary" id="btnSendCode">Verify</button>';
      html += '</div>';
      html += '<div id="smsMessage"></div>';
    } else if (!smsSettings.phoneVerified) {
      // Phone added but not verified: show OTP form
      html += '<div class="ph-sms-status unverified">Pending verification</div>';
      html += '<p>Enter the 6-digit code we sent to ' + (smsSettings.phoneNumber || 'your phone') + '</p>';
      html += '<div class="ph-sms-input-row">';
      html += '<input type="text" id="smsCodeInput" placeholder="123456" maxlength="6" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]*">';
      html += '<button class="ph-sms-btn ph-sms-btn-primary" id="btnVerifyCode">Verify</button>';
      html += '</div>';
      html += '<div style="display:flex;gap:8px;margin-top:4px;">';
      html += '<button class="ph-sms-btn ph-sms-btn-secondary" id="btnResendCode" style="font-size:12px;padding:6px 12px;">Resend Code</button>';
      html += '<button class="ph-sms-btn ph-sms-btn-danger" id="btnRemovePhone" style="font-size:12px;padding:6px 12px;">Remove</button>';
      html += '</div>';
      html += '<div id="smsMessage"></div>';
    } else {
      // Verified: show settings
      html += '<div class="ph-sms-status verified">Verified: ' + (smsSettings.phoneNumber || '') + '</div>';

      // Enable/disable toggle
      html += '<div class="ph-sms-toggle-row">';
      html += '<div>';
      html += '<div class="ph-sms-toggle-label">Daily SMS Briefing</div>';
      html += '<div class="ph-sms-toggle-desc">Receive your morning briefing via text</div>';
      html += '</div>';
      html += '<label class="ph-toggle">';
      html += '<input type="checkbox" id="smsEnabledToggle" ' + (smsSettings.smsEnabled ? 'checked' : '') + '>';
      html += '<span class="ph-toggle-track"></span>';
      html += '<span class="ph-toggle-thumb"></span>';
      html += '</label>';
      html += '</div>';

      // Briefing time
      html += '<div class="ph-sms-toggle-row">';
      html += '<div style="flex:1;">';
      html += '<div class="ph-sms-toggle-label">Briefing Time</div>';
      html += '<div class="ph-sms-toggle-desc">When to send your daily briefing</div>';
      html += '</div>';
      html += '<select class="ph-sms-select" id="smsBriefingTime" style="width:140px;">';
      for (var i = 0; i < BRIEFING_TIMES.length; i++) {
        var t = BRIEFING_TIMES[i];
        var sel = (smsSettings.smsBriefingTime === t.value) ? ' selected' : '';
        html += '<option value="' + t.value + '"' + sel + '>' + t.label + '</option>';
      }
      html += '</select>';
      html += '</div>';

      // Timezone
      html += '<div class="ph-sms-toggle-row">';
      html += '<div style="flex:1;">';
      html += '<div class="ph-sms-toggle-label">Timezone</div>';
      html += '<div class="ph-sms-toggle-desc">For sending at the right local time</div>';
      html += '</div>';
      html += '<select class="ph-sms-select" id="smsTimezone" style="width:200px;">';
      var detectedTz = detectTimezone();
      var currentTz = smsSettings.smsTimezone || detectedTz;
      // Add detected timezone if not in the list
      var foundInList = false;
      for (var k = 0; k < TIMEZONES.length; k++) {
        if (TIMEZONES[k].value === currentTz) foundInList = true;
      }
      if (!foundInList) {
        html += '<option value="' + escapeHtml(currentTz) + '" selected>' + escapeHtml(currentTz) + '</option>';
      }
      for (var j = 0; j < TIMEZONES.length; j++) {
        var tz = TIMEZONES[j];
        var tzSel = (currentTz === tz.value) ? ' selected' : '';
        html += '<option value="' + tz.value + '"' + tzSel + '>' + tz.label + '</option>';
      }
      html += '</select>';
      html += '</div>';

      // Remove phone
      html += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light,rgba(0,0,0,0.06));">';
      html += '<button class="ph-sms-btn ph-sms-btn-danger" id="btnRemovePhone" style="font-size:13px;padding:8px 16px;">Remove Phone Number</button>';
      html += '</div>';

      html += '<div id="smsMessage"></div>';
    }

    return html;
  }

  // ── SMS event binding ──────────────────────────────────────────────

  function bindSmsEvents() {
    var sendCodeBtn = document.getElementById('btnSendCode');
    if (sendCodeBtn) {
      sendCodeBtn.addEventListener('click', function () {
        var input = document.getElementById('smsPhoneInput');
        if (!input || !input.value.trim()) return showSmsMessage('Enter a phone number', true);
        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = 'Sending...';
        API.addPhoneNumber(input.value.trim())
          .then(function (result) {
            showSmsMessage(result.message || 'Code sent!', false);
            // Refresh settings to show OTP form
            return loadSmsSettings();
          })
          .then(function () {
            refreshSmsContent();
          })
          .catch(function (err) {
            showSmsMessage(err.message || 'Failed to send code', true);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = 'Verify';
          });
      });
    }

    var verifyCodeBtn = document.getElementById('btnVerifyCode');
    if (verifyCodeBtn) {
      verifyCodeBtn.addEventListener('click', function () {
        var input = document.getElementById('smsCodeInput');
        if (!input || !input.value.trim()) return showSmsMessage('Enter the 6-digit code', true);
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.textContent = 'Verifying...';
        API.verifyPhoneCode(input.value.trim())
          .then(function (result) {
            showSmsMessage(result.message || 'Phone verified!', false);
            if (result.smsSettings) {
              smsSettings = result.smsSettings;
              smsSettings.hasPhone = true;
              smsSettings.phoneVerified = true;
            }
            return loadSmsSettings();
          })
          .then(function () {
            refreshSmsContent();
          })
          .catch(function (err) {
            showSmsMessage(err.message || 'Invalid code', true);
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.textContent = 'Verify';
          });
      });
    }

    var resendBtn = document.getElementById('btnResendCode');
    if (resendBtn) {
      resendBtn.addEventListener('click', function () {
        // We need to re-submit with the existing phone
        resendBtn.disabled = true;
        resendBtn.textContent = 'Sending...';
        // Get the phone number hint from smsSettings
        showSmsMessage('To resend, remove and re-add your phone number.', false);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
      });
    }

    var removeBtn = document.getElementById('btnRemovePhone');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        if (!confirm('Remove your phone number? You\'ll stop receiving SMS briefings.')) return;
        removeBtn.disabled = true;
        API.removePhoneNumber()
          .then(function () {
            showSmsMessage('Phone number removed', false);
            return loadSmsSettings();
          })
          .then(function () {
            refreshSmsContent();
          })
          .catch(function (err) {
            showSmsMessage(err.message || 'Failed to remove', true);
            removeBtn.disabled = false;
          });
      });
    }

    var enabledToggle = document.getElementById('smsEnabledToggle');
    if (enabledToggle) {
      enabledToggle.addEventListener('change', function () {
        var enabled = enabledToggle.checked;
        API.updateSmsSettings({ smsEnabled: enabled })
          .then(function (result) {
            if (result && result.smsSettings) smsSettings = result.smsSettings;
            showSmsMessage(enabled ? 'SMS briefings enabled!' : 'SMS briefings paused.', false);
          })
          .catch(function (err) {
            showSmsMessage(err.message || 'Failed to update', true);
            enabledToggle.checked = !enabled;
          });
      });
    }

    var briefingTimeSelect = document.getElementById('smsBriefingTime');
    if (briefingTimeSelect) {
      briefingTimeSelect.addEventListener('change', function () {
        API.updateSmsSettings({ smsBriefingTime: briefingTimeSelect.value })
          .then(function (result) {
            if (result && result.smsSettings) smsSettings = result.smsSettings;
            showSmsMessage('Briefing time updated!', false);
          })
          .catch(function (err) {
            showSmsMessage(err.message || 'Failed to update', true);
          });
      });
    }

    var timezoneSelect = document.getElementById('smsTimezone');
    if (timezoneSelect) {
      timezoneSelect.addEventListener('change', function () {
        API.updateSmsSettings({ smsTimezone: timezoneSelect.value })
          .then(function (result) {
            if (result && result.smsSettings) smsSettings = result.smsSettings;
            showSmsMessage('Timezone updated!', false);
          })
          .catch(function (err) {
            showSmsMessage(err.message || 'Failed to update', true);
          });
      });
    }
  }

  function bindAccountEvents() {
    var exportBtn = document.getElementById('btnExportData');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        API.exportData()
          .then(function () {
            exportBtn.textContent = 'Downloaded!';
            setTimeout(function () {
              exportBtn.disabled = false;
              exportBtn.textContent = 'Export My Data';
            }, 2000);
          })
          .catch(function (err) {
            alert('Export failed: ' + (err.message || 'Unknown error'));
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export My Data';
          });
      });
    }

    var deleteBtn = document.getElementById('btnDeleteAccount');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        var user = Store.getUser();
        var email = user ? user.email : '';
        var confirm1 = prompt('Type your email (' + email + ') to permanently delete your account:');
        if (confirm1 !== email) {
          if (confirm1 !== null) alert('Email did not match. Account not deleted.');
          return;
        }
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
        API.deleteAccount(email)
          .catch(function (err) {
            alert('Failed to delete account: ' + (err.message || 'Unknown error'));
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Account';
          });
      });
    }
  }

  function refreshSmsContent() {
    var container = document.getElementById('smsContent');
    if (container) {
      container.innerHTML = renderSmsContent();
      bindSmsEvents();
    }
  }

  function showSmsMessage(msg, isError) {
    var el = document.getElementById('smsMessage');
    if (!el) return;
    el.className = isError ? 'ph-sms-error' : 'ph-sms-success';
    el.textContent = msg;
    if (!isError) {
      setTimeout(function () {
        if (el.textContent === msg) el.textContent = '';
      }, 4000);
    }
  }

  // ── Load settings from server ─────────────────────────────────────

  function loadSmsSettings() {
    return API.getSmsSettings()
      .then(function (data) {
        if (data) {
          smsSettings = data;
        } else {
          smsSettings = {
            hasPhone: false,
            phoneVerified: false,
            smsEnabled: false,
            smsBriefingTime: '08:00',
            smsTimezone: detectTimezone()
          };
        }
      });
  }

  // ── Open / Close ──────────────────────────────────────────────────

  function open() {
    if (isOpen) return;
    isOpen = true;
    createPanel();
    render();

    // Load SMS settings
    loadSmsSettings().then(function () {
      refreshSmsContent();
    });

    // Animate in
    requestAnimationFrame(function () {
      overlayEl.classList.add('open');
      panelEl.classList.add('open');
    });

    // Trap escape key
    document.addEventListener('keydown', handleEscape);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (overlayEl) overlayEl.classList.remove('open');
    if (panelEl) panelEl.classList.remove('open');
    document.removeEventListener('keydown', handleEscape);
  }

  function handleEscape(e) {
    if (e.key === 'Escape') close();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  // ── Init: add gear icon to top nav ──────────────────────────────────

  function init() {
    injectStyles();

    // Add gear icon to the top nav (before the logout button)
    var navRight = document.querySelector('.app-top-nav .nav-right');
    if (navRight) {
      var gearBtn = document.createElement('button');
      gearBtn.id = 'settingsBtn';
      gearBtn.setAttribute('aria-label', 'Settings');
      gearBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;color:var(--text-body,#374151);';
      gearBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="3"/>' +
        '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>' +
        '</svg>';
      gearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggle();
      });

      // Insert before logout button
      var logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        navRight.insertBefore(gearBtn, logoutBtn);
      } else {
        navRight.appendChild(gearBtn);
      }

      // Only show if logged in
      if (!API.isLoggedIn()) {
        gearBtn.style.display = 'none';
      }
    }
  }

  // ── Calendar Integration Section ──────────────────────────────────

  var calendarStatus = null;

  function renderCalendarSection() {
    var conn = Store.getCalendarConnection ? Store.getCalendarConnection() : null;
    var connected = conn && conn.connected;

    var html = '<div class="ph-settings-section">';
    html += '<h3>Calendar</h3>';
    html += '<p>Connect your calendar for schedule-aware predictions and briefings</p>';

    if (connected) {
      html += '<div style="display:flex;align-items:center;gap:8px;margin:8px 0;">';
      html += '<span style="color:var(--teal);font-weight:700;">Connected</span>';
      html += '<span style="font-size:12px;color:var(--gray-text);">via Google Calendar</span>';
      html += '</div>';
      if (conn.lastSynced) {
        var syncDate = new Date(conn.lastSynced);
        html += '<p style="font-size:12px;color:var(--gray-text);margin-bottom:8px;">Last synced: ' + syncDate.toLocaleString() + '</p>';
      }
      html += '<div style="display:flex;gap:8px;">';
      html += '<button class="ph-sms-btn ph-sms-btn-secondary" id="btnCalSync">Sync Now</button>';
      html += '<button class="ph-sms-btn ph-sms-btn-danger" id="btnCalDisconnect" style="background:transparent;color:var(--coral);border:1px solid var(--coral);">Disconnect</button>';
      html += '</div>';
    } else {
      html += '<button class="ph-sms-btn" id="btnCalConnect" style="background:var(--teal);color:#fff;margin-top:8px;">Connect Google Calendar</button>';
    }

    html += '</div>';
    return html;
  }

  function bindCalendarEvents() {
    var connectBtn = document.getElementById('btnCalConnect');
    if (connectBtn) {
      connectBtn.addEventListener('click', function () {
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;
        API.startCalendarAuth().then(function (result) {
          if (result && result.url) {
            window.location.href = result.url;
          } else {
            connectBtn.textContent = 'Setup Required';
            connectBtn.style.background = 'var(--coral)';
          }
        }).catch(function () {
          connectBtn.textContent = 'Error — try again';
          connectBtn.disabled = false;
        });
      });
    }

    var syncBtn = document.getElementById('btnCalSync');
    if (syncBtn) {
      syncBtn.addEventListener('click', function () {
        syncBtn.textContent = 'Syncing...';
        syncBtn.disabled = true;
        API.syncCalendar().then(function (result) {
          syncBtn.textContent = 'Synced!';
          setTimeout(function () { render(); }, 1500);
        }).catch(function () {
          syncBtn.textContent = 'Sync failed';
          syncBtn.disabled = false;
        });
      });
    }

    var disconnectBtn = document.getElementById('btnCalDisconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function () {
        if (!confirm('Disconnect Google Calendar? Your synced events will be removed.')) return;
        API.disconnectCalendar().then(function () {
          render();
        }).catch(function () {
          alert('Failed to disconnect. Please try again.');
        });
      });
    }
  }

  function fetchCalendarStatus() {
    if (!API.getCalendarStatus) return;
    API.getCalendarStatus().then(function (result) {
      if (result && result.connected) {
        // Trigger initial sync
        API.syncCalendar().catch(function () {});
      }
      render();
    }).catch(function () {});
  }

  // ── Cycle Tracking Section ────────────────────────────────────────

  function renderCycleSection() {
    var cp = Store.getCycleProfile() || {};
    var enabled = cp.trackingEnabled || false;
    var length = cp.averageCycleLength || 28;
    var lastStart = cp.lastPeriodStart || '';

    var html = '<div class="ph-settings-section">';
    html += '<h3>\uD83D\uDD04 Cycle Tracking</h3>';
    html += '<p>Track your cycle to unlock phase-based insights for energy, focus, and performance.</p>';

    // Enable toggle
    html += '<div class="ph-sms-toggle-row" style="border-top:none;">';
    html += '<div>';
    html += '<div class="ph-sms-toggle-label">Track my cycle</div>';
    html += '</div>';
    html += '<label class="ph-toggle">';
    html += '<input type="checkbox" id="cycleEnabledToggle" ' + (enabled ? 'checked' : '') + '>';
    html += '<span class="ph-toggle-track"></span>';
    html += '<span class="ph-toggle-thumb"></span>';
    html += '</label>';
    html += '</div>';

    html += '<div id="cycleDetails" style="' + (enabled ? '' : 'display:none;') + '">';

    // Cycle length
    html += '<div class="ph-sms-toggle-row">';
    html += '<div style="flex:1;">';
    html += '<div class="ph-sms-toggle-label">Cycle Length</div>';
    html += '<div class="ph-sms-toggle-desc">Most cycles are 26-32 days</div>';
    html += '</div>';
    html += '<select class="ph-sms-select" id="cycleLengthSelect" style="width:100px;">';
    for (var i = 21; i <= 40; i++) {
      var sel = (i === length) ? ' selected' : '';
      html += '<option value="' + i + '"' + sel + '>' + i + ' days</option>';
    }
    html += '</select>';
    html += '</div>';

    // Last period start: "days ago" chips
    html += '<div style="padding:12px 0;border-top:1px solid var(--border-light,rgba(0,0,0,0.06));">';
    html += '<div class="ph-sms-toggle-label">Last period start</div>';
    html += '<div class="ph-sms-toggle-desc" style="margin-bottom:10px;">Day 1 = first day of full flow (not spotting)</div>';

    // Calculate current selection
    var selectedDay = -1;
    if (lastStart) {
      var diff = Math.round((new Date().setHours(0,0,0,0) - new Date(lastStart + 'T00:00:00').getTime()) / 86400000);
      if (diff >= 0 && diff < 35) selectedDay = diff;
    }

    html += '<div id="cycleDayChips" style="display:flex;flex-wrap:wrap;gap:6px;">';
    for (var d = 0; d < 35; d++) {
      var label = d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d + 'd ago';
      var isActive = d === selectedDay;
      var chipStyle = isActive
        ? 'background:rgba(45,138,138,0.15);border-color:var(--teal,#2d8a8a);color:var(--teal,#2d8a8a);font-weight:600;'
        : 'background:#fff;border-color:var(--border-light,rgba(0,0,0,0.1));color:var(--text-body,#374151);';
      html += '<button class="ph-cycle-day-chip" data-day="' + d + '" style="' +
        'padding:6px 12px;border-radius:20px;border:1px solid;font-size:13px;cursor:pointer;transition:all 0.2s;font-family:inherit;' +
        chipStyle + '">' + label + '</button>';
    }
    html += '</div>';
    html += '</div>';

    html += '</div>'; // end cycleDetails

    html += '<div id="cycleMessage" style="font-size:13px;text-align:center;min-height:20px;margin-top:8px;"></div>';
    html += '</div>'; // end section

    return html;
  }

  function bindCycleEvents() {
    var toggle = document.getElementById('cycleEnabledToggle');
    var details = document.getElementById('cycleDetails');

    if (toggle) {
      toggle.addEventListener('change', function () {
        if (details) details.style.display = toggle.checked ? '' : 'none';
        saveCycleSettings();
      });
    }

    var lengthSelect = document.getElementById('cycleLengthSelect');
    if (lengthSelect) {
      lengthSelect.addEventListener('change', function () {
        saveCycleSettings();
      });
    }

    var chips = document.querySelectorAll('.ph-cycle-day-chip');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          // Update visual state
          var allChips = document.querySelectorAll('.ph-cycle-day-chip');
          for (var j = 0; j < allChips.length; j++) {
            allChips[j].style.background = '#fff';
            allChips[j].style.borderColor = 'var(--border-light,rgba(0,0,0,0.1))';
            allChips[j].style.color = 'var(--text-body,#374151)';
            allChips[j].style.fontWeight = 'normal';
          }
          chip.style.background = 'rgba(45,138,138,0.15)';
          chip.style.borderColor = 'var(--teal,#2d8a8a)';
          chip.style.color = 'var(--teal,#2d8a8a)';
          chip.style.fontWeight = '600';

          saveCycleSettings();
        });
      })(chips[i]);
    }
  }

  function saveCycleSettings() {
    var toggle = document.getElementById('cycleEnabledToggle');
    var lengthSelect = document.getElementById('cycleLengthSelect');
    var enabled = toggle ? toggle.checked : false;

    var cycleProfile = {
      trackingEnabled: enabled
    };

    if (enabled) {
      cycleProfile.averageCycleLength = lengthSelect ? parseInt(lengthSelect.value) : 28;

      // Find selected day chip
      var activeChip = document.querySelector('.ph-cycle-day-chip[style*="rgba(45,138,138"]');
      if (activeChip) {
        var daysAgo = parseInt(activeChip.getAttribute('data-day'));
        var d = new Date();
        d.setDate(d.getDate() - daysAgo);
        cycleProfile.lastPeriodStart = d.toISOString().split('T')[0];
      }
    }

    var statusEl = document.getElementById('cycleMessage');
    if (statusEl) {
      statusEl.textContent = 'Saving...';
      statusEl.style.color = 'var(--gray-text,#6b7280)';
    }

    API.updateUser({ cycleProfile: cycleProfile })
      .then(function () {
        Store.setCycleProfile(cycleProfile);
        if (statusEl) {
          statusEl.textContent = 'Saved!';
          statusEl.style.color = 'var(--teal,#2d8a8a)';
        }
        setTimeout(function () {
          if (statusEl) statusEl.textContent = '';
        }, 3000);
      })
      .catch(function (err) {
        if (statusEl) {
          statusEl.textContent = 'Failed to save: ' + (err.message || 'Unknown error');
          statusEl.style.color = '#ef4444';
        }
      });
  }

  // ── Utility ────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    init: init,
    open: open,
    close: close,
    toggle: toggle
  };
})();
