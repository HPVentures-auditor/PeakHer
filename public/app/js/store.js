/**
 * PeakHer Store
 * localStorage CRUD with peakher_ key prefix.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Store = (function () {
  'use strict';

  var PREFIX = 'peakher_';

  // ── Internal helpers ──────────────────────────────────────────────

  function _get(key) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[PeakHer.Store] Error reading ' + key, e);
      return null;
    }
  }

  function _set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch (e) {
      console.warn('[PeakHer.Store] Error writing ' + key, e);
    }
  }

  function _remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {
      console.warn('[PeakHer.Store] Error removing ' + key, e);
    }
  }

  // ── User ──────────────────────────────────────────────────────────

  function getUser() {
    return _get('user');
  }

  function setUser(data) {
    _set('user', data);
  }

  function clearUser() {
    _remove('user');
  }

  // ── Cycle Profile ─────────────────────────────────────────────────

  function getCycleProfile() {
    return _get('cycle_profile');
  }

  function setCycleProfile(data) {
    _set('cycle_profile', data);
  }

  // ── Check-ins ─────────────────────────────────────────────────────

  function getCheckins() {
    return _get('checkins') || {};
  }

  function getCheckin(dateStr) {
    var all = getCheckins();
    return all[dateStr] || null;
  }

  function setCheckin(dateStr, data) {
    var all = getCheckins();
    all[dateStr] = data;
    _set('checkins', all);
  }

  function getCheckinCount() {
    return Object.keys(getCheckins()).length;
  }

  /** Returns an array of check-in objects sorted by date (ascending). */
  function getCheckinsByRange(startDate, endDate) {
    var all = getCheckins();
    var results = [];
    var keys = Object.keys(all);

    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k >= startDate && k <= endDate) {
        results.push(all[k]);
      }
    }

    results.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });

    return results;
  }

  // ── Patterns ──────────────────────────────────────────────────────

  function getPatterns() {
    return _get('patterns') || [];
  }

  function setPatterns(data) {
    _set('patterns', data);
  }

  // ── Predictions ───────────────────────────────────────────────────

  function getPredictions() {
    return _get('predictions') || {};
  }

  function setPredictions(data) {
    _set('predictions', data);
  }

  function getPrediction(dateStr) {
    var all = getPredictions();
    return all[dateStr] || null;
  }

  // ── Streak ────────────────────────────────────────────────────────

  function getStreak() {
    return _get('streak') || { current: 0, longest: 0, lastCheckinDate: null };
  }

  /**
   * Update the streak from a given date.
   * Calculates the current streak by walking backward through consecutive
   * check-in dates starting from dateStr.
   */
  function updateStreak(dateStr) {
    var Utils = window.PeakHer.Utils;
    var checkins = getCheckins();
    var streak = getStreak();

    // Walk backward from dateStr counting consecutive days
    var current = 0;
    var cursor = dateStr;

    while (checkins[cursor]) {
      current++;
      cursor = Utils.addDays(cursor, -1);
    }

    streak.current = current;
    streak.lastCheckinDate = dateStr;

    if (current > streak.longest) {
      streak.longest = current;
    }

    _set('streak', streak);
    return streak;
  }

  // ── Bulk operations ───────────────────────────────────────────────

  /** Remove all peakher_ keys from localStorage. */
  function clearAll() {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(PREFIX) === 0) {
        keysToRemove.push(key);
      }
    }
    for (var j = 0; j < keysToRemove.length; j++) {
      localStorage.removeItem(keysToRemove[j]);
    }
  }

  /** Export all PeakHer data as a plain object. */
  function exportData() {
    return {
      user: getUser(),
      cycle_profile: getCycleProfile(),
      checkins: getCheckins(),
      patterns: getPatterns(),
      predictions: getPredictions(),
      streak: getStreak()
    };
  }

  /** Restore data from a previously exported object. */
  function importData(json) {
    if (!json || typeof json !== 'object') return;
    if (json.user) setUser(json.user);
    if (json.cycle_profile) setCycleProfile(json.cycle_profile);
    if (json.checkins) _set('checkins', json.checkins);
    if (json.patterns) setPatterns(json.patterns);
    if (json.predictions) setPredictions(json.predictions);
    if (json.streak) _set('streak', json.streak);
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    getUser: getUser,
    setUser: setUser,
    clearUser: clearUser,
    getCycleProfile: getCycleProfile,
    setCycleProfile: setCycleProfile,
    getCheckins: getCheckins,
    getCheckin: getCheckin,
    setCheckin: setCheckin,
    getCheckinCount: getCheckinCount,
    getCheckinsByRange: getCheckinsByRange,
    getPatterns: getPatterns,
    setPatterns: setPatterns,
    getPredictions: getPredictions,
    setPredictions: setPredictions,
    getPrediction: getPrediction,
    getStreak: getStreak,
    updateStreak: updateStreak,
    clearAll: clearAll,
    exportData: exportData,
    importData: importData
  };
})();
