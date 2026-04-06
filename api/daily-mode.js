/**
 * PeakHer Daily Mode / Hormonal Intelligence Score
 *
 * GET /api/daily-mode — Returns a traffic-light "Daily Mode" score.
 * Auth required. Combines cycle phase, check-in data, wearable recovery,
 * and calendar load into a single actionable signal.
 *
 * Mode mapping:
 *   70-100 = Green Light  — Go hard.
 *   40-69  = Yellow Light — Be selective.
 *   0-39   = Red Light    — Protect your energy.
 *
 * Gracefully degrades when data is missing. Always works with
 * cycle phase alone. Redistributes weights to available inputs.
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

    // ── Parallel data fetches ────────────────────────────────────────────

    var cyclePromise = sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;

    var checkinPromise = sql`
      SELECT energy, confidence
      FROM checkins WHERE user_id = ${userId} AND date = ${today} LIMIT 1
    `;

    var wearablePromise = sql`
      SELECT recovery_score, readiness_score, hrv_avg,
             sleep_duration_min, sleep_quality_score
      FROM wearable_data
      WHERE user_id = ${userId} AND date >= ${sevenDaysAgo}
      ORDER BY date DESC
    `.catch(function(err) {
      console.error('Daily-mode wearable fetch warning:', err.message);
      return [];
    });

    var calendarPromise = sql`
      SELECT estimated_importance, event_type
      FROM calendar_events
      WHERE user_id = ${userId}
        AND start_time >= ${todayStart}
        AND start_time <= ${todayEnd}
    `.catch(function(err) {
      console.error('Daily-mode calendar fetch warning:', err.message);
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

    // ── Determine which inputs are available ─────────────────────────────

    var hasPhase = cycleProfile && cycleProfile.tracking_enabled && cycleProfile.last_period_start;
    var hasCheckin = checkin && (checkin.energy != null || checkin.confidence != null);
    var hasWearable = todayWearable && (
      todayWearable.recovery_score != null ||
      todayWearable.readiness_score != null ||
      todayWearable.hrv_avg != null
    );
    var hasCalendar = calendarEvents.length > 0;

    // If no cycle data at all, return a helpful message instead of garbage
    if (!hasPhase) {
      return res.status(200).json({
        date: today,
        mode: 'yellow',
        label: 'Yellow Light Day',
        emoji: '\uD83D\uDFE1',
        score: 50,
        headline: "I don't have your cycle data yet, so I'm playing it safe. Check in and let me learn your rhythm.",
        actions: {
          tackle: 'Complete your cycle profile in settings so I can give you real intel.',
          defer: 'Nothing specific — I need more data to be useful here.',
          protect: 'Without your cycle data, I can only guess. Give me something to work with.'
        },
        factors: {
          phase: { label: 'No cycle data', contribution: 'unknown' },
          energy: hasCheckin ? { label: 'Energy ' + checkin.energy + '/10', contribution: checkin.energy >= 7 ? 'positive' : checkin.energy >= 4 ? 'neutral' : 'negative' } : { label: 'No check-in', contribution: 'unknown' },
          recovery: { label: 'No wearable', contribution: 'unknown' },
          calendar: hasCalendar ? { label: calendarEvents.length + ' events today', contribution: 'neutral' } : { label: 'No calendar', contribution: 'unknown' }
        },
        dotNote: "I'm flying blind without your cycle data. Set it up and I'll actually have something smart to say tomorrow."
      });
    }

    // ── Calculate each factor score ──────────────────────────────────────

    var cycleLength = cycleProfile.average_cycle_length || 28;
    var cycleDay = calculateCycleDay(cycleProfile.last_period_start, cycleLength, today);
    var phase = getPhaseForCycleDay(cycleDay, cycleLength);
    var modeName = getModeName(phase);

    // 1. Phase score (0-100)
    var phaseScore = calculatePhaseScore(cycleDay, cycleLength);

    // 2. Check-in score (0-100)
    var checkinScore = null;
    if (hasCheckin) {
      var energy = checkin.energy != null ? checkin.energy : 5;
      var confidence = checkin.confidence != null ? checkin.confidence : 5;
      checkinScore = ((energy + confidence) / 2) * 10;
    }

    // 3. Wearable recovery score (0-100)
    var recoveryScore = null;
    var recoveryLabel = null;
    if (hasWearable) {
      var wr = calculateWearableRecovery(todayWearable, wearableRows);
      recoveryScore = wr.score;
      recoveryLabel = wr.label;
    }

    // 4. Calendar load score (0-100) — fewer/lower importance = higher score
    var calendarScore = null;
    if (hasCalendar) {
      calendarScore = calculateCalendarScore(calendarEvents);
    }

    // ── Weighted composite score ─────────────────────────────────────────

    var baseWeights = {
      phase: 0.30,
      checkin: 0.25,
      wearable: 0.25,
      calendar: 0.20
    };

    var available = {};
    available.phase = phaseScore;
    if (checkinScore !== null) available.checkin = checkinScore;
    if (recoveryScore !== null) available.wearable = recoveryScore;
    if (calendarScore !== null) available.calendar = calendarScore;

    var totalWeight = 0;
    var keys = Object.keys(available);
    for (var i = 0; i < keys.length; i++) {
      totalWeight += baseWeights[keys[i]];
    }

    var compositeScore = 0;
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      var normalizedWeight = baseWeights[k] / totalWeight;
      compositeScore += available[k] * normalizedWeight;
    }

    var score = Math.round(Math.max(0, Math.min(100, compositeScore)));

    // ── Map score to mode ────────────────────────────────────────────────

    var mode, label, emoji;
    if (score >= 70) {
      mode = 'green';
      label = 'Green Light Day';
      emoji = '\uD83D\uDFE2';
    } else if (score >= 40) {
      mode = 'yellow';
      label = 'Yellow Light Day';
      emoji = '\uD83D\uDFE1';
    } else {
      mode = 'red';
      label = 'Red Light Day';
      emoji = '\uD83D\uDD34';
    }

    // ── Build factor contributions ───────────────────────────────────────

    var phaseContribution = phaseScore >= 65 ? 'positive' : phaseScore >= 35 ? 'neutral' : 'negative';
    var checkinContribution = 'unknown';
    if (hasCheckin) {
      checkinContribution = checkinScore >= 65 ? 'positive' : checkinScore >= 35 ? 'neutral' : 'negative';
    }
    var recoveryContribution = 'unknown';
    if (hasWearable) {
      recoveryContribution = recoveryScore >= 65 ? 'positive' : recoveryScore >= 35 ? 'neutral' : 'negative';
    }
    var calendarContribution = 'unknown';
    if (hasCalendar) {
      calendarContribution = calendarScore >= 65 ? 'positive' : calendarScore >= 35 ? 'neutral' : 'negative';
    }

    var factors = {
      phase: {
        label: modeName + ' (day ' + cycleDay + ')',
        contribution: phaseContribution
      },
      energy: hasCheckin
        ? { label: 'Energy ' + checkin.energy + '/10', contribution: checkinContribution }
        : { label: 'No check-in yet', contribution: 'unknown' },
      recovery: hasWearable
        ? { label: recoveryLabel, contribution: recoveryContribution }
        : { label: 'No wearable connected', contribution: 'unknown' },
      calendar: hasCalendar
        ? { label: calendarEvents.length + (calendarEvents.length === 1 ? ' event' : ' events') + ' today', contribution: calendarContribution }
        : { label: 'No calendar synced', contribution: 'unknown' }
    };

    // ── Generate Dot's copy ──────────────────────────────────────────────

    var copy = generateDotCopy(mode, modeName, cycleDay, factors, hasCheckin, hasWearable, hasCalendar);

    return res.status(200).json({
      date: today,
      mode: mode,
      label: label,
      emoji: emoji,
      score: score,
      headline: copy.headline,
      actions: copy.actions,
      factors: factors,
      dotNote: copy.dotNote
    });

  } catch (err) {
    console.error('Daily-mode error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


// ── Date helpers (same as briefing.js) ───────────────────────────────────

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


// ── Cycle calculation (mirrors briefing.js) ──────────────────────────────

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


// ── Phase score calculation ──────────────────────────────────────────────
//
// Maps cycle day to an energy/capacity score (0-100).
//   Restore (menstrual, days 1-5):       20-35  (low, rest)
//   Rise (follicular, days 6-14):        70-90  (building)
//   Peak (ovulatory, days 15-17):        85-100 (highest)
//   Sustain early (luteal, days 18-22):  50-65  (moderate, declining)
//   Sustain late (luteal, days 23-28):   15-30  (lowest, pre-menstrual)
//
// Scores interpolate smoothly within each sub-phase.

function calculatePhaseScore(cycleDay, cycleLength) {
  if (!cycleDay || cycleDay < 1) return 50; // fallback

  var len = cycleLength || 28;
  var scale = len / 28;

  var restoreEnd = Math.round(5 * scale);
  var riseEnd = Math.round(14 * scale);
  var peakEnd = Math.round(17 * scale);
  var sustainMid = Math.round(22 * scale);
  // sustainEnd = len

  if (cycleDay <= restoreEnd) {
    // Restore: 20 → 35 over days 1-5
    var progress = (cycleDay - 1) / Math.max(restoreEnd - 1, 1);
    return Math.round(20 + progress * 15);
  }

  if (cycleDay <= riseEnd) {
    // Rise: 70 → 90 over follicular
    var riseDays = riseEnd - restoreEnd;
    var riseProgress = (cycleDay - restoreEnd - 1) / Math.max(riseDays - 1, 1);
    return Math.round(70 + riseProgress * 20);
  }

  if (cycleDay <= peakEnd) {
    // Peak: 85 → 100 → 90 (parabolic feel)
    var peakDays = peakEnd - riseEnd;
    var peakMid = (peakDays + 1) / 2;
    var peakDay = cycleDay - riseEnd;
    if (peakDay <= peakMid) {
      var upProgress = (peakDay - 1) / Math.max(peakMid - 1, 1);
      return Math.round(85 + upProgress * 15);
    } else {
      var downProgress = (peakDay - peakMid) / Math.max(peakDays - peakMid, 1);
      return Math.round(100 - downProgress * 10);
    }
  }

  if (cycleDay <= sustainMid) {
    // Sustain early: 65 → 50 (moderate, declining)
    var earlyDays = sustainMid - peakEnd;
    var earlyProgress = (cycleDay - peakEnd - 1) / Math.max(earlyDays - 1, 1);
    return Math.round(65 - earlyProgress * 15);
  }

  // Sustain late: 30 → 15 (lowest, pre-menstrual)
  var lateDays = len - sustainMid;
  var lateProgress = (cycleDay - sustainMid - 1) / Math.max(lateDays - 1, 1);
  return Math.round(30 - lateProgress * 15);
}


// ── Wearable recovery calculation ────────────────────────────────────────
//
// Prefers recovery_score (Whoop) or readiness_score (Oura) directly.
// Falls back to HRV relative to 7-day average.

function calculateWearableRecovery(todayData, allRecentData) {
  // Direct recovery score (Whoop) — already 0-100
  if (todayData.recovery_score != null) {
    return {
      score: Math.max(0, Math.min(100, todayData.recovery_score)),
      label: 'Recovery ' + todayData.recovery_score + '%'
    };
  }

  // Direct readiness score (Oura) — already 0-100
  if (todayData.readiness_score != null) {
    return {
      score: Math.max(0, Math.min(100, todayData.readiness_score)),
      label: 'Readiness ' + todayData.readiness_score
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
      // No history, just normalize HRV raw (rough heuristic: 20-80ms mapped to 0-100)
      var rawScore = Math.round(((todayData.hrv_avg - 20) / 60) * 100);
      return {
        score: Math.max(0, Math.min(100, rawScore)),
        label: 'HRV ' + Math.round(todayData.hrv_avg) + 'ms'
      };
    }

    var sum = 0;
    for (var j = 0; j < hrvValues.length; j++) {
      sum += hrvValues[j];
    }
    var avg7 = sum / hrvValues.length;

    // Ratio: 0.8x avg = ~30 score, 1.0x = ~60, 1.2x = ~90
    var ratio = todayData.hrv_avg / avg7;
    var hrvScore = Math.round(60 + (ratio - 1) * 150);
    var aboveBelow = todayData.hrv_avg >= avg7 ? 'above' : 'below';

    return {
      score: Math.max(0, Math.min(100, hrvScore)),
      label: 'HRV ' + Math.round(todayData.hrv_avg) + 'ms (' + aboveBelow + ' avg)'
    };
  }

  // Sleep quality as last resort
  if (todayData.sleep_quality_score != null) {
    return {
      score: Math.max(0, Math.min(100, todayData.sleep_quality_score)),
      label: 'Sleep quality ' + todayData.sleep_quality_score + '%'
    };
  }

  return { score: 50, label: 'Limited wearable data' };
}


// ── Calendar load calculation ────────────────────────────────────────────
//
// More events / higher importance = LOWER score (less flexibility).
//   0 events        → 95  (wide open)
//   1-2 low events  → 75-80
//   3-5 mixed       → 45-65
//   6+ or high-imp  → 15-35

function calculateCalendarScore(events) {
  if (!events || events.length === 0) return 95;

  var count = events.length;

  // Sum importance (default 3 on 1-5 scale if not set)
  var totalImportance = 0;
  for (var i = 0; i < events.length; i++) {
    var imp = events[i].estimated_importance;
    totalImportance += (imp != null ? imp : 3);
  }
  var avgImportance = totalImportance / count;

  // Base score from count: starts at 90, drops ~10 per event, floors at 10
  var countScore = Math.max(10, 90 - (count - 1) * 12);

  // Importance modifier: avg importance 1-2 = +10, 3 = 0, 4-5 = -10 to -20
  var impMod = (3 - avgImportance) * 8;

  var finalScore = Math.round(countScore + impMod);
  return Math.max(0, Math.min(100, finalScore));
}


// ── Dot's copy generation ────────────────────────────────────────────────
//
// Generates the headline, actions, and dotNote in Dot's voice.
// Phase-adjusted tone: cheeky in green, direct in yellow, warm in red.

function generateDotCopy(mode, modeName, cycleDay, factors, hasCheckin, hasWearable, hasCalendar) {

  // ── GREEN ──────────────────────────────────────────────────────────
  if (mode === 'green') {
    var greenHeadlines = getGreenHeadline(modeName, cycleDay, factors);
    return {
      headline: greenHeadlines.headline,
      actions: {
        tackle: 'Schedule the hard conversation. Start the new project. Hit a challenging workout. Your biology is backing you up today.',
        defer: "Nothing — you've got the bandwidth. Use it.",
        protect: "Don't waste this energy on busywork or meetings that could be emails. You won't feel this good every day."
      },
      dotNote: greenHeadlines.dotNote
    };
  }

  // ── YELLOW ─────────────────────────────────────────────────────────
  if (mode === 'yellow') {
    var yellowHeadlines = getYellowHeadline(modeName, cycleDay, factors);
    return {
      headline: yellowHeadlines.headline,
      actions: {
        tackle: 'Pick ONE high-priority task and give it your best window. Morning is probably it.',
        defer: 'The second-tier stuff. Anything that can wait 48 hours should wait 48 hours.',
        protect: "Your social battery. Don't book the optional happy hour. Guard your alone time tonight."
      },
      dotNote: yellowHeadlines.dotNote
    };
  }

  // ── RED ────────────────────────────────────────────────────────────
  var redHeadlines = getRedHeadline(modeName, cycleDay, factors);
  return {
    headline: redHeadlines.headline,
    actions: {
      tackle: "Only true emergencies. Everything else can wait. Seriously.",
      defer: "Almost everything. Move tomorrow's ambitions to your next green light day.",
      protect: "Your energy like it's currency — because it is. Cancel what you can. Say no to what you should."
    },
    dotNote: redHeadlines.dotNote
  };
}


// ── Headline generators (varied by phase context) ────────────────────────

function getGreenHeadline(modeName, cycleDay, factors) {
  // Vary based on what's driving the green
  var allPositive = factors.energy.contribution === 'positive' && factors.recovery.contribution === 'positive';

  if (modeName === 'Peak') {
    return {
      headline: "You're in Peak and everything is lit. This is your biological prime time — don't waste it on admin.",
      dotNote: 'Peak phase, day ' + cycleDay + '. Estrogen and testosterone are both peaking. Your verbal skills, confidence, and energy are at their monthly high. This is not the day to play small.'
    };
  }

  if (modeName === 'Rise' && allPositive) {
    return {
      headline: 'All systems go. Your hormones, your sleep, and your energy all agree — go make moves.',
      dotNote: 'Rise phase, day ' + cycleDay + '. Estrogen is climbing, taking your creativity and stamina with it. Your body is literally building momentum. Ride it.'
    };
  }

  if (modeName === 'Rise') {
    return {
      headline: "Rise phase and the signals are green. Your body is building momentum — let it.",
      dotNote: 'Rise phase, day ' + cycleDay + ". Follicular energy is real. You're in the upswing. New ideas, new projects, new workouts — your body is wired for novelty right now."
    };
  }

  if (modeName === 'Sustain') {
    return {
      headline: "Sustain phase but your numbers are strong. Use this window — it won't stay this clear.",
      dotNote: 'Sustain phase, day ' + cycleDay + ". Progesterone is up but your recovery and energy are holding. This is a strategic green light — you've got capacity, but it's borrowed. Deploy it wisely."
    };
  }

  // Restore with green (unusual, but possible with great recovery)
  return {
    headline: "Restore phase but your body is saying go. Trust the data over the calendar.",
    dotNote: 'Restore phase, day ' + cycleDay + '. Your cycle says rest but your recovery metrics are strong. Listen to your body — it knows more than the textbook. Light green, not neon.'
  };
}

function getYellowHeadline(modeName, cycleDay, factors) {
  if (modeName === 'Sustain') {
    return {
      headline: "Mixed signals today. You've got some gas in the tank but don't blow it all before noon.",
      dotNote: 'Sustain phase, day ' + cycleDay + '. Progesterone is dominant, which means your body wants to finish things, not start them. Work with that — close loops, tie up loose ends, skip the brainstorm.'
    };
  }

  if (modeName === 'Restore') {
    return {
      headline: "Your body is in Restore but not fully offline. Be gentle but not idle.",
      dotNote: 'Restore phase, day ' + cycleDay + ". Hormones are low but you've got some energy showing up in your data. Light tasks, reflection, planning — this is prep work for your next Rise."
    };
  }

  if (modeName === 'Rise') {
    return {
      headline: "Rise phase but something's dragging. Check your sleep, check your stress — then decide.",
      dotNote: 'Rise phase, day ' + cycleDay + ". Your cycle says go but your body or schedule is pushing back. The yellow light isn't a stop — it's a 'proceed with awareness.'"
    };
  }

  // Peak with yellow (low recovery or heavy calendar overriding phase)
  return {
    headline: "Peak phase but your tank isn't full. You've got the hormones — just manage the load.",
    dotNote: 'Peak phase, day ' + cycleDay + '. Estrogen is peaking but your recovery or schedule is weighing things down. You can still perform, just be selective about where you spend it.'
  };
}

function getRedHeadline(modeName, cycleDay, factors) {
  if (modeName === 'Restore') {
    return {
      headline: "Red light day. This isn't weakness, it's strategy. Rest now, dominate later.",
      dotNote: 'Restore phase, day ' + cycleDay + ". Everything in your biology is asking for rest. Hormones are at their lowest. The smartest thing you can do today is nothing ambitious. Tomorrow's energy is being built right now."
    };
  }

  if (modeName === 'Sustain') {
    return {
      headline: "Late Sustain and your body is winding down hard. Don't fight it — work with it.",
      dotNote: 'Sustain phase, day ' + cycleDay + '. Progesterone is dropping, taking your patience and energy with it. This is biology, not failure. Clear your plate, lower the bar, and know that your Rise phase is coming.'
    };
  }

  if (modeName === 'Rise' || modeName === 'Peak') {
    return {
      headline: "Your cycle says go but everything else says stop. Listen to the chorus, not the soloist.",
      dotNote: modeName + ' phase, day ' + cycleDay + ". Unusual red light for this phase — your recovery or energy is overriding your cycle position. Your body is telling you something. Don't push through, push back your calendar."
    };
  }

  return {
    headline: "Red light. Full stop. Protect your energy today — you'll thank yourself on your next green day.",
    dotNote: 'Day ' + cycleDay + '. Multiple signals are pointing down. This is your body asking for recovery. Honor it.'
  };
}
