/**
 * GET /api/wearable/data?start=YYYY-MM-DD&end=YYYY-MM-DD&provider=whoop|oura|garmin
 * Returns normalized wearable data for the date range.
 * If provider is omitted, returns merged data from all connected providers.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var start = req.query.start;
  var end = req.query.end;
  var provider = req.query.provider;

  if (!start || !end) {
    return sendError(res, 400, 'start and end query params required (YYYY-MM-DD)');
  }

  try {
    var sql = getDb();
    var rows;

    if (provider) {
      rows = await sql`
        SELECT * FROM wearable_data
        WHERE user_id = ${userId} AND provider = ${provider}
          AND date >= ${start} AND date <= ${end}
        ORDER BY date ASC
      `;
    } else {
      // Return all providers, merged by date (latest sync wins per metric)
      rows = await sql`
        SELECT DISTINCT ON (date)
          *
        FROM wearable_data
        WHERE user_id = ${userId}
          AND date >= ${start} AND date <= ${end}
        ORDER BY date ASC, synced_at DESC
      `;
    }

    // Format for frontend
    var data = rows.map(function (r) {
      return {
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
        provider: r.provider,
        hrv: r.hrv_avg,
        hrvMax: r.hrv_max,
        restingHr: r.resting_hr,
        sleepDuration: r.sleep_duration_min,
        sleepQuality: r.sleep_quality_score,
        deepSleep: r.deep_sleep_min,
        remSleep: r.rem_sleep_min,
        lightSleep: r.light_sleep_min,
        sleepEfficiency: r.sleep_efficiency,
        recovery: r.recovery_score,
        readiness: r.readiness_score,
        strain: r.strain_score,
        stress: r.stress_avg,
        bodyBatteryStart: r.body_battery_start,
        bodyBatteryEnd: r.body_battery_end,
        steps: r.steps,
        caloriesActive: r.calories_active,
        skinTempDeviation: r.skin_temp_deviation,
        respiratoryRate: r.respiratory_rate,
        spo2: r.spo2_avg
      };
    });

    return res.status(200).json({ data: data });
  } catch (err) {
    console.error('Wearable data error:', err);
    return sendError(res, 500, 'Failed to fetch wearable data');
  }
};
