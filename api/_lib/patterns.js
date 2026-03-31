/**
 * PeakHer Pattern Detection Engine
 *
 * Server-side analysis of check-in data to detect performance patterns.
 * Self-contained module with its own math helpers. No client-side dependencies.
 */

'use strict';

// ── Math helpers ──────────────────────────────────────────────────────

/** Arithmetic mean of a numeric array. Returns 0 for empty arrays. */
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum / arr.length;
}

/**
 * Pearson correlation coefficient between two equal-length numeric arrays.
 * Returns null if fewer than 3 data points or zero variance in either array.
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

/** Round a number to one decimal place. */
function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Parse "YYYY-MM-DD" into a Date at local midnight. */
function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  var parts = str.split('-');
  if (parts.length !== 3) return null;
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

// ── Phase helpers ─────────────────────────────────────────────────────

var PHASE_NAMES = ['reflect', 'build', 'perform', 'complete'];
var PHASE_LABELS = {
  reflect: 'Reflect',
  build: 'Build',
  perform: 'Perform',
  complete: 'Complete'
};
var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Determine the cycle phase for a given cycle day (1-based).
 * Default cycle length is 28 days.
 * Phases: reflect (days 1-5), build (days 6-14), perform (days 15-17), complete (days 18-28+).
 */
function getPhaseForCycleDay(cycleDay, cycleLength) {
  if (!cycleDay || cycleDay < 1) return null;
  var len = cycleLength || 28;
  // Scale phase boundaries proportionally for non-28-day cycles
  var scale = len / 28;
  var reflectEnd = Math.round(5 * scale);
  var buildEnd = Math.round(14 * scale);
  var performEnd = Math.round(17 * scale);

  if (cycleDay <= reflectEnd) return 'reflect';
  if (cycleDay <= buildEnd) return 'build';
  if (cycleDay <= performEnd) return 'perform';
  return 'complete';
}

/**
 * Calculate cycle day for a given date based on last period start and cycle length.
 * Returns null if date is before last_period_start.
 */
function calculateCycleDay(lastPeriodStart, cycleLength, dateStr) {
  var start = parseDate(lastPeriodStart);
  var current = parseDate(dateStr);
  if (!start || !current) return null;
  var diffMs = current.getTime() - start.getTime();
  if (diffMs < 0) return null;
  var daysDiff = Math.floor(diffMs / 86400000);
  var len = cycleLength || 28;
  var cycleDay = (daysDiff % len) + 1;
  return cycleDay;
}

// ── Confidence score helpers ──────────────────────────────────────────

/**
 * Calculate a confidence score from 0.0-1.0 based on effect size and data points.
 * More data points and larger effect sizes produce higher confidence.
 */
function calcConfidence(effectSize, dataPoints, maxEffect) {
  var effectScore = Math.min(Math.abs(effectSize) / (maxEffect || 3), 1);
  // Data point factor: scales from 0.3 at 3 points to 1.0 at 30+ points
  var dataFactor = Math.min(0.3 + (dataPoints / 30) * 0.7, 1);
  return Math.round(effectScore * dataFactor * 100) / 100;
}

// ── Detector 1: Correlations ──────────────────────────────────────────

function detectCorrelations(checkins) {
  var patterns = [];
  var sleepPairs = [];
  var stressPairs = [];

  for (var i = 0; i < checkins.length; i++) {
    var c = checkins[i];
    if (c.sleep_quality != null && c.sleep_quality !== null) {
      sleepPairs.push({
        sleep: Number(c.sleep_quality),
        energy: Number(c.energy),
        confidence: Number(c.confidence)
      });
    }
    if (c.stress_level != null && c.stress_level !== null) {
      stressPairs.push({
        stress: Number(c.stress_level),
        energy: Number(c.energy),
        confidence: Number(c.confidence)
      });
    }
  }

  // Sleep-Energy correlation
  if (sleepPairs.length >= 10) {
    var sleepVals = sleepPairs.map(function (s) { return s.sleep; });
    var energyVals = sleepPairs.map(function (s) { return s.energy; });
    var r = pearsonCorrelation(sleepVals, energyVals);
    if (r !== null && Math.abs(r) >= 0.4) {
      var avgSleep = round1(mean(sleepVals));
      var avgEnergy = round1(mean(energyVals));
      patterns.push({
        id: 'corr-sleep-energy',
        type: 'correlation',
        description: r > 0
          ? 'Your sleep quality (avg ' + avgSleep + '/10) strongly predicts your energy (avg ' + avgEnergy + '/10) with r=' + round1(r) + '. On nights you sleep well (7+), your next-day energy averages ' + round1(mean(sleepPairs.filter(function (s) { return s.sleep >= 7; }).map(function (s) { return s.energy; })) || avgEnergy) + ', so prioritize sleep hygiene for better performance days.'
          : 'Your sleep quality shows an unusual inverse relationship with energy (r=' + round1(r) + '). This could mean you sleep longer on low-energy days or that oversleeping leaves you groggy. Try experimenting with consistent wake times.',
        confidenceScore: calcConfidence(r, sleepPairs.length, 1),
        dataPointsUsed: sleepPairs.length,
        positive: r > 0,
        metadata: { r: round1(r), avgSleep: avgSleep, avgEnergy: avgEnergy, metric1: 'sleep', metric2: 'energy' }
      });
    }
  }

  // Sleep-Confidence correlation
  if (sleepPairs.length >= 10) {
    var sleepVals2 = sleepPairs.map(function (s) { return s.sleep; });
    var confVals = sleepPairs.map(function (s) { return s.confidence; });
    var r2 = pearsonCorrelation(sleepVals2, confVals);
    if (r2 !== null && Math.abs(r2) >= 0.4) {
      var avgSleep2 = round1(mean(sleepVals2));
      var avgConf = round1(mean(confVals));
      patterns.push({
        id: 'corr-sleep-confidence',
        type: 'correlation',
        description: r2 > 0
          ? 'Better sleep directly fuels your confidence (r=' + round1(r2) + '). When you rate sleep 7+ your confidence averages ' + round1(mean(sleepPairs.filter(function (s) { return s.sleep >= 7; }).map(function (s) { return s.confidence; })) || avgConf) + ' vs ' + round1(mean(sleepPairs.filter(function (s) { return s.sleep < 7; }).map(function (s) { return s.confidence; })) || avgConf) + ' on poor-sleep days. That gap is real leverage.'
          : 'Your sleep and confidence show a surprising inverse pattern (r=' + round1(r2) + '). You may feel more confident on days you push through fatigue, but monitor this for burnout.',
        confidenceScore: calcConfidence(r2, sleepPairs.length, 1),
        dataPointsUsed: sleepPairs.length,
        positive: r2 > 0,
        metadata: { r: round1(r2), avgSleep: avgSleep2, avgConfidence: avgConf, metric1: 'sleep', metric2: 'confidence' }
      });
    }
  }

  // Stress-Energy correlation
  if (stressPairs.length >= 10) {
    var stressVals = stressPairs.map(function (s) { return s.stress; });
    var energyVals2 = stressPairs.map(function (s) { return s.energy; });
    var r3 = pearsonCorrelation(stressVals, energyVals2);
    if (r3 !== null && Math.abs(r3) >= 0.4) {
      var avgStress = round1(mean(stressVals));
      var avgEnergyStress = round1(mean(energyVals2));
      var highStressDays = stressPairs.filter(function (s) { return s.stress >= 7; });
      var lowStressDays = stressPairs.filter(function (s) { return s.stress <= 4; });
      var highStressEnergy = highStressDays.length > 0 ? round1(mean(highStressDays.map(function (s) { return s.energy; }))) : avgEnergyStress;
      var lowStressEnergy = lowStressDays.length > 0 ? round1(mean(lowStressDays.map(function (s) { return s.energy; }))) : avgEnergyStress;
      patterns.push({
        id: 'corr-stress-energy',
        type: 'correlation',
        description: r3 < 0
          ? 'Stress is draining your energy tank (r=' + round1(r3) + '). On high-stress days (7+) your energy drops to ' + highStressEnergy + ', but on calm days (4 or below) it rises to ' + lowStressEnergy + '. Stress management directly unlocks energy.'
          : 'Interestingly, your stress and energy move together (r=' + round1(r3) + '). You may thrive under pressure, but watch for the crash; this pattern often reverses under sustained load.',
        confidenceScore: calcConfidence(r3, stressPairs.length, 1),
        dataPointsUsed: stressPairs.length,
        positive: r3 < 0,
        metadata: { r: round1(r3), avgStress: avgStress, avgEnergy: avgEnergyStress, metric1: 'stress', metric2: 'energy' }
      });
    }
  }

  // Stress-Confidence correlation
  if (stressPairs.length >= 10) {
    var stressVals2 = stressPairs.map(function (s) { return s.stress; });
    var confVals2 = stressPairs.map(function (s) { return s.confidence; });
    var r4 = pearsonCorrelation(stressVals2, confVals2);
    if (r4 !== null && Math.abs(r4) >= 0.4) {
      var avgStress2 = round1(mean(stressVals2));
      var avgConf2 = round1(mean(confVals2));
      var highStressConf = stressPairs.filter(function (s) { return s.stress >= 7; });
      var lowStressConf = stressPairs.filter(function (s) { return s.stress <= 4; });
      var highConfVal = highStressConf.length > 0 ? round1(mean(highStressConf.map(function (s) { return s.confidence; }))) : avgConf2;
      var lowConfVal = lowStressConf.length > 0 ? round1(mean(lowStressConf.map(function (s) { return s.confidence; }))) : avgConf2;
      patterns.push({
        id: 'corr-stress-confidence',
        type: 'correlation',
        description: r4 < 0
          ? 'Stress erodes your confidence (r=' + round1(r4) + '). High-stress days see confidence at ' + highConfVal + ' vs ' + lowConfVal + ' on calm days. Reducing stress by even 2 points could meaningfully boost how capable you feel.'
          : 'Your stress and confidence rise together (r=' + round1(r4) + '), averaging ' + avgStress2 + ' stress alongside ' + avgConf2 + ' confidence. You may channel pressure into drive, but sustained stress rarely stays productive.',
        confidenceScore: calcConfidence(r4, stressPairs.length, 1),
        dataPointsUsed: stressPairs.length,
        positive: r4 < 0,
        metadata: { r: round1(r4), avgStress: avgStress2, avgConfidence: avgConf2, metric1: 'stress', metric2: 'confidence' }
      });
    }
  }

  return patterns;
}

// ── Detector 2: Cycle Phase Patterns ──────────────────────────────────

function detectCyclePatterns(checkins, cycleProfile) {
  if (!cycleProfile) return [];
  var trackingEnabled = cycleProfile.tracking_enabled || cycleProfile.trackingEnabled;
  if (!trackingEnabled) return [];

  var cycleLength = cycleProfile.average_cycle_length || cycleProfile.averageCycleLength || 28;
  var lastPeriodStart = cycleProfile.last_period_start || cycleProfile.lastPeriodStart;

  // Bucket check-ins by phase
  var phaseData = { reflect: [], build: [], perform: [], complete: [] };

  for (var i = 0; i < checkins.length; i++) {
    var c = checkins[i];
    var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
    var phase = null;

    // Prefer cycle_day on the checkin itself
    if (c.cycle_day != null) {
      phase = getPhaseForCycleDay(Number(c.cycle_day), cycleLength);
    } else if (lastPeriodStart) {
      // Calculate from cycle profile
      var cycleDay = calculateCycleDay(
        typeof lastPeriodStart === 'string' ? lastPeriodStart : lastPeriodStart.toISOString().split('T')[0],
        cycleLength,
        dateStr
      );
      if (cycleDay) {
        phase = getPhaseForCycleDay(cycleDay, cycleLength);
      }
    }

    if (phase && phaseData[phase]) {
      phaseData[phase].push(c);
    }
  }

  var allEnergies = checkins.map(function (c) { return Number(c.energy); });
  var allConfidences = checkins.map(function (c) { return Number(c.confidence); });
  var overallEnergy = mean(allEnergies);
  var overallConfidence = mean(allConfidences);
  var patterns = [];

  var modeDescriptions = {
    reflect: 'Reflect mode, ideal for introspection, planning, and lighter workloads',
    build: 'Build mode, your momentum phase for tackling ambitious projects',
    perform: 'Perform mode, your peak performance window for high-stakes work',
    complete: 'Complete mode, great for wrapping up projects and administrative tasks'
  };

  for (var p = 0; p < PHASE_NAMES.length; p++) {
    var phaseName = PHASE_NAMES[p];
    var data = phaseData[phaseName];
    if (data.length < 3) continue;

    var phaseEnergies = data.map(function (c) { return Number(c.energy); });
    var phaseConfidences = data.map(function (c) { return Number(c.confidence); });
    var phaseEnergy = mean(phaseEnergies);
    var phaseConfidence = mean(phaseConfidences);
    var energyDev = phaseEnergy - overallEnergy;
    var confDev = phaseConfidence - overallConfidence;

    // Energy pattern
    if (Math.abs(energyDev) >= 0.8) {
      var phaseLabel = PHASE_LABELS[phaseName];
      patterns.push({
        id: 'cycle-energy-' + phaseName,
        type: 'cycle',
        description: energyDev > 0
          ? 'Your energy averages ' + round1(phaseEnergy) + ' during ' + phaseLabel + ' phase vs ' + round1(overallEnergy) + ' overall (+' + round1(energyDev) + '). ' + modeDescriptions[phaseName] + '. Schedule your most demanding work here.'
          : 'Energy dips to ' + round1(phaseEnergy) + ' during ' + phaseLabel + ' phase vs ' + round1(overallEnergy) + ' overall (' + round1(energyDev) + '). ' + modeDescriptions[phaseName] + '. Protect this window for recovery and lighter tasks.',
        confidenceScore: calcConfidence(energyDev, data.length, 3),
        dataPointsUsed: data.length,
        positive: energyDev > 0,
        metadata: { phase: phaseName, metric: 'energy', phaseAvg: round1(phaseEnergy), overallAvg: round1(overallEnergy), deviation: round1(energyDev) }
      });
    }

    // Confidence pattern
    if (Math.abs(confDev) >= 0.8) {
      var phaseLabel2 = PHASE_LABELS[phaseName];
      patterns.push({
        id: 'cycle-confidence-' + phaseName,
        type: 'cycle',
        description: confDev > 0
          ? 'Confidence peaks at ' + round1(phaseConfidence) + ' during ' + phaseLabel2 + ' phase vs ' + round1(overallConfidence) + ' overall (+' + round1(confDev) + '). This is your power window: pitch ideas, have tough conversations, and take bold action.'
          : 'Confidence drops to ' + round1(phaseConfidence) + ' during ' + phaseLabel2 + ' phase vs ' + round1(overallConfidence) + ' overall (' + round1(confDev) + '). This is not a weakness. Lean on your routines, avoid big decisions if possible, and practice self-compassion.',
        confidenceScore: calcConfidence(confDev, data.length, 3),
        dataPointsUsed: data.length,
        positive: confDev > 0,
        metadata: { phase: phaseName, metric: 'confidence', phaseAvg: round1(phaseConfidence), overallAvg: round1(overallConfidence), deviation: round1(confDev) }
      });
    }
  }

  return patterns;
}

// ── Detector 3: Day of Week Patterns ──────────────────────────────────

function detectDayPatterns(checkins) {
  if (checkins.length < 21) return [];

  var dayBuckets = {};
  for (var d = 0; d < 7; d++) {
    dayBuckets[d] = [];
  }

  for (var i = 0; i < checkins.length; i++) {
    var c = checkins[i];
    var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
    var dt = parseDate(dateStr);
    if (!dt) continue;
    dayBuckets[dt.getDay()].push(c);
  }

  var allEnergies = checkins.map(function (c) { return Number(c.energy); });
  var allConfidences = checkins.map(function (c) { return Number(c.confidence); });
  var overallEnergy = mean(allEnergies);
  var overallConfidence = mean(allConfidences);
  var patterns = [];

  for (var dow = 0; dow < 7; dow++) {
    var data = dayBuckets[dow];
    if (data.length < 3) continue;

    var dayName = DAY_NAMES[dow];
    var dayEnergies = data.map(function (c) { return Number(c.energy); });
    var dayConfidences = data.map(function (c) { return Number(c.confidence); });
    var dayEnergy = mean(dayEnergies);
    var dayConfidence = mean(dayConfidences);
    var energyDev = dayEnergy - overallEnergy;
    var confDev = dayConfidence - overallConfidence;

    // Energy pattern
    if (Math.abs(energyDev) >= 1.0) {
      patterns.push({
        id: 'day-energy-' + dow,
        type: 'day-of-week',
        description: energyDev > 0
          ? 'Your energy averages ' + round1(dayEnergy) + ' on ' + dayName + 's vs ' + round1(overallEnergy) + ' overall (+' + round1(energyDev) + '). Schedule your most important work, tough conversations, or creative projects on ' + dayName + 's.'
          : dayName + 's are your lowest-energy day at ' + round1(dayEnergy) + ' vs ' + round1(overallEnergy) + ' overall (' + round1(energyDev) + '). Keep ' + dayName + 's lighter: admin tasks, planning, or self-care.',
        confidenceScore: calcConfidence(energyDev, data.length, 3),
        dataPointsUsed: data.length,
        positive: energyDev > 0,
        metadata: { day: dayName, dayIndex: dow, metric: 'energy', dayAvg: round1(dayEnergy), overallAvg: round1(overallEnergy), deviation: round1(energyDev) }
      });
    }

    // Confidence pattern
    if (Math.abs(confDev) >= 1.0) {
      patterns.push({
        id: 'day-confidence-' + dow,
        type: 'day-of-week',
        description: confDev > 0
          ? 'Your confidence peaks at ' + round1(dayConfidence) + ' on ' + dayName + 's vs ' + round1(overallConfidence) + ' overall (+' + round1(confDev) + '). This is your power day: book pitches, presentations, or networking on ' + dayName + 's.'
          : dayName + 's see your confidence dip to ' + round1(dayConfidence) + ' vs ' + round1(overallConfidence) + ' overall (' + round1(confDev) + '). Avoid scheduling high-pressure situations on ' + dayName + 's when possible.',
        confidenceScore: calcConfidence(confDev, data.length, 3),
        dataPointsUsed: data.length,
        positive: confDev > 0,
        metadata: { day: dayName, dayIndex: dow, metric: 'confidence', dayAvg: round1(dayConfidence), overallAvg: round1(overallConfidence), deviation: round1(confDev) }
      });
    }
  }

  return patterns;
}

// ── Detector 4: Trends (7-day moving averages) ───────────────────────

function detectTrends(checkins) {
  if (checkins.length < 14) return [];

  // Sort ascending by date
  var sorted = checkins.slice().sort(function (a, b) {
    var da = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
    var db = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date);
    return da.localeCompare(db);
  });

  // Compute 7-day moving averages
  var maEnergy = [];
  var maConfidence = [];
  for (var i = 6; i < sorted.length; i++) {
    var windowEnergy = [];
    var windowConf = [];
    for (var j = i - 6; j <= i; j++) {
      windowEnergy.push(Number(sorted[j].energy));
      windowConf.push(Number(sorted[j].confidence));
    }
    maEnergy.push(mean(windowEnergy));
    maConfidence.push(mean(windowConf));
  }

  if (maEnergy.length < 8) return [];

  var patterns = [];
  var halfPoint = Math.floor(maEnergy.length / 2);

  // Energy trend: compare first half to second half of moving averages
  var firstHalfEnergy = mean(maEnergy.slice(0, halfPoint));
  var secondHalfEnergy = mean(maEnergy.slice(halfPoint));
  var energyDiff = secondHalfEnergy - firstHalfEnergy;

  if (Math.abs(energyDiff) >= 0.5) {
    var trendDir = energyDiff > 0 ? 'upward' : 'downward';
    var totalDays = sorted.length;
    var startDate = sorted[0].date instanceof Date ? sorted[0].date.toISOString().split('T')[0] : String(sorted[0].date);
    var endDate = sorted[sorted.length - 1].date instanceof Date ? sorted[sorted.length - 1].date.toISOString().split('T')[0] : String(sorted[sorted.length - 1].date);
    patterns.push({
      id: 'trend-energy',
      type: 'trend',
      description: energyDiff > 0
        ? 'Your energy is trending upward over the last ' + totalDays + ' days, rising from an average of ' + round1(firstHalfEnergy) + ' to ' + round1(secondHalfEnergy) + ' (+' + round1(energyDiff) + '). Whatever you have been doing is working. Keep it up and notice what changed.'
        : 'Your energy has been declining over the last ' + totalDays + ' days, from ' + round1(firstHalfEnergy) + ' to ' + round1(secondHalfEnergy) + ' (' + round1(energyDiff) + '). This is worth paying attention to. Check your sleep, stress, and workload for recent shifts.',
      confidenceScore: calcConfidence(energyDiff, totalDays, 2),
      dataPointsUsed: totalDays,
      positive: energyDiff > 0,
      metadata: { metric: 'energy', direction: trendDir, firstHalfAvg: round1(firstHalfEnergy), secondHalfAvg: round1(secondHalfEnergy), diff: round1(energyDiff), startDate: startDate, endDate: endDate }
    });
  }

  // Confidence trend
  var firstHalfConf = mean(maConfidence.slice(0, halfPoint));
  var secondHalfConf = mean(maConfidence.slice(halfPoint));
  var confDiff = secondHalfConf - firstHalfConf;

  if (Math.abs(confDiff) >= 0.5) {
    var trendDirConf = confDiff > 0 ? 'upward' : 'downward';
    var totalDaysConf = sorted.length;
    var startDateConf = sorted[0].date instanceof Date ? sorted[0].date.toISOString().split('T')[0] : String(sorted[0].date);
    var endDateConf = sorted[sorted.length - 1].date instanceof Date ? sorted[sorted.length - 1].date.toISOString().split('T')[0] : String(sorted[sorted.length - 1].date);
    patterns.push({
      id: 'trend-confidence',
      type: 'trend',
      description: confDiff > 0
        ? 'Your confidence is building momentum over the last ' + totalDaysConf + ' days, from ' + round1(firstHalfConf) + ' to ' + round1(secondHalfConf) + ' (+' + round1(confDiff) + '). This upward arc suggests your recent habits or wins are compounding.'
        : 'Your confidence has softened over the last ' + totalDaysConf + ' days, from ' + round1(firstHalfConf) + ' to ' + round1(secondHalfConf) + ' (' + round1(confDiff) + '). Consider what might be eroding your sense of capability, and whether a small win could reverse the slide.',
      confidenceScore: calcConfidence(confDiff, totalDaysConf, 2),
      dataPointsUsed: totalDaysConf,
      positive: confDiff > 0,
      metadata: { metric: 'confidence', direction: trendDirConf, firstHalfAvg: round1(firstHalfConf), secondHalfAvg: round1(secondHalfConf), diff: round1(confDiff), startDate: startDateConf, endDate: endDateConf }
    });
  }

  return patterns;
}

// ── Detector 5: Streak Impact ─────────────────────────────────────────

function detectStreakImpact(checkins, streak) {
  if (!streak) return [];
  var currentStreak = streak.current_streak || streak.currentStreak || 0;
  if (currentStreak < 3) return [];
  if (checkins.length < 10) return [];

  // Sort ascending by date
  var sorted = checkins.slice().sort(function (a, b) {
    var da = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
    var db = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date);
    return da.localeCompare(db);
  });

  // Identify consecutive-day runs (streaks of 3+ days)
  var streakDays = [];
  var nonStreakDays = [];
  var currentRun = [sorted[0]];

  for (var i = 1; i < sorted.length; i++) {
    var prevDate = sorted[i - 1].date instanceof Date ? sorted[i - 1].date.toISOString().split('T')[0] : String(sorted[i - 1].date);
    var currDate = sorted[i].date instanceof Date ? sorted[i].date.toISOString().split('T')[0] : String(sorted[i].date);
    var prev = parseDate(prevDate);
    var curr = parseDate(currDate);

    if (prev && curr) {
      var diffMs = curr.getTime() - prev.getTime();
      var diffDays = Math.round(diffMs / 86400000);
      if (diffDays === 1) {
        currentRun.push(sorted[i]);
      } else {
        // End of run: classify
        if (currentRun.length >= 3) {
          for (var j = 0; j < currentRun.length; j++) {
            streakDays.push(currentRun[j]);
          }
        } else {
          for (var k = 0; k < currentRun.length; k++) {
            nonStreakDays.push(currentRun[k]);
          }
        }
        currentRun = [sorted[i]];
      }
    } else {
      // Can't parse: end run
      if (currentRun.length >= 3) {
        for (var j2 = 0; j2 < currentRun.length; j2++) {
          streakDays.push(currentRun[j2]);
        }
      } else {
        for (var k2 = 0; k2 < currentRun.length; k2++) {
          nonStreakDays.push(currentRun[k2]);
        }
      }
      currentRun = [sorted[i]];
    }
  }
  // Flush final run
  if (currentRun.length >= 3) {
    for (var m = 0; m < currentRun.length; m++) {
      streakDays.push(currentRun[m]);
    }
  } else {
    for (var n = 0; n < currentRun.length; n++) {
      nonStreakDays.push(currentRun[n]);
    }
  }

  if (streakDays.length < 5 || nonStreakDays.length < 5) return [];

  var patterns = [];

  var streakEnergy = mean(streakDays.map(function (c) { return Number(c.energy); }));
  var nonStreakEnergy = mean(nonStreakDays.map(function (c) { return Number(c.energy); }));
  var energyDiff = streakEnergy - nonStreakEnergy;

  if (Math.abs(energyDiff) >= 0.5) {
    patterns.push({
      id: 'streak-energy',
      type: 'streak',
      description: energyDiff > 0
        ? 'Consistency pays off: during check-in streaks (3+ consecutive days), your energy averages ' + round1(streakEnergy) + ' vs ' + round1(nonStreakEnergy) + ' on non-streak days (+' + round1(energyDiff) + '). The daily habit itself is boosting your performance. Your current streak is ' + currentStreak + ' days.'
        : 'During check-in streaks your energy dips slightly to ' + round1(streakEnergy) + ' vs ' + round1(nonStreakEnergy) + ' on scattered days (' + round1(energyDiff) + '). The awareness from consistent tracking may make you rate more honestly, and that is actually valuable data.',
      confidenceScore: calcConfidence(energyDiff, streakDays.length + nonStreakDays.length, 2),
      dataPointsUsed: streakDays.length + nonStreakDays.length,
      positive: energyDiff > 0,
      metadata: { metric: 'energy', streakAvg: round1(streakEnergy), nonStreakAvg: round1(nonStreakEnergy), diff: round1(energyDiff), currentStreak: currentStreak, streakDays: streakDays.length, nonStreakDays: nonStreakDays.length }
    });
  }

  var streakConf = mean(streakDays.map(function (c) { return Number(c.confidence); }));
  var nonStreakConf = mean(nonStreakDays.map(function (c) { return Number(c.confidence); }));
  var confDiff = streakConf - nonStreakConf;

  if (Math.abs(confDiff) >= 0.5) {
    patterns.push({
      id: 'streak-confidence',
      type: 'streak',
      description: confDiff > 0
        ? 'Your confidence is ' + round1(confDiff) + ' points higher during streaks (' + round1(streakConf) + ' vs ' + round1(nonStreakConf) + '). Showing up daily builds self-trust, and at ' + currentStreak + ' days, you are proving it right now.'
        : 'Confidence averages ' + round1(streakConf) + ' during streaks vs ' + round1(nonStreakConf) + ' otherwise (' + round1(confDiff) + '). Consistent tracking can surface harder truths, and that is a feature, not a bug.',
      confidenceScore: calcConfidence(confDiff, streakDays.length + nonStreakDays.length, 2),
      dataPointsUsed: streakDays.length + nonStreakDays.length,
      positive: confDiff > 0,
      metadata: { metric: 'confidence', streakAvg: round1(streakConf), nonStreakAvg: round1(nonStreakConf), diff: round1(confDiff), currentStreak: currentStreak, streakDays: streakDays.length, nonStreakDays: nonStreakDays.length }
    });
  }

  return patterns;
}

// ── Detector 6: Calendar Load Impact ─────────────────────────────────

/**
 * Detect patterns between calendar event load and energy/confidence.
 * Joins calendar_events with checkins by date to compare performance
 * on heavy meeting days vs light days, and high-stakes event days.
 *
 * @param {Array} checkins - Array of checkin rows from DB (sorted ascending)
 * @param {Array} calendarEvents - Array of calendar_event rows from DB
 * @returns {Array} Array of pattern objects
 */
function detectCalendarLoad(checkins, calendarEvents) {
  if (!calendarEvents || calendarEvents.length === 0) return [];
  if (!checkins || checkins.length < 7) return [];

  // Build a map of date -> { meetingCount, maxImportance, hasHighStakes } from timed events
  var dayMap = {};
  for (var i = 0; i < calendarEvents.length; i++) {
    var evt = calendarEvents[i];
    // Skip all-day events — they are not "meetings"
    if (evt.is_all_day) continue;
    var evtDate = null;
    if (evt.start_time instanceof Date) {
      evtDate = evt.start_time.toISOString().split('T')[0];
    } else if (typeof evt.start_time === 'string') {
      evtDate = evt.start_time.split('T')[0];
    }
    if (!evtDate) continue;

    if (!dayMap[evtDate]) {
      dayMap[evtDate] = { meetingCount: 0, maxImportance: 0, hasHighStakes: false };
    }
    dayMap[evtDate].meetingCount += 1;
    var importance = Number(evt.estimated_importance) || 5;
    if (importance > dayMap[evtDate].maxImportance) {
      dayMap[evtDate].maxImportance = importance;
    }
    if (importance >= 8) {
      dayMap[evtDate].hasHighStakes = true;
    }
  }

  // Join with checkins by date
  var heavyDays = [];   // 3+ meetings
  var lightDays = [];   // 0-1 meetings
  var highStakesDays = [];
  var regularDays = [];
  var allJoinedEnergy = [];
  var allJoinedConf = [];
  var meetingCounts = [];
  var energyForCorr = [];
  var confForCorr = [];

  for (var j = 0; j < checkins.length; j++) {
    var c = checkins[j];
    var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
    var dayInfo = dayMap[dateStr];

    // Only consider days where we have BOTH calendar data and a check-in
    // Days with no calendar events at all are counted as 0-meeting days
    var count = dayInfo ? dayInfo.meetingCount : 0;
    var importance2 = dayInfo ? dayInfo.maxImportance : 0;
    var energy = Number(c.energy);
    var confidence = Number(c.confidence);

    meetingCounts.push(count);
    energyForCorr.push(energy);
    confForCorr.push(confidence);

    if (count >= 3) {
      heavyDays.push({ energy: energy, confidence: confidence, count: count });
    }
    if (count <= 1) {
      lightDays.push({ energy: energy, confidence: confidence, count: count });
    }
    if (dayInfo && dayInfo.hasHighStakes) {
      highStakesDays.push({ energy: energy, confidence: confidence });
    } else {
      regularDays.push({ energy: energy, confidence: confidence });
    }
  }

  var patterns = [];

  // Pattern: Meeting load / energy correlation
  if (meetingCounts.length >= 10) {
    var rEnergy = pearsonCorrelation(meetingCounts, energyForCorr);
    if (rEnergy !== null && Math.abs(rEnergy) >= 0.3) {
      patterns.push({
        id: 'cal-load-energy-corr',
        type: 'calendar-load',
        description: rEnergy < 0
          ? 'Meeting load negatively correlates with your energy (r=' + round1(rEnergy) + '). The more meetings you stack, the more your energy drops. Consider capping meetings at 2-3 per day to protect your output.'
          : 'Interestingly, more meetings correlate with higher energy (r=' + round1(rEnergy) + '). You may be someone who draws energy from interaction. Lean into collaborative days when your schedule is full.',
        confidenceScore: calcConfidence(rEnergy, meetingCounts.length, 1),
        dataPointsUsed: meetingCounts.length,
        positive: rEnergy > 0,
        metadata: { r: round1(rEnergy), metric1: 'meetingCount', metric2: 'energy' }
      });
    }

    // Meeting load / confidence correlation
    var rConf = pearsonCorrelation(meetingCounts, confForCorr);
    if (rConf !== null && Math.abs(rConf) >= 0.3) {
      patterns.push({
        id: 'cal-load-confidence-corr',
        type: 'calendar-load',
        description: rConf < 0
          ? 'More meetings correlate with lower confidence (r=' + round1(rConf) + '). Heavy meeting days may leave you feeling less capable. Block focus time before and after high-pressure meetings.'
          : 'More meetings correlate with higher confidence (r=' + round1(rConf) + '). Social engagement seems to boost your self-assurance. Use meeting-heavy days for bold conversations.',
        confidenceScore: calcConfidence(rConf, meetingCounts.length, 1),
        dataPointsUsed: meetingCounts.length,
        positive: rConf > 0,
        metadata: { r: round1(rConf), metric1: 'meetingCount', metric2: 'confidence' }
      });
    }
  }

  // Pattern: Heavy meeting days (3+) vs light days (0-1)
  if (heavyDays.length >= 3 && lightDays.length >= 3) {
    var heavyEnergy = mean(heavyDays.map(function (d) { return d.energy; }));
    var lightEnergy = mean(lightDays.map(function (d) { return d.energy; }));
    var energyDiff = heavyEnergy - lightEnergy;

    if (Math.abs(energyDiff) >= 0.5) {
      patterns.push({
        id: 'cal-heavy-vs-light-energy',
        type: 'calendar-load',
        description: energyDiff < 0
          ? 'On days with 3+ meetings, your energy averages ' + round1(heavyEnergy) + ' vs ' + round1(lightEnergy) + ' on light days. Your energy drops by ' + round1(Math.abs(energyDiff)) + ' points on heavy meeting days. Guard your calendar ruthlessly.'
          : 'On days with 3+ meetings, your energy averages ' + round1(heavyEnergy) + ' vs ' + round1(lightEnergy) + ' on light days (+' + round1(energyDiff) + '). You thrive in a full schedule. Embrace meeting-rich days for your hardest work.',
        confidenceScore: calcConfidence(energyDiff, heavyDays.length + lightDays.length, 3),
        dataPointsUsed: heavyDays.length + lightDays.length,
        positive: energyDiff > 0,
        metadata: { metric: 'energy', heavyAvg: round1(heavyEnergy), lightAvg: round1(lightEnergy), diff: round1(energyDiff), heavyDays: heavyDays.length, lightDays: lightDays.length }
      });
    }

    var heavyConf = mean(heavyDays.map(function (d) { return d.confidence; }));
    var lightConf = mean(lightDays.map(function (d) { return d.confidence; }));
    var confDiff = heavyConf - lightConf;

    if (Math.abs(confDiff) >= 0.5) {
      patterns.push({
        id: 'cal-heavy-vs-light-confidence',
        type: 'calendar-load',
        description: confDiff < 0
          ? 'Heavy meeting days (3+) pull your confidence down to ' + round1(heavyConf) + ' vs ' + round1(lightConf) + ' on light days (' + round1(confDiff) + '). Too many back-to-back interactions may erode your sense of control. Build in buffer time.'
          : 'Your confidence actually rises on heavy meeting days: ' + round1(heavyConf) + ' vs ' + round1(lightConf) + ' on light days (+' + round1(confDiff) + '). Social momentum fuels your self-belief.',
        confidenceScore: calcConfidence(confDiff, heavyDays.length + lightDays.length, 3),
        dataPointsUsed: heavyDays.length + lightDays.length,
        positive: confDiff > 0,
        metadata: { metric: 'confidence', heavyAvg: round1(heavyConf), lightAvg: round1(lightConf), diff: round1(confDiff), heavyDays: heavyDays.length, lightDays: lightDays.length }
      });
    }
  }

  // Pattern: High-stakes event days (importance >= 8) vs regular days
  if (highStakesDays.length >= 3 && regularDays.length >= 3) {
    var hsEnergy = mean(highStakesDays.map(function (d) { return d.energy; }));
    var regEnergy = mean(regularDays.map(function (d) { return d.energy; }));
    var hsEnergyDiff = hsEnergy - regEnergy;

    if (Math.abs(hsEnergyDiff) >= 0.5) {
      patterns.push({
        id: 'cal-highstakes-energy',
        type: 'calendar-load',
        description: hsEnergyDiff > 0
          ? 'High-stakes events (importance 8+) boost your energy to ' + round1(hsEnergy) + ' vs ' + round1(regEnergy) + ' on regular days (+' + round1(hsEnergyDiff) + '). You rise to the occasion. Lean into big moments.'
          : 'High-stakes events (importance 8+) drain your energy to ' + round1(hsEnergy) + ' vs ' + round1(regEnergy) + ' on regular days (' + round1(hsEnergyDiff) + '). The pressure costs you. Plan recovery time after major events.',
        confidenceScore: calcConfidence(hsEnergyDiff, highStakesDays.length + regularDays.length, 3),
        dataPointsUsed: highStakesDays.length + regularDays.length,
        positive: hsEnergyDiff > 0,
        metadata: { metric: 'energy', highStakesAvg: round1(hsEnergy), regularAvg: round1(regEnergy), diff: round1(hsEnergyDiff), highStakesDays: highStakesDays.length, regularDays: regularDays.length }
      });
    }

    var hsConf = mean(highStakesDays.map(function (d) { return d.confidence; }));
    var regConf = mean(regularDays.map(function (d) { return d.confidence; }));
    var hsConfDiff = hsConf - regConf;

    if (Math.abs(hsConfDiff) >= 0.5) {
      patterns.push({
        id: 'cal-highstakes-confidence',
        type: 'calendar-load',
        description: hsConfDiff > 0
          ? 'High-stakes events correlate with higher confidence: ' + round1(hsConf) + ' vs ' + round1(regConf) + ' on regular days (+' + round1(hsConfDiff) + '). Big moments bring out your best self.'
          : 'High-stakes events correlate with lower confidence: ' + round1(hsConf) + ' vs ' + round1(regConf) + ' on regular days (' + round1(hsConfDiff) + '). Pre-event preparation and self-talk routines could help close this gap.',
        confidenceScore: calcConfidence(hsConfDiff, highStakesDays.length + regularDays.length, 3),
        dataPointsUsed: highStakesDays.length + regularDays.length,
        positive: hsConfDiff > 0,
        metadata: { metric: 'confidence', highStakesAvg: round1(hsConf), regularAvg: round1(regConf), diff: round1(hsConfDiff), highStakesDays: highStakesDays.length, regularDays: regularDays.length }
      });
    }
  }

  return patterns;
}

// ── Master Analyzer ───────────────────────────────────────────────────

/**
 * Run all pattern detectors and return a unified result.
 *
 * @param {Array} checkins - Array of checkin rows from DB
 * @param {Object|null} cycleProfile - Cycle profile row from DB (or null)
 * @param {Object|null} streak - Streak row from DB (or null)
 * @param {Array|null} calendarEvents - Array of calendar_event rows from DB (or null)
 * @returns {{ patterns: Array, summary: Object }}
 */
function analyzePatterns(checkins, cycleProfile, streak, calendarEvents) {
  if (!checkins || checkins.length === 0) {
    return {
      patterns: [],
      summary: {
        totalCheckins: 0,
        dateRange: { start: null, end: null },
        avgEnergy: 0,
        avgConfidence: 0,
        strongestPattern: null,
        dataQuality: 'low'
      }
    };
  }

  // Sort ascending by date for consistent processing
  var sorted = checkins.slice().sort(function (a, b) {
    var da = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
    var db = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date);
    return da.localeCompare(db);
  });

  // Run all detectors
  var correlations = detectCorrelations(sorted);
  var cyclePatterns = detectCyclePatterns(sorted, cycleProfile);
  var dayPatterns = detectDayPatterns(sorted);
  var trends = detectTrends(sorted);
  var streakPatterns = detectStreakImpact(sorted, streak);
  var calendarPatterns = detectCalendarLoad(sorted, calendarEvents || []);

  var allPatterns = correlations.concat(cyclePatterns, dayPatterns, trends, streakPatterns, calendarPatterns);

  // Sort by confidence score descending
  allPatterns.sort(function (a, b) {
    return b.confidenceScore - a.confidenceScore;
  });

  // Build summary
  var allEnergies = sorted.map(function (c) { return Number(c.energy); });
  var allConfidences = sorted.map(function (c) { return Number(c.confidence); });
  var startDate = sorted[0].date instanceof Date ? sorted[0].date.toISOString().split('T')[0] : String(sorted[0].date);
  var endDate = sorted[sorted.length - 1].date instanceof Date ? sorted[sorted.length - 1].date.toISOString().split('T')[0] : String(sorted[sorted.length - 1].date);

  var totalCheckins = sorted.length;
  var dataQuality = 'low';
  if (totalCheckins >= 60) {
    dataQuality = 'high';
  } else if (totalCheckins >= 30) {
    dataQuality = 'medium';
  }

  return {
    patterns: allPatterns,
    summary: {
      totalCheckins: totalCheckins,
      dateRange: { start: startDate, end: endDate },
      avgEnergy: round1(mean(allEnergies)),
      avgConfidence: round1(mean(allConfidences)),
      strongestPattern: allPatterns.length > 0 ? allPatterns[0] : null,
      dataQuality: dataQuality
    }
  };
}

// ── Exports ───────────────────────────────────────────────────────────

module.exports = {
  mean: mean,
  pearsonCorrelation: pearsonCorrelation,
  detectCorrelations: detectCorrelations,
  detectCyclePatterns: detectCyclePatterns,
  detectDayPatterns: detectDayPatterns,
  detectTrends: detectTrends,
  detectStreakImpact: detectStreakImpact,
  detectCalendarLoad: detectCalendarLoad,
  analyzePatterns: analyzePatterns
};
