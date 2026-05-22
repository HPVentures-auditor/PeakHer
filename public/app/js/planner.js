/**
 * PeakHer "Plan My Week" Module
 *
 * Lets the user drop in her priority tasks for the week. Dot reads the week
 * ahead (cycle phase per day + her Google Calendar load) and places each task
 * on the day whose hormonal phase fits it best, in a real open time block.
 *
 * Backend: POST /api/weekly-plan  (api.js -> API.getWeeklyPlan)
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Planner = (function () {
  'use strict';

  var container = null;
  var lastTasksText = '';

  // Canonical phase colors (see CLAUDE.md brand system).
  var PHASE_COLORS = {
    Restore: '#9B30FF',
    Rise:    '#00E5A0',
    Peak:    '#FFD700',
    Sustain: '#FF6B6B'
  };

  function phaseColor(label) { return PHASE_COLORS[label] || '#2d8a8a'; }

  // ── Styles ──────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('planner-styles')) return;
    var css = [
      '#screen-plan .pl-wrap { padding: 24px 20px calc(24px + var(--bottom-nav-height)); max-width: 640px; margin: 0 auto; }',
      '#screen-plan .pl-h1 { font-size: 26px; font-weight: 800; color: var(--text-dark); margin: 0 0 4px; }',
      '#screen-plan .pl-sub { font-size: 15px; color: var(--text-muted); margin: 0 0 20px; line-height: 1.5; }',
      '#screen-plan .pl-card { background: var(--card-bg, #fff); border: 1px solid var(--border, #eee); border-radius: 16px; padding: 18px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(10,22,40,0.04); }',
      '#screen-plan .pl-label { font-size: 13px; font-weight: 700; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }',
      '#screen-plan textarea.pl-input { width: 100%; min-height: 150px; border: 1px solid var(--border, #ddd); border-radius: 12px; padding: 12px 14px; font: inherit; font-size: 15px; line-height: 1.6; resize: vertical; box-sizing: border-box; color: var(--text-dark); background: var(--bg, #fff); }',
      '#screen-plan textarea.pl-input:focus { outline: none; border-color: var(--teal); }',
      '#screen-plan .pl-hint { font-size: 13px; color: var(--text-muted); margin-top: 8px; }',
      '#screen-plan .pl-hint a { color: var(--teal); font-weight: 600; cursor: pointer; }',
      '#screen-plan .pl-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--teal); color: #fff; border: none; border-radius: 12px; padding: 13px 22px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .15s; }',
      '#screen-plan .pl-btn:hover { opacity: .9; }',
      '#screen-plan .pl-btn:disabled { opacity: .5; cursor: default; }',
      '#screen-plan .pl-btn-ghost { background: transparent; color: var(--teal); border: 1px solid var(--teal); }',
      '#screen-plan .pl-week { display: flex; gap: 6px; margin-bottom: 18px; }',
      '#screen-plan .pl-day { flex: 1; text-align: center; border-radius: 10px; padding: 8px 2px; background: var(--card-bg,#fff); border: 1px solid var(--border,#eee); }',
      '#screen-plan .pl-day-wd { font-size: 11px; font-weight: 700; color: var(--text-muted); }',
      '#screen-plan .pl-day-dot { width: 10px; height: 10px; border-radius: 50%; margin: 5px auto 3px; }',
      '#screen-plan .pl-day-ph { font-size: 10px; font-weight: 700; }',
      '#screen-plan .pl-dot-summary { background: linear-gradient(135deg, rgba(45,138,138,0.10), rgba(232,116,97,0.10)); border: 1px solid var(--border,#eee); border-radius: 16px; padding: 16px 18px; margin-bottom: 18px; font-size: 15px; line-height: 1.55; color: var(--text-dark); }',
      '#screen-plan .pl-dot-summary .pl-dot-name { font-weight: 800; color: var(--teal); }',
      '#screen-plan .pl-day-group { margin-bottom: 14px; }',
      '#screen-plan .pl-day-head { display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--text-dark); font-size: 15px; margin-bottom: 8px; padding-left: 2px; }',
      '#screen-plan .pl-day-head .pl-chip { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; padding: 2px 8px; border-radius: 999px; color: #1a1a1a; }',
      '#screen-plan .pl-task { border-left: 3px solid var(--teal); background: var(--card-bg,#fff); border-radius: 0 12px 12px 0; padding: 12px 14px; margin-bottom: 8px; box-shadow: 0 1px 6px rgba(10,22,40,0.04); }',
      '#screen-plan .pl-task-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }',
      '#screen-plan .pl-task-name { font-weight: 700; color: var(--text-dark); font-size: 15px; }',
      '#screen-plan .pl-task-time { font-size: 13px; font-weight: 700; color: var(--teal); white-space: nowrap; }',
      '#screen-plan .pl-task-reason { font-size: 13px; color: var(--text-muted); margin-top: 4px; line-height: 1.45; }',
      '#screen-plan .pl-unsched { border-left-color: #c0392b; }',
      '#screen-plan .pl-error { background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.3); color: #c0392b; border-radius: 12px; padding: 14px 16px; font-size: 14px; line-height: 1.5; }',
      '#screen-plan .pl-shimmer { height: 64px; border-radius: 12px; margin-bottom: 10px; background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 37%, rgba(0,0,0,0.04) 63%); background-size: 400% 100%; animation: pl-sh 1.4s ease infinite; }',
      '@keyframes pl-sh { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'planner-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseTasks(text) {
    return (text || '').split('\n')
      .map(function (l) { return l.replace(/^\s*[-*\d.)\]]+\s*/, '').trim(); })
      .filter(function (l) { return l.length > 0; })
      .slice(0, 20);
  }

  function fmtTime(t) {
    if (!t) return '';
    var p = t.split(':');
    var h = parseInt(p[0], 10);
    var m = p[1];
    var ampm = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + (m === '00' ? '' : ':' + m) + ampm;
  }

  function shortWeekday(wd) { return (wd || '').slice(0, 3); }

  // ── Views ───────────────────────────────────────────────────────────

  function renderInput(prefill) {
    injectStyles();
    var text = prefill !== undefined ? prefill : lastTasksText;
    container.innerHTML =
      '<div class="pl-wrap">'
      + '<h1 class="pl-h1">Plan My Week</h1>'
      + '<p class="pl-sub">Drop in what matters most this week, one per line. I\'ll place each one on the day your biology is built for it, around what\'s already on your calendar.</p>'
      + '<div class="pl-card">'
      +   '<div class="pl-label">Your priorities this week</div>'
      +   '<textarea class="pl-input" id="pl-tasks" placeholder="Pitch the new offer to a partner\nDraft the Q3 strategy\nReconcile last month’s finances\nRecord a podcast episode\nPlan + journal personal goals">' + escapeHtml(text) + '</textarea>'
      +   '<div class="pl-hint" id="pl-cal-hint"></div>'
      + '</div>'
      + '<button class="pl-btn" id="pl-go">Plan my week</button>'
      + '</div>';

    var btn = document.getElementById('pl-go');
    btn.addEventListener('click', onPlan);

    // Non-blocking calendar hint.
    var API = window.PeakHer.API;
    if (API && API.getCalendarStatus) {
      API.getCalendarStatus().then(function (st) {
        var hint = document.getElementById('pl-cal-hint');
        if (!hint) return;
        if (st && st.connected) {
          hint.innerHTML = '✓ Reading your Google Calendar to plan around real meetings.';
          hint.style.color = 'var(--teal)';
        } else {
          hint.innerHTML = 'Tip: <a id="pl-cal-link">connect your Google Calendar</a> in Settings so I plan around your real schedule.';
          var link = document.getElementById('pl-cal-link');
          if (link) link.addEventListener('click', function () {
            if (window.PeakHer.Settings && window.PeakHer.Settings.open) window.PeakHer.Settings.open();
          });
        }
      }).catch(function () {});
    }
  }

  function renderLoading() {
    container.innerHTML =
      '<div class="pl-wrap">'
      + '<h1 class="pl-h1">Planning your week…</h1>'
      + '<p class="pl-sub">Reading your phases and your calendar, then matching each priority to its best day.</p>'
      + '<div class="pl-shimmer"></div><div class="pl-shimmer"></div><div class="pl-shimmer"></div>'
      + '</div>';
  }

  function renderError(message, showOnboarding) {
    injectStyles();
    var action = showOnboarding
      ? '<button class="pl-btn pl-btn-ghost" id="pl-fix" style="margin-top:14px;">Finish setup</button>'
      : '<button class="pl-btn pl-btn-ghost" id="pl-back" style="margin-top:14px;">Back</button>';
    container.innerHTML =
      '<div class="pl-wrap">'
      + '<h1 class="pl-h1">Plan My Week</h1>'
      + '<div class="pl-error">' + escapeHtml(message) + '</div>'
      + action
      + '</div>';
    var fix = document.getElementById('pl-fix');
    if (fix) fix.addEventListener('click', function () { window.location.hash = 'onboarding'; });
    var back = document.getElementById('pl-back');
    if (back) back.addEventListener('click', function () { renderInput(); });
  }

  function renderPlan(plan) {
    injectStyles();
    var phaseMap = plan.phaseMap || [];
    var placements = plan.placements || [];
    var unscheduled = plan.unscheduled || [];

    // Week strip
    var strip = phaseMap.map(function (d) {
      var c = phaseColor(d.phaseLabel);
      return '<div class="pl-day">'
        + '<div class="pl-day-wd">' + escapeHtml(shortWeekday(d.weekday)) + '</div>'
        + '<div class="pl-day-dot" style="background:' + c + ';"></div>'
        + '<div class="pl-day-ph" style="color:' + c + ';">' + escapeHtml(d.phaseLabel) + '</div>'
        + '</div>';
    }).join('');

    // Group placements by date, in phaseMap order
    var order = phaseMap.map(function (d) { return d.date; });
    var byDate = {};
    placements.forEach(function (p) { (byDate[p.date] = byDate[p.date] || []).push(p); });

    var groups = order.filter(function (date) { return byDate[date]; }).map(function (date) {
      var dayInfo = phaseMap.filter(function (d) { return d.date === date; })[0] || {};
      var c = phaseColor(dayInfo.phaseLabel);
      var tasksHtml = byDate[date].map(function (p) {
        var time = (p.suggestedStart ? fmtTime(p.suggestedStart) : '');
        if (p.suggestedEnd) time += '–' + fmtTime(p.suggestedEnd);
        return '<div class="pl-task" style="border-left-color:' + c + ';">'
          + '<div class="pl-task-top">'
          +   '<span class="pl-task-name">' + escapeHtml(p.task) + '</span>'
          +   (time ? '<span class="pl-task-time" style="color:' + c + ';">' + time + '</span>' : '')
          + '</div>'
          + (p.reason ? '<div class="pl-task-reason">' + escapeHtml(p.reason) + '</div>' : '')
          + '</div>';
      }).join('');
      return '<div class="pl-day-group">'
        + '<div class="pl-day-head">' + escapeHtml(dayInfo.weekday || '')
        +   ' <span class="pl-chip" style="background:' + c + ';">' + escapeHtml(dayInfo.phaseLabel || '') + '</span></div>'
        + tasksHtml
        + '</div>';
    }).join('');

    var unschedHtml = '';
    if (unscheduled.length) {
      unschedHtml = '<div class="pl-day-group"><div class="pl-day-head" style="color:#c0392b;">Didn’t place this week</div>'
        + unscheduled.map(function (u) {
            return '<div class="pl-task pl-unsched"><div class="pl-task-name">' + escapeHtml(u.task) + '</div>'
              + (u.reason ? '<div class="pl-task-reason">' + escapeHtml(u.reason) + '</div>' : '') + '</div>';
          }).join('')
        + '</div>';
    }

    container.innerHTML =
      '<div class="pl-wrap">'
      + '<h1 class="pl-h1">Your week, planned</h1>'
      + '<div class="pl-week">' + strip + '</div>'
      + (plan.dotSummary ? '<div class="pl-dot-summary"><span class="pl-dot-name">Dot:</span> ' + escapeHtml(plan.dotSummary) + '</div>' : '')
      + groups
      + unschedHtml
      + '<button class="pl-btn pl-btn-ghost" id="pl-edit" style="margin-top:6px;">Edit priorities</button>'
      + '</div>';

    var edit = document.getElementById('pl-edit');
    if (edit) edit.addEventListener('click', function () { renderInput(lastTasksText); });
  }

  // ── Actions ─────────────────────────────────────────────────────────

  function onPlan() {
    var ta = document.getElementById('pl-tasks');
    var text = ta ? ta.value : '';
    lastTasksText = text;
    var tasks = parseTasks(text);
    if (tasks.length === 0) {
      var hint = document.getElementById('pl-cal-hint');
      if (hint) { hint.textContent = 'Add at least one priority to plan your week.'; hint.style.color = '#c0392b'; }
      return;
    }

    var API = window.PeakHer.API;
    if (!API || !API.getWeeklyPlan) { renderError('Planner is unavailable right now. Try again shortly.'); return; }

    renderLoading();
    API.getWeeklyPlan(tasks).then(function (plan) {
      renderPlan(plan);
    }).catch(function (err) {
      if (err && err.status === 400 && /cycle tracking/i.test(err.message || '')) {
        renderError('I need your cycle details before I can plan your week. Finish setup and I’ll map your phases.', true);
      } else if (err && err.status === 401) {
        window.location.hash = 'login';
      } else {
        renderError((err && err.message) ? err.message : 'Something went wrong planning your week. Try again.');
      }
    });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  function refresh() {
    container = document.getElementById('screen-plan');
    if (!container) return;
    // Preserve a prior plan view across tab switches only within the same session
    // by always re-showing the input (cheap + predictable). Prefill last tasks.
    renderInput();
  }

  function init() {
    container = document.getElementById('screen-plan');
    injectStyles();
  }

  return {
    init: init,
    refresh: refresh
  };
})();
