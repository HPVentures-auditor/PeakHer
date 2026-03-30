/**
 * PeakHer Pattern Detection API
 *
 * GET /api/patterns - Returns detected performance patterns from check-in data.
 * Requires authentication. Query param: ?days=90 (default 90).
 * Returns { ready: false, ... } if fewer than 14 check-ins.
 */
var { getDb } = require('./_lib/db');
var { getUserId, sendError } = require('./_lib/auth');
var { analyzePatterns } = require('./_lib/patterns');

var MIN_CHECKINS = 14;
var DEFAULT_DAYS = 90;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    // Parse days parameter
    var days = parseInt(req.query.days, 10);
    if (!Number.isFinite(days) || days < 1) {
      days = DEFAULT_DAYS;
    }

    // Calculate cutoff date
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var cutoffStr = cutoff.toISOString().split('T')[0];

    // Fetch check-ins within the date range
    var checkins = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes, created_at
      FROM checkins WHERE user_id = ${userId} AND date >= ${cutoffStr}
      ORDER BY date ASC
    `;

    if (checkins.length < MIN_CHECKINS) {
      return res.status(200).json({
        ready: false,
        checkinCount: checkins.length,
        required: MIN_CHECKINS
      });
    }

    // Fetch cycle profile
    var cycleRows = await sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start
      FROM cycle_profiles WHERE user_id = ${userId}
    `;
    var cycleProfile = cycleRows.length > 0 ? cycleRows[0] : null;

    // Fetch streak
    var streakRows = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${userId}
    `;
    var streak = streakRows.length > 0 ? streakRows[0] : null;

    // Run pattern analysis
    var result = analyzePatterns(checkins, cycleProfile, streak);

    return res.status(200).json({
      ready: true,
      patterns: result.patterns,
      summary: result.summary
    });

  } catch (err) {
    console.error('Patterns GET error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
