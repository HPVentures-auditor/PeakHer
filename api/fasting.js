/**
 * PeakHer Phase-Aware Intermittent Fasting API
 *
 * GET /api/fasting
 * Auth required. Returns today's fasting/eating windows based on cycle phase.
 *
 * Phase protocols:
 *   Restore (reflect): 12:12 — gentle, body under stress
 *   Rise (build):      16:8  — best fasting phase, cortisol low
 *   Peak (perform):    14:10 — moderate, support ovulatory process
 *   Sustain (complete): 14:10 — shorter fast, blood sugar stability
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

    // Fetch cycle profile
    var profiles = await sql`
      SELECT last_period_start, average_cycle_length, tracking_enabled
      FROM cycle_profiles WHERE user_id = ${userId} LIMIT 1
    `;
    var cycleProfile = profiles.length > 0 ? profiles[0] : null;

    if (!cycleProfile || !cycleProfile.tracking_enabled || !cycleProfile.last_period_start) {
      return sendError(res, 400, 'Cycle tracking not configured. Complete onboarding first.');
    }

    var cycleLength = cycleProfile.average_cycle_length || 28;
    var cycleDay = calculateCycleDay(cycleProfile.last_period_start, cycleLength, today);
    var internalPhase = getPhaseForCycleDay(cycleDay, cycleLength);
    var phaseName = getModeName(internalPhase);

    var protocol = getProtocol(internalPhase);

    return res.status(200).json({
      date: today,
      phase: phaseName,
      cycle_day: cycleDay,
      protocol: protocol,
      dot_explanation: getDotExplanation(internalPhase),
      all_phases: {
        restore: { protocol: '12:12', note: 'Gentle. Eat within 1 hour of waking.' },
        rise: { protocol: '16:8', note: 'Your strongest fasting phase.' },
        peak: { protocol: '14:10', note: 'Moderate. Support the process.' },
        sustain: { protocol: '14:10', note: 'Shorter fast. Blood sugar stability.' }
      }
    });
  } catch (err) {
    console.error('Fasting GET error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


// ── Fasting protocols ──────────────────────────────────────────────────

function getProtocol(phase) {
  switch (phase) {
    case 'reflect':
      return {
        name: '12:12',
        fasting_hours: 12,
        eating_hours: 12,
        fasting_window: { start: '7:00 PM', end: '7:00 AM' },
        eating_window: { start: '7:00 AM', end: '7:00 PM' }
      };
    case 'build':
      return {
        name: '16:8',
        fasting_hours: 16,
        eating_hours: 8,
        fasting_window: { start: '8:00 PM', end: '12:00 PM' },
        eating_window: { start: '12:00 PM', end: '8:00 PM' }
      };
    case 'perform':
      return {
        name: '14:10',
        fasting_hours: 14,
        eating_hours: 10,
        fasting_window: { start: '7:00 PM', end: '9:00 AM' },
        eating_window: { start: '9:00 AM', end: '7:00 PM' }
      };
    case 'complete':
      return {
        name: '14:10',
        fasting_hours: 14,
        eating_hours: 10,
        fasting_window: { start: '7:00 PM', end: '9:00 AM' },
        eating_window: { start: '9:00 AM', end: '7:00 PM' }
      };
    default:
      return {
        name: '14:10',
        fasting_hours: 14,
        eating_hours: 10,
        fasting_window: { start: '7:00 PM', end: '9:00 AM' },
        eating_window: { start: '9:00 AM', end: '7:00 PM' }
      };
  }
}

function getDotExplanation(phase) {
  switch (phase) {
    case 'reflect':
      return 'Your body is under stress. Extended fasting raises cortisol. A gentle 12:12 window lets you nourish recovery without adding metabolic pressure.';
    case 'build':
      return 'Your BEST fasting phase. Cortisol is low and insulin sensitivity is high. Your body can handle a longer fast and actually benefits from it.';
    case 'perform':
      return 'Moderate fasting supports the ovulatory process. Not too long, not too short — your body needs steady fuel for this high-energy window.';
    case 'complete':
      return 'Longer fasts spike cortisol in Sustain. Shorter fast keeps blood sugar stable and supports progesterone production.';
    default:
      return 'Shorter fast keeps blood sugar stable.';
  }
}


// ── Date helpers (duplicated from briefing.js) ─────────────────────────

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


// ── Cycle calculation (duplicated from briefing.js) ────────────────────

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
