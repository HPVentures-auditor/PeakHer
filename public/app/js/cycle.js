/**
 * PeakHer Cycle Engine
 * Cycle phase calculation and performance mode mapping.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Cycle = (function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────

  var PHASE_RATIOS = {
    menstrual:  { start: 0,    end: 0.18 },
    follicular: { start: 0.18, end: 0.43 },
    ovulatory:  { start: 0.43, end: 0.57 },
    luteal:     { start: 0.57, end: 1.0  }
  };

  var PHASE_TO_MODE = {
    menstrual:  'Restore',
    follicular: 'Rise',
    ovulatory:  'Peak',
    luteal:     'Sustain'
  };

  var MODE_COLORS = {
    Restore:  '#9B30FF',
    Rise:     '#00E5A0',
    Peak:     '#FFD700',
    Sustain:  '#FF6B6B'
  };

  var MODE_DESCRIPTIONS = {
    Restore:  'Rest and recharge. Honor your energy.',
    Rise:     'Rising energy. Start new projects.',
    Peak:     'Peak performance. Go bold.',
    Sustain:  'Wrap up and refine. Finish strong.'
  };

  var PHASE_EMOJIS = {
    menstrual:  '\uD83C\uDF19',  // 🌙
    follicular: '\uD83C\uDF31',  // 🌱
    ovulatory:  '\u2600\uFE0F',  // ☀️
    luteal:     '\uD83C\uDF42'   // 🍂
  };

  // ── Functions ─────────────────────────────────────────────────────

  /**
   * Calculate the 1-based cycle day for a given date.
   * Returns null if date is before lastPeriodStart.
   *
   * @param {string} lastPeriodStart - "YYYY-MM-DD"
   * @param {number} cycleLength - e.g. 28
   * @param {string|Date} date - "YYYY-MM-DD" or Date object
   * @returns {number|null}
   */
  function getCycleDay(lastPeriodStart, cycleLength, date) {
    var Utils = window.PeakHer.Utils;
    var startDate = Utils.parseDate(lastPeriodStart);
    var targetDate = (typeof date === 'string') ? Utils.parseDate(date) : date;

    if (!startDate || !targetDate) return null;
    if (targetDate < startDate) return null;

    var diffMs = targetDate.getTime() - startDate.getTime();
    var daysSinceStart = Math.floor(diffMs / 86400000);
    var cycleDay = (daysSinceStart % cycleLength) + 1;

    return cycleDay;
  }

  /**
   * Determine the phase name based on proportional position in the cycle.
   *
   * @param {number} cycleDay - 1-based
   * @param {number} cycleLength - e.g. 28
   * @returns {string} "menstrual" | "follicular" | "ovulatory" | "luteal"
   */
  function getPhase(cycleDay, cycleLength) {
    if (!cycleDay || !cycleLength) return 'follicular';

    var ratio = (cycleDay - 1) / cycleLength;

    if (ratio < PHASE_RATIOS.menstrual.end)  return 'menstrual';
    if (ratio < PHASE_RATIOS.follicular.end) return 'follicular';
    if (ratio < PHASE_RATIOS.ovulatory.end)  return 'ovulatory';
    return 'luteal';
  }

  /**
   * Map a cycle phase to its performance mode name.
   * @param {string} phase
   * @returns {string} "Restore" | "Rise" | "Peak" | "Sustain"
   */
  function getPerformanceMode(phase) {
    return PHASE_TO_MODE[phase] || 'Rise';
  }

  /**
   * Get the hex color for a performance mode.
   * @param {string} mode
   * @returns {string}
   */
  function getModeColor(mode) {
    return MODE_COLORS[mode] || '#00E5A0';
  }

  /**
   * Get a brief description string for a performance mode.
   * @param {string} mode
   * @returns {string}
   */
  function getModeDescription(mode) {
    return MODE_DESCRIPTIONS[mode] || '';
  }

  /**
   * Get the emoji for a cycle phase.
   * @param {string} phase
   * @returns {string}
   */
  function getPhaseEmoji(phase) {
    return PHASE_EMOJIS[phase] || '\uD83C\uDF31';
  }

  /**
   * Check if cycle tracking is enabled in the user's profile.
   * @returns {boolean}
   */
  function isTrackingEnabled() {
    var Store = window.PeakHer.Store;
    var profile = Store.getCycleProfile();
    return !!(profile && profile.trackingEnabled);
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    getCycleDay: getCycleDay,
    getPhase: getPhase,
    getPerformanceMode: getPerformanceMode,
    getModeColor: getModeColor,
    getModeDescription: getModeDescription,
    getPhaseEmoji: getPhaseEmoji,
    isTrackingEnabled: isTrackingEnabled,
    PHASE_RATIOS: PHASE_RATIOS
  };
})();
