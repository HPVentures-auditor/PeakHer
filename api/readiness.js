/**
 * PeakHer Readiness Score API
 *
 * GET /api/readiness — Returns a 1-10 daily readiness score.
 * Auth required. Combines cycle phase baseline, check-in data,
 * wearable recovery, and calendar load into a single actionable number.
 *
 * Weight redistribution: when a data source is missing, its weight
 * is redistributed proportionally among available sources. Phase
 * baseline is always available (defaults to Rise if no cycle data).
 *
 * Score labels:
 *   8-10 = High
 *   5-7  = Moderate
 *   1-4  = Low
 */
var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var today = new Date().toISOString().split('T')[0];
    var todayStart = today + 'T00:00:00Z';
    var todayEnd = today + 'T23:59:59Z';
    var sevenDaysAgo = addDays(today, -7);

    // ── Parallel data fetches ──────────────────────────────────────────

    var cyclePromise = sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;

    var checkinPromise = sql`
      SELECT energy, confidence, sleep_quality, stress_level
      FROM checkins WHERE user_id = ${userId} AND date = ${today} LIMIT 1
    `;

    var wearablePromise = sql`
      SELECT recovery_score, readiness_score, hrv_avg,
             sleep_duration_min, sleep_quality_score
      FROM wearable_data
      WHERE user_id = ${userId} AND date >= ${sevenDaysAgo}
      ORDER BY date DESC
    `.catch(function(err) {
      console.error('Readiness wearable fetch warning:', err.message);
      return [];
    });

    var calendarPromise = sql`
      SELECT estimated_importance, event_type
      FROM calendar_events
      WHERE user_id = ${userId}
        AND start_time >= ${todayStart}
        AND start_time <= ${todayEnd}
    `.catch(function(err) {
      console.error('Readiness calendar fetch warning:', err.message);
      return [];
    });

    var results = await Promise.all([
      cyclePromise,
      checkinPromise,
      wearablePromise,
      calendarPromise
    ]);

    var cycleRows = results[0];
    var checkinRows = results[1];
    var wearableRows = results[2];
    var calendarRows = results[3];

    var cycleProfile = cycleRows.length > 0 ? cycleRows[0] : null;
    var checkin = checkinRows.length > 0 ? checkinRows[0] : null;
    var todayWearable = wearableRows.length > 0 ? wearableRows[0] : null;
    var calendarEvents = calendarRows || [];

    // ── Determine which inputs are available ───────────────────────────

    var hasPhase = cycleProfile && cycleProfile.tracking_enabled && cycleProfile.last_period_start;
    var hasCheckin = checkin && (
      checkin.energy != null || checkin.confidence != null ||
      checkin.sleep_quality != null || checkin.stress_level != null
    );
    var hasWearable = todayWearable && (
      todayWearable.recovery_score != null ||
      todayWearable.readiness_score != null ||
      todayWearable.hrv_avg != null
    );
    var hasCalendar = calendarEvents.length > 0;

    // ── Calculate cycle phase ──────────────────────────────────────────

    var cycleLength = (cycleProfile && cycleProfile.average_cycle_length) ? cycleProfile.average_cycle_length : 28;
    var cycleDay = null;
    var phase = 'build';
    var modeName = 'Rise';

    if (hasPhase) {
      cycleDay = calculateCycleDay(cycleProfile.last_period_start, cycleLength, today);
      phase = getPhaseForCycleDay(cycleDay, cycleLength);
      modeName = getModeName(phase);
    }

    // ── 1. Phase baseline score (1-10 scale) ───────────────────────────

    var phaseResult = calculatePhaseBaseline(cycleDay, cycleLength, phase);
    var phaseScore = phaseResult.score;
    var phaseDetail = phaseResult.detail;

    // ── 2. Check-in score (1-10 scale) ─────────────────────────────────

    var checkinScore = null;
    var checkinDetail = 'No check-in today';
    if (hasCheckin) {
      var cr = calculateCheckinScore(checkin);
      checkinScore = cr.score;
      checkinDetail = cr.detail;
    }

    // ── 3. Wearable recovery score (1-10 scale) ────────────────────────

    var recoveryScore = null;
    var recoveryDetail = 'No wearable data';
    if (hasWearable) {
      var wr = calculateRecoveryScore(todayWearable, wearableRows);
      recoveryScore = wr.score;
      recoveryDetail = wr.detail;
    }

    // ── 4. Calendar load score (1-10 scale) ────────────────────────────

    var calendarScore = null;
    var calendarDetail = 'No calendar data';
    if (hasCalendar) {
      var cal = calculateCalendarLoadScore(calendarEvents);
      calendarScore = cal.score;
      calendarDetail = cal.detail;
    }

    // ── Weighted composite with redistribution ─────────────────────────

    var baseWeights = {
      phase: 0.30,
      checkin: 0.25,
      wearable: 0.25,
      calendar: 0.20
    };

    var available = {};
    var availableWeights = {};

    // Phase is always available (uses baseline even without cycle data)
    available.phase = phaseScore;
    availableWeights.phase = baseWeights.phase;

    if (checkinScore !== null) {
      available.checkin = checkinScore;
      availableWeights.checkin = baseWeights.checkin;
    }
    if (recoveryScore !== null) {
      available.wearable = recoveryScore;
      availableWeights.wearable = baseWeights.wearable;
    }
    if (calendarScore !== null) {
      available.calendar = calendarScore;
      availableWeights.calendar = baseWeights.calendar;
    }

    var totalWeight = 0;
    var keys = Object.keys(availableWeights);
    for (var i = 0; i < keys.length; i++) {
      totalWeight += availableWeights[keys[i]];
    }

    var compositeScore = 0;
    var normalizedWeights = {};
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      var nw = availableWeights[k] / totalWeight;
      normalizedWeights[k] = Math.round(nw * 100) / 100;
      compositeScore += available[k] * nw;
    }

    var score = Math.round(Math.max(1, Math.min(10, compositeScore)));

    // ── Label ──────────────────────────────────────────────────────────

    var label;
    if (score >= 8) {
      label = 'High';
    } else if (score >= 5) {
      label = 'Moderate';
    } else {
      label = 'Low';
    }

    // ── Breakdown ──────────────────────────────────────────────────────

    var breakdown = {
      phase: {
        score: phaseScore,
        weight: normalizedWeights.phase || baseWeights.phase,
        detail: phaseDetail
      },
      checkin: {
        score: checkinScore,
        weight: normalizedWeights.checkin || 0,
        detail: checkinDetail
      },
      recovery: {
        score: recoveryScore,
        weight: normalizedWeights.wearable || 0,
        detail: recoveryDetail
      },
      calendar: {
        score: calendarScore,
        weight: normalizedWeights.calendar || 0,
        detail: calendarDetail
      }
    };

    // ── Dot summary ────────────────────────────────────────────────────

    var dotSummary = generateDotSummary(score, modeName, breakdown);

    // ── Actions ────────────────────────────────────────────────────────

    var actions = generateActions(score, modeName, phase, calendarEvents);

    return res.status(200).json({
      date: today,
      score: score,
      label: label,
      mode: modeName,
      phase_day: cycleDay,
      cycle_length: cycleLength,
      breakdown: breakdown,
      dot_summary: dotSummary,
      actions: actions
    });

  } catch (err) {
    console.error('Readiness error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


// ── Date helpers ─────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  var parts = str.split('-');
  if (parts.length !== 3) return null;
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function addDays(dateStr, n) {
  var d = parseDate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + n);
  return formatDate(d);
}


// ── Cycle calculation (copied from briefing.js / daily-mode.js) ──────────

function calculateCycleDay(lastPeriodStart, cycleLength, dateStr) {
  var startStr = lastPeriodStart instanceof Date
    ? lastPeriodStart.toISOString().split('T')[0]
    : String(lastPeriodStart);
  var start = parseDate(startStr);
  var current = parseDate(dateStr);
  if (!start || !current) return null;
  var diffMs = current.getTime() - start.getTime();
  if (diffMs < 0) return null;
  var daysDiff = Math.floor(diffMs / 86400000);
  var len = cycleLength || 28;
  return (daysDiff % len) + 1;
}

function getPhaseForCycleDay(cycleDay, cycleLength) {
  if (!cycleDay || cycleDay < 1) return 'build';
  var len = cycleLength || 28;
  var scale = len / 28;
  var reflectEnd = Math.round(5 * scale);
  var buildEnd = Math.round(14 * scale);
  var performEnd = Math.round(17 * scale);

  if (cycleDay <= reflectEnd) return 'reflect';
  if (cycleDay <= buildEnd) return 'build';
  if (cycleDay <= performEnd) return 'perform';
  return 'complete';
}

function getModeName(phase) {
  switch (phase) {
    case 'reflect': return 'Restore';
    case 'build': return 'Rise';
    case 'perform': return 'Peak';
    case 'complete': return 'Sustain';
    default: return 'Rise';
  }
}


// ── Phase baseline score (1-10 scale) ────────────────────────────────────
//
// Restore (menstrual, internal='reflect'):   baseline 3-4
// Rise (follicular, internal='build'):       baseline 7-8
// Peak (ovulatory, internal='perform'):      baseline 9-10
// Sustain (luteal, internal='complete'):     baseline 4-6 (declining through phase)

function calculatePhaseBaseline(cycleDay, cycleLength, phase) {
  // No cycle data — default to mid-range Rise
  if (!cycleDay || cycleDay < 1) {
    return { score: 6, detail: 'No cycle data — default baseline' };
  }

  var len = cycleLength || 28;
  var scale = len / 28;
  var reflectEnd = Math.round(5 * scale);
  var buildEnd = Math.round(14 * scale);
  var performEnd = Math.round(17 * scale);

  var score;
  var detail;

  if (phase === 'reflect') {
    // Restore: 3 early -> 4 late (energy slowly returning)
    var restoreDays = reflectEnd;
    var restoreProgress = (cycleDay - 1) / Math.max(restoreDays - 1, 1);
    score = 3 + restoreProgress * 1;
    detail = 'Day ' + cycleDay + ' of Restore';
  } else if (phase === 'build') {
    // Rise: 7 early -> 8 late (building momentum)
    var riseDays = buildEnd - reflectEnd;
    var riseDay = cycleDay - reflectEnd;
    var riseProgress = (riseDay - 1) / Math.max(riseDays - 1, 1);
    score = 7 + riseProgress * 1;
    detail = 'Day ' + cycleDay + ' of Rise';
  } else if (phase === 'perform') {
    // Peak: 9 -> 10 -> 9 (parabolic)
    var peakDays = performEnd - buildEnd;
    var peakDay = cycleDay - buildEnd;
    var peakMid = (peakDays + 1) / 2;
    if (peakDay <= peakMid) {
      var upProgress = (peakDay - 1) / Math.max(peakMid - 1, 1);
      score = 9 + upProgress * 1;
    } else {
      var downProgress = (peakDay - peakMid) / Math.max(peakDays - peakMid, 1);
      score = 10 - downProgress * 1;
    }
    detail = 'Day ' + cycleDay + ' of Peak';
  } else {
    // Sustain: 6 early -> 4 late (declining through luteal)
    var sustainDays = len - performEnd;
    var sustainDay = cycleDay - performEnd;
    var sustainProgress = (sustainDay - 1) / Math.max(sustainDays - 1, 1);
    score = 6 - sustainProgress * 2;
    detail = 'Day ' + cycleDay + ' of Sustain';
  }

  return {
    score: Math.round(Math.max(1, Math.min(10, score))),
    detail: detail
  };
}


// ── Check-in score (1-10 scale) ──────────────────────────────────────────
//
// Averages energy, confidence, sleep quality, and inverted stress level.
// Each field is 1-10. Stress is inverted: high stress = low score.

function calculateCheckinScore(checkin) {
  var values = [];
  var parts = [];

  if (checkin.energy != null) {
    values.push(checkin.energy);
    parts.push('Energy ' + checkin.energy);
  }
  if (checkin.confidence != null) {
    values.push(checkin.confidence);
    parts.push('Confidence ' + checkin.confidence);
  }
  if (checkin.sleep_quality != null) {
    values.push(checkin.sleep_quality);
    parts.push('Sleep ' + checkin.sleep_quality);
  }
  if (checkin.stress_level != null) {
    // Invert stress: 10 stress = 1 score, 1 stress = 10 score
    var invertedStress = 11 - checkin.stress_level;
    values.push(invertedStress);
    parts.push('Stress ' + checkin.stress_level);
  }

  if (values.length === 0) {
    return { score: 5, detail: 'Check-in with no scored fields' };
  }

  var sum = 0;
  for (var i = 0; i < values.length; i++) {
    sum += values[i];
  }
  var avg = sum / values.length;
  var score = Math.round(Math.max(1, Math.min(10, avg)));

  return { score: score, detail: parts.join(', ') };
}


// ── Wearable recovery score (1-10 scale) ─────────────────────────────────
//
// Prefers recovery_score (Whoop) or readiness_score (Oura) directly (0-100, mapped to 1-10).
// Falls back to HRV relative to 7-day average.

function calculateRecoveryScore(todayData, allRecentData) {
  // Direct recovery score (Whoop) — 0-100 mapped to 1-10
  if (todayData.recovery_score != null) {
    var score100 = Math.max(0, Math.min(100, todayData.recovery_score));
    var mapped = Math.round(1 + (score100 / 100) * 9);
    return {
      score: Math.max(1, Math.min(10, mapped)),
      detail: 'Recovery ' + todayData.recovery_score + '%'
    };
  }

  // Direct readiness score (Oura) — 0-100 mapped to 1-10
  if (todayData.readiness_score != null) {
    var readScore = Math.max(0, Math.min(100, todayData.readiness_score));
    var readMapped = Math.round(1 + (readScore / 100) * 9);
    return {
      score: Math.max(1, Math.min(10, readMapped)),
      detail: 'Readiness ' + todayData.readiness_score
    };
  }

  // HRV relative to 7-day average
  if (todayData.hrv_avg != null) {
    var hrvValues = [];
    for (var i = 0; i < allRecentData.length; i++) {
      if (allRecentData[i].hrv_avg != null) {
        hrvValues.push(allRecentData[i].hrv_avg);
      }
    }

    if (hrvValues.length === 0) {
      // No history — normalize raw HRV (rough: 20-80ms mapped to 1-10)
      var rawScore = 1 + ((todayData.hrv_avg - 20) / 60) * 9;
      return {
        score: Math.round(Math.max(1, Math.min(10, rawScore))),
        detail: 'HRV ' + Math.round(todayData.hrv_avg) + 'ms'
      };
    }

    var sum = 0;
    for (var j = 0; j < hrvValues.length; j++) {
      sum += hrvValues[j];
    }
    var avg7 = sum / hrvValues.length;

    // Ratio: 0.8x avg ~ 3, 1.0x ~ 6, 1.2x ~ 9
    var ratio = todayData.hrv_avg / avg7;
    var hrvScore = 6 + (ratio - 1) * 15;
    var aboveBelow = todayData.hrv_avg >= avg7 ? 'above' : 'below';

    return {
      score: Math.round(Math.max(1, Math.min(10, hrvScore))),
      detail: 'HRV ' + Math.round(todayData.hrv_avg) + 'ms (' + aboveBelow + ' 7-day avg)'
    };
  }

  return { score: 5, detail: 'Limited wearable data' };
}


// ── Calendar load score (1-10 scale) ─────────────────────────────────────
//
// More events / higher importance = LOWER score (less available capacity).
//   0 events        -> 9-10
//   1-2 low events  -> 7-8
//   3-5 mixed       -> 4-6
//   6+ or high-imp  -> 1-3

function calculateCalendarLoadScore(events) {
  if (!events || events.length === 0) {
    return { score: 9, detail: 'Clear calendar' };
  }

  var count = events.length;

  // Sum importance (default 3 on 1-5 scale if not set)
  var totalImportance = 0;
  var highCount = 0;
  for (var i = 0; i < events.length; i++) {
    var imp = events[i].estimated_importance;
    var impVal = (imp != null) ? imp : 3;
    totalImportance += impVal;
    if (impVal >= 4) highCount++;
  }
  var avgImportance = totalImportance / count;

  // Base score from count: starts at 9, drops ~1.5 per event, floor at 1
  var countScore = Math.max(1, 9 - (count - 1) * 1.5);

  // Importance modifier: avg 1-2 = +1, avg 3 = 0, avg 4-5 = -1 to -2
  var impMod = (3 - avgImportance) * 0.8;

  var finalScore = Math.round(Math.max(1, Math.min(10, countScore + impMod)));

  var detail = count + (count === 1 ? ' meeting' : ' meetings');
  if (highCount > 0) {
    detail += ', ' + highCount + ' high-importance';
  }

  return { score: finalScore, detail: detail };
}


// ── Dot summary generation ───────────────────────────────────────────────

function generateDotSummary(score, modeName, breakdown) {
  var prefix = 'Your score is ' + score + ' today.';

  if (score >= 8) {
    // High — main character era
    var highLines = [
      "You're in your main character era. Schedule the hard meeting. This is your window.",
      "Everything is aligned. This is the day to tackle what you've been putting off.",
      "Your biology is backing you up. Go make the ask, start the project, push the limit."
    ];
    return prefix + ' ' + pickLine(highLines, score);
  }

  if (score >= 5) {
    // Moderate — be selective
    var modLines = [
      "Detail work: yes. New creative projects: save them.",
      "Moderate capacity. Handle the essentials, skip the extras.",
      "You've got enough to be productive, but don't try to be a hero."
    ];

    // Add phase-specific nuance
    if (modeName === 'Sustain') {
      return prefix + ' Sustain mode means finishing, not starting. Close loops, organize, review.';
    }
    if (modeName === 'Restore') {
      return prefix + " You're in Restore but not offline. Light planning and reflection work well today.";
    }
    return prefix + ' ' + pickLine(modLines, score);
  }

  // Low — protect energy
  var lowLines = [
    "Not a failure. Your body is doing real work. Protect your energy.",
    "This is biology, not weakness. Clear your plate and lower the bar.",
    "Recovery is productive. Cancel what you can and rest without guilt."
  ];
  return prefix + ' ' + pickLine(lowLines, score);
}

function pickLine(lines, seed) {
  // Deterministic-ish pick based on day of month + seed
  var dayOfMonth = new Date().getDate();
  var idx = (dayOfMonth + seed) % lines.length;
  return lines[idx];
}


// ── Action generation ────────────────────────────────────────────────────

function generateActions(score, modeName, phase, calendarEvents) {
  if (score >= 8) {
    return {
      tackle: generateTackleHigh(modeName),
      defer: ['Low-priority admin', 'Routine emails that can wait'],
      protect: generateProtectHigh(modeName)
    };
  }

  if (score >= 5) {
    return {
      tackle: generateTackleModerate(modeName),
      defer: generateDeferModerate(modeName),
      protect: generateProtectModerate(modeName)
    };
  }

  return {
    tackle: ['Only true emergencies', 'Quick wins under 15 minutes'],
    defer: generateDeferLow(modeName),
    protect: generateProtectLow(modeName)
  };
}

function generateTackleHigh(modeName) {
  if (modeName === 'Peak') {
    return ['High-stakes presentations', 'Difficult conversations', 'Creative brainstorming'];
  }
  if (modeName === 'Rise') {
    return ['Start new projects', 'Strategic planning', 'Challenging workouts'];
  }
  if (modeName === 'Sustain') {
    return ['Complete open projects', 'Review and edit work', 'Organize systems'];
  }
  // Restore with high score (unusual)
  return ['Light creative work', 'Planning next cycle', 'Journaling and reflection'];
}

function generateProtectHigh(modeName) {
  if (modeName === 'Peak') {
    return ["Don't waste this on busywork. Say no to meetings that could be emails."];
  }
  return ["Use this energy window wisely — it won't last forever."];
}

function generateTackleModerate(modeName) {
  if (modeName === 'Sustain') {
    return ['Review Q2 report', 'Organize files', 'Close open loops'];
  }
  if (modeName === 'Restore') {
    return ['Light planning', 'Reflection and journaling', 'Gentle organizing'];
  }
  return ['One high-priority task', 'Detail-oriented work', 'Follow-up emails'];
}

function generateDeferModerate(modeName) {
  if (modeName === 'Sustain') {
    return ['Brainstorm campaign ideas', 'New project kickoffs'];
  }
  return ['Creative brainstorming', 'High-stakes negotiations'];
}

function generateProtectModerate(modeName) {
  if (modeName === 'Sustain') {
    return ['Skip HIIT — do slow flow yoga', 'Limit social commitments'];
  }
  if (modeName === 'Restore') {
    return ['Gentle movement only', 'Extra sleep tonight'];
  }
  return ['Guard your best focus hours', 'Skip the optional happy hour'];
}

function generateDeferLow(modeName) {
  if (modeName === 'Restore') {
    return ['Everything ambitious', 'New commitments', 'Hard workouts'];
  }
  return ['Creative projects', 'Difficult conversations', 'Big decisions'];
}

function generateProtectLow(modeName) {
  if (modeName === 'Restore') {
    return ['Full rest mode — walks, baths, sleep', 'Cancel what you can without guilt'];
  }
  if (modeName === 'Sustain') {
    return ['Skip HIIT — do restorative yoga or a walk', 'Say no to evening plans'];
  }
  return ['Your energy like it is currency', 'Reschedule what you can to your next green day'];
}
