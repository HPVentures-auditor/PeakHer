/**
 * PeakHer Utilities
 * Date formatting, math helpers, and general-purpose functions.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Utils = (function () {
  'use strict';

  var MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  var DAYS_LONG = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ];

  var DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ── Date formatting ───────────────────────────────────────────────

  /** "Mar 12, 2026" */
  function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return MONTHS_SHORT[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
  }

  /** "Mar 12" */
  function formatDateShort(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return MONTHS_SHORT[date.getMonth()] + ' ' + date.getDate();
  }

  /** "Wednesday" */
  function formatDayName(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return DAYS_LONG[date.getDay()];
  }

  /** "Wed" */
  function formatDayShort(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return DAYS_SHORT[date.getDay()];
  }

  // ── Date parsing / arithmetic ─────────────────────────────────────

  /** Parse an ISO date string ("YYYY-MM-DD") into a local Date at midnight. */
  function parseDate(str) {
    if (!str || typeof str !== 'string') return null;
    var parts = str.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return isNaN(d) ? null : d;
  }

  /** Today as "YYYY-MM-DD". */
  function getToday() {
    return getDateString(new Date());
  }

  /** Convert a Date object to "YYYY-MM-DD". */
  function getDateString(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  /** Add n days to a "YYYY-MM-DD" string, return "YYYY-MM-DD". */
  function addDays(dateStr, n) {
    var d = parseDate(dateStr);
    if (!d) return '';
    d.setDate(d.getDate() + n);
    return getDateString(d);
  }

  /** Integer days between two "YYYY-MM-DD" strings (absolute). */
  function getDaysBetween(dateStr1, dateStr2) {
    var d1 = parseDate(dateStr1);
    var d2 = parseDate(dateStr2);
    if (!d1 || !d2) return 0;
    var ms = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(ms / 86400000);
  }

  // ── Math helpers ──────────────────────────────────────────────────

  /** Arithmetic mean of a number array. Returns 0 for empty arrays. */
  function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
      sum += arr[i];
    }
    return sum / arr.length;
  }

  /** Population standard deviation. Returns 0 for empty arrays. */
  function standardDeviation(arr) {
    if (!arr || arr.length === 0) return 0;
    var m = mean(arr);
    var sumSqDiff = 0;
    for (var i = 0; i < arr.length; i++) {
      var diff = arr[i] - m;
      sumSqDiff += diff * diff;
    }
    return Math.sqrt(sumSqDiff / arr.length);
  }

  /**
   * Pearson correlation coefficient between two arrays.
   * Returns null if fewer than 3 data points or zero variance.
   */
  function pearsonCorrelation(xs, ys) {
    if (!xs || !ys || xs.length < 3 || ys.length < 3 || xs.length !== ys.length) {
      return null;
    }
    var n = xs.length;
    var mx = mean(xs);
    var my = mean(ys);
    var num = 0;
    var denomX = 0;
    var denomY = 0;
    for (var i = 0; i < n; i++) {
      var dx = xs[i] - mx;
      var dy = ys[i] - my;
      num += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    var denom = Math.sqrt(denomX * denomY);
    if (denom === 0) return null;
    return num / denom;
  }

  /** Clamp a number between min and max. */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    formatDate: formatDate,
    formatDateShort: formatDateShort,
    formatDayName: formatDayName,
    formatDayShort: formatDayShort,
    parseDate: parseDate,
    getToday: getToday,
    getDateString: getDateString,
    addDays: addDays,
    getDaysBetween: getDaysBetween,
    mean: mean,
    standardDeviation: standardDeviation,
    pearsonCorrelation: pearsonCorrelation,
    clamp: clamp
  };
})();
