/**
 * PeakHer History / Calendar Module
 * Monthly calendar view with check-in dots, cycle phase tints,
 * streak display, and day-detail bottom sheet.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.History = (function () {
  'use strict';

  // ── Dependencies ────────────────────────────────────────────────
  var Store, Cycle, Utils, Router;

  // ── State ───────────────────────────────────────────────────────
  var currentYear;
  var currentMonth; // 0-indexed
  var detailOpen = false;

  // ── Month / day-name labels ─────────────────────────────────────
  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  var DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  var DAYS_LONG = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ];

  var MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // ── Score thresholds ────────────────────────────────────────────
  var COLOR_LOW   = '#E87461'; // coral  (avg <= 3.5)
  var COLOR_MID   = '#e8a961'; // amber  (avg 3.6-6.5)
  var COLOR_HIGH  = '#2d8a8a'; // teal   (avg >= 6.6)

  // ── Helpers ─────────────────────────────────────────────────────

  function getScoreColor(avg) {
    if (avg <= 3.5) return COLOR_LOW;
    if (avg <= 6.5) return COLOR_MID;
    return COLOR_HIGH;
  }

  function barColor(value) {
    if (value <= 3.5) return COLOR_LOW;
    if (value <= 6.5) return COLOR_MID;
    return COLOR_HIGH;
  }

  /** Pad a number to two digits. */
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  /** Build "YYYY-MM-DD" from year, month (0-indexed), day. */
  function toDateStr(y, m, d) {
    return y + '-' + pad2(m + 1) + '-' + pad2(d);
  }

  // ── Calendar generation ─────────────────────────────────────────

  /**
   * Return an array of week arrays. Each week has 7 entries:
   *   null  for padding cells (other months)
   *   1..31 for actual days
   * Weeks start on Monday.
   */
  function generateCalendar(year, month) {
    var firstDay = new Date(year, month, 1);
    var lastDay  = new Date(year, month + 1, 0);
    var startDayOfWeek = firstDay.getDay(); // 0=Sun
    var startOffset = (startDayOfWeek + 6) % 7; // shift to Mon=0
    var totalDays = lastDay.getDate();
    var weeks = [];
    var currentWeek = [];

    // Leading empty cells
    for (var i = 0; i < startOffset; i++) {
      currentWeek.push(null);
    }

    for (var d = 1; d <= totalDays; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return weeks;
  }

  // ── Inject styles (once) ────────────────────────────────────────

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var css = '' +
      /* --- Top section --- */
      '.history-top{text-align:center;padding:16px 20px 8px}' +
      '.history-streak{font-size:22px;font-weight:700;margin-bottom:4px}' +
      '.history-total{font-size:13px;color:var(--gray-text,#b0b0b0)}' +

      /* --- Month nav --- */
      '.history-month-nav{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 20px 8px}' +
      '.history-month-nav button{width:44px;height:44px;border:none;background:rgba(255,255,255,0.06);' +
        'color:#fff;font-size:20px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s}' +
      '.history-month-nav button:active{background:rgba(255,255,255,0.12)}' +
      '.history-month-nav button:disabled{opacity:0.25;cursor:default}' +
      '.history-month-label{font-size:18px;font-weight:600;min-width:170px;text-align:center}' +

      /* --- Calendar grid --- */
      '.history-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:8px 12px 16px}' +
      '.history-cal-header{font-size:11px;color:var(--gray-text,#b0b0b0);text-align:center;padding:4px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}' +
      '.history-day{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'border-radius:8px;cursor:pointer;position:relative;min-height:42px;transition:background 0.15s}' +
      '.history-day:active{background:rgba(255,255,255,0.06)}' +
      '.history-day.empty{cursor:default;pointer-events:none}' +
      '.history-day.future{opacity:0.3;cursor:default;pointer-events:none}' +
      '.history-day.other-month{opacity:0.12;cursor:default;pointer-events:none}' +
      '.history-day-num{font-size:13px;color:var(--gray-text,#b0b0b0);line-height:1;z-index:1}' +
      '.history-day.today{box-shadow:inset 0 0 0 2px #fff;border-radius:8px}' +
      '.history-dot{width:8px;height:8px;border-radius:50%;margin-top:4px;z-index:1}' +

      /* --- Empty state --- */
      '.history-empty{text-align:center;padding:48px 24px}' +
      '.history-empty p{font-size:16px;color:var(--gray-text,#b0b0b0);margin-bottom:20px;line-height:1.5}' +
      '.history-empty button{padding:14px 28px;border-radius:8px;background:var(--coral,#E87461);color:#fff;' +
        'font-size:15px;font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:transform 0.2s}' +
      '.history-empty button:active{transform:scale(0.97)}' +

      /* --- Day detail overlay --- */
      '.day-detail-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;opacity:0;' +
        'transition:opacity 0.3s;display:none}' +
      '.day-detail-overlay.active{display:block;opacity:1}' +

      /* --- Day detail panel --- */
      '.day-detail-panel{position:fixed;bottom:0;left:0;right:0;background:var(--navy-light,#0f2035);' +
        'border-radius:20px 20px 0 0;padding:24px 20px calc(24px + 72px);z-index:501;' +
        'transform:translateY(100%);transition:transform 0.3s ease;max-height:70vh;overflow-y:auto}' +
      '.day-detail-panel.active{transform:translateY(0)}' +
      '.day-detail-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);margin:0 auto 16px}' +
      '.day-detail-date{font-size:18px;font-weight:700;margin-bottom:6px}' +
      '.day-detail-cycle{display:inline-flex;align-items:center;gap:8px;font-size:13px;' +
        'padding:6px 12px;border-radius:20px;margin-bottom:16px;font-weight:600}' +

      /* --- Metrics grid --- */
      '.day-detail-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}' +
      '.day-metric{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);' +
        'border-radius:10px;padding:14px}' +
      '.day-metric-label{font-size:11px;color:var(--gray-text,#b0b0b0);text-transform:uppercase;' +
        'letter-spacing:0.5px;margin-bottom:6px;font-weight:600}' +
      '.day-metric-value{font-size:22px;font-weight:700;margin-bottom:6px}' +
      '.day-metric-bar{width:100%;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden}' +
      '.day-metric-bar-fill{height:100%;border-radius:2px;transition:width 0.3s ease}' +

      /* --- Notes --- */
      '.day-detail-notes{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);' +
        'border-radius:10px;padding:14px;margin-bottom:16px}' +
      '.day-detail-notes-label{font-size:11px;color:var(--gray-text,#b0b0b0);text-transform:uppercase;' +
        'letter-spacing:0.5px;margin-bottom:6px;font-weight:600}' +
      '.day-detail-notes p{font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5}' +

      /* --- Action buttons --- */
      '.day-detail-actions{display:flex;gap:10px}' +
      '.day-detail-actions button{flex:1;padding:12px 0;border-radius:8px;font-size:14px;' +
        'font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:transform 0.2s}' +
      '.day-detail-actions button:active{transform:scale(0.97)}' +
      '.day-detail-btn-edit{background:var(--coral,#E87461);color:#fff}' +
      '.day-detail-btn-close{background:rgba(255,255,255,0.08);color:#fff}' +

      /* --- Responsive: ensure day cells scale --- */
      '@media(min-width:500px){.history-day{min-height:48px}}' +
    '';

    var style = document.createElement('style');
    style.setAttribute('data-peakher', 'history');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Render ──────────────────────────────────────────────────────

  function render() {
    var container = document.getElementById('screen-history');
    if (!container) return;

    var today      = Utils.getToday();
    var todayDate  = Utils.parseDate(today);
    var todayYear  = todayDate.getFullYear();
    var todayMonth = todayDate.getMonth();
    var todayDay   = todayDate.getDate();

    var streak     = Store.getStreak();
    var checkins   = Store.getCheckins();
    var checkinCount = Store.getCheckinCount();
    var cycleProfile = Store.getCycleProfile();
    var cycleEnabled = Cycle.isTrackingEnabled();

    var weeks = generateCalendar(currentYear, currentMonth);

    // Build HTML
    var html = '';

    // ── Top section (streak + total) ──────────────────────────────
    html += '<div class="history-top">';
    if (streak.current > 0) {
      html += '<div class="history-streak">\uD83D\uDD25 ' + streak.current + ' day streak</div>';
    } else {
      html += '<div class="history-streak">Start your streak!</div>';
    }
    html += '<div class="history-total">' + checkinCount + ' total check-in' + (checkinCount !== 1 ? 's' : '') + '</div>';
    html += '</div>';

    // ── Month navigation ──────────────────────────────────────────
    var canGoForward = !(currentYear === todayYear && currentMonth === todayMonth);

    html += '<div class="history-month-nav">';
    html += '<button id="history-prev" aria-label="Previous month">\u2039</button>';
    html += '<div class="history-month-label">' + MONTHS[currentMonth] + ' ' + currentYear + '</div>';
    html += '<button id="history-next" aria-label="Next month"' + (canGoForward ? '' : ' disabled') + '>\u203A</button>';
    html += '</div>';

    // ── Empty state check ─────────────────────────────────────────
    if (checkinCount === 0) {
      html += '<div class="history-empty">';
      html += '<p>No check-ins yet.<br>Start tracking today!</p>';
      html += '<button id="history-start-btn">Check In Now</button>';
      html += '</div>';

      container.innerHTML = html;
      bindNavEvents(container);
      var startBtn = container.querySelector('#history-start-btn');
      if (startBtn) {
        startBtn.addEventListener('click', function () {
          Router.navigate('#checkin');
        });
      }
      return;
    }

    // ── Calendar grid ─────────────────────────────────────────────
    html += '<div class="history-cal">';

    // Day-name headers
    for (var h = 0; h < DAY_HEADERS.length; h++) {
      html += '<div class="history-cal-header">' + DAY_HEADERS[h] + '</div>';
    }

    // Week rows
    for (var w = 0; w < weeks.length; w++) {
      for (var c = 0; c < 7; c++) {
        var day = weeks[w][c];

        if (day === null) {
          html += '<div class="history-day empty other-month"></div>';
          continue;
        }

        var dateStr = toDateStr(currentYear, currentMonth, day);
        var dateObj = new Date(currentYear, currentMonth, day);
        var isFuture = (currentYear > todayYear) ||
                       (currentYear === todayYear && currentMonth > todayMonth) ||
                       (currentYear === todayYear && currentMonth === todayMonth && day > todayDay);
        var isToday = (currentYear === todayYear && currentMonth === todayMonth && day === todayDay);
        var checkin = checkins[dateStr] || null;

        var classes = 'history-day';
        if (isFuture) classes += ' future';
        if (isToday) classes += ' today';

        // Cycle phase tint
        var bgStyle = '';
        if (cycleEnabled && cycleProfile) {
          var cycleDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, cycleProfile.averageCycleLength, dateStr);
          if (cycleDay) {
            var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
            var mode  = Cycle.getPerformanceMode(phase);
            var modeColor = Cycle.getModeColor(mode);
            bgStyle = 'background:' + hexToRgba(modeColor, 0.08) + ';';
          }
        }

        html += '<div class="' + classes + '" data-date="' + dateStr + '" style="' + bgStyle + '">';
        html += '<span class="history-day-num">' + day + '</span>';

        // Score dot
        if (checkin) {
          var energy     = (checkin.energy !== undefined && checkin.energy !== null) ? checkin.energy : null;
          var confidence = (checkin.confidence !== undefined && checkin.confidence !== null) ? checkin.confidence : null;
          var vals = [];
          if (energy !== null) vals.push(energy);
          if (confidence !== null) vals.push(confidence);

          if (vals.length > 0) {
            var avg = Utils.mean(vals);
            var dotColor = getScoreColor(avg);
            html += '<span class="history-dot" style="background:' + dotColor + '"></span>';
          }
        }

        html += '</div>';
      }
    }

    html += '</div>'; // .history-cal

    container.innerHTML = html;
    bindNavEvents(container);
    bindDayEvents(container);
  }

  /** Convert a hex color to rgba string. */
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ── Event binding ───────────────────────────────────────────────

  function bindNavEvents(container) {
    var prevBtn = container.querySelector('#history-prev');
    var nextBtn = container.querySelector('#history-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        render();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var todayDate  = Utils.parseDate(Utils.getToday());
        var todayYear  = todayDate.getFullYear();
        var todayMonth = todayDate.getMonth();

        if (currentYear === todayYear && currentMonth === todayMonth) return;

        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        render();
      });
    }
  }

  function bindDayEvents(container) {
    var dayCells = container.querySelectorAll('.history-day[data-date]');
    for (var i = 0; i < dayCells.length; i++) {
      dayCells[i].addEventListener('click', function () {
        var dateStr = this.getAttribute('data-date');
        if (!dateStr) return;
        var checkin = Store.getCheckin(dateStr);
        if (checkin) {
          showDayDetail(dateStr, checkin);
        }
      });
    }
  }

  // ── Day detail bottom sheet ─────────────────────────────────────

  function showDayDetail(dateStr, checkin) {
    // Remove any existing overlay/panel
    closeDayDetail();

    var today = Utils.getToday();
    var dateObj = Utils.parseDate(dateStr);
    var cycleProfile = Store.getCycleProfile();
    var cycleEnabled = Cycle.isTrackingEnabled();

    // Build overlay
    var overlay = document.createElement('div');
    overlay.className = 'day-detail-overlay';
    overlay.id = 'day-detail-overlay';

    // Build panel
    var panel = document.createElement('div');
    panel.className = 'day-detail-panel';
    panel.id = 'day-detail-panel';

    var panelHtml = '';

    // Handle
    panelHtml += '<div class="day-detail-handle"></div>';

    // Date header
    var dayName = DAYS_LONG[dateObj.getDay()];
    var monthName = MONTHS_SHORT[dateObj.getMonth()];
    panelHtml += '<div class="day-detail-date">' + dayName + ', ' + monthName + ' ' + dateObj.getDate() + ', ' + dateObj.getFullYear() + '</div>';

    // Cycle info
    if (cycleEnabled && cycleProfile) {
      var cycleDay = Cycle.getCycleDay(cycleProfile.lastPeriodStart, cycleProfile.averageCycleLength, dateStr);
      if (cycleDay) {
        var phase = Cycle.getPhase(cycleDay, cycleProfile.averageCycleLength);
        var mode  = Cycle.getPerformanceMode(phase);
        var modeColor = Cycle.getModeColor(mode);
        var phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);

        panelHtml += '<div class="day-detail-cycle" style="background:' + hexToRgba(modeColor, 0.15) + ';color:' + modeColor + '">';
        panelHtml += 'Day ' + cycleDay + ' \u2014 ' + phaseName + ' Phase (' + mode + ' Mode)';
        panelHtml += '</div>';
      }
    }

    // Metrics grid
    panelHtml += '<div class="day-detail-metrics">';
    panelHtml += buildMetricCard('Energy', checkin.energy);
    panelHtml += buildMetricCard('Confidence', checkin.confidence);
    if (checkin.sleepQuality !== undefined && checkin.sleepQuality !== null) {
      panelHtml += buildMetricCard('Sleep', checkin.sleepQuality);
    }
    if (checkin.stressLevel !== undefined && checkin.stressLevel !== null) {
      panelHtml += buildMetricCard('Stress', checkin.stressLevel);
    }
    panelHtml += '</div>';

    // Notes
    if (checkin.notes && checkin.notes.trim()) {
      panelHtml += '<div class="day-detail-notes">';
      panelHtml += '<div class="day-detail-notes-label">Notes</div>';
      panelHtml += '<p>' + escapeHtml(checkin.notes) + '</p>';
      panelHtml += '</div>';
    }

    // Actions
    panelHtml += '<div class="day-detail-actions">';
    if (dateStr === today) {
      panelHtml += '<button class="day-detail-btn-edit" id="day-detail-edit">Edit</button>';
    }
    panelHtml += '<button class="day-detail-btn-close" id="day-detail-close">Close</button>';
    panelHtml += '</div>';

    panel.innerHTML = panelHtml;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Animate in (force reflow before adding class)
    /* jshint -W030 */
    overlay.offsetHeight;
    panel.offsetHeight;
    /* jshint +W030 */

    requestAnimationFrame(function () {
      overlay.classList.add('active');
      panel.classList.add('active');
    });

    detailOpen = true;

    // Bind close events
    overlay.addEventListener('click', closeDayDetail);

    var closeBtn = panel.querySelector('#day-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDayDetail);
    }

    var editBtn = panel.querySelector('#day-detail-edit');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        closeDayDetail();
        Router.navigate('#checkin');
      });
    }
  }

  function buildMetricCard(label, value) {
    if (value === undefined || value === null) return '';
    var color = barColor(value);
    var pct = Math.round((value / 10) * 100);
    var html = '';
    html += '<div class="day-metric">';
    html += '<div class="day-metric-label">' + label + '</div>';
    html += '<div class="day-metric-value" style="color:' + color + '">' + value + '</div>';
    html += '<div class="day-metric-bar">';
    html += '<div class="day-metric-bar-fill" style="width:' + pct + '%;background:' + color + '"></div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function closeDayDetail() {
    var overlay = document.getElementById('day-detail-overlay');
    var panel   = document.getElementById('day-detail-panel');

    if (panel) {
      panel.classList.remove('active');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }

    // Remove from DOM after transition
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    }, 320);

    detailOpen = false;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Public API ──────────────────────────────────────────────────

  function init() {
    // Resolve dependencies
    Store  = window.PeakHer.Store;
    Cycle  = window.PeakHer.Cycle;
    Utils  = window.PeakHer.Utils;
    Router = window.PeakHer.Router;

    injectStyles();

    var today = new Date();
    currentYear  = today.getFullYear();
    currentMonth = today.getMonth();

    render();
  }

  function refresh() {
    // Re-resolve in case modules reloaded
    Store  = window.PeakHer.Store;
    Cycle  = window.PeakHer.Cycle;
    Utils  = window.PeakHer.Utils;
    Router = window.PeakHer.Router;

    render();
  }

  return {
    init: init,
    refresh: refresh
  };
})();
