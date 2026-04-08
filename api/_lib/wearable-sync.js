/**
 * Unified wearable sync engine.
 * Fetches data from any connected provider, normalizes it, and upserts into wearable_data.
 */

var whoop = require('./whoop');
var oura = require('./oura');
var garmin = require('./garmin');

/**
 * Sync a single provider connection. Fetches last 14 days of data.
 * @param {object} connection - wearable_connections row
 * @param {function} sql - Neon query function
 * @returns {number} count of days synced
 */
async function syncProvider(connection, sql) {
  var provider = connection.provider;
  var now = new Date();
  var startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 14);
  var start = startDate.toISOString().split('T')[0];
  var end = now.toISOString().split('T')[0];

  var normalized;

  if (provider === 'whoop') {
    normalized = await syncWhoop(connection, sql, start, end);
  } else if (provider === 'oura') {
    normalized = await syncOura(connection, sql, start, end);
  } else if (provider === 'garmin') {
    normalized = await syncGarmin(connection, sql, start, end);
  } else {
    throw new Error('Unknown provider: ' + provider);
  }

  // Upsert each day's data
  var count = 0;
  for (var i = 0; i < normalized.length; i++) {
    var d = normalized[i];
    if (!d.date) continue;

    await sql`
      INSERT INTO wearable_data (
        user_id, provider, date,
        hrv_avg, hrv_max, resting_hr,
        sleep_duration_min, sleep_quality_score, deep_sleep_min, rem_sleep_min, light_sleep_min, awake_min, sleep_efficiency,
        recovery_score, readiness_score, strain_score, stress_avg,
        body_battery_start, body_battery_end,
        steps, calories_active, calories_total,
        skin_temp_deviation, respiratory_rate, spo2_avg, active_minutes,
        raw_data, synced_at
      ) VALUES (
        ${connection.user_id}, ${provider}, ${d.date},
        ${d.hrvAvg || null}, ${d.hrvMax || null}, ${d.restingHr || null},
        ${d.sleepDurationMin || null}, ${d.sleepQuality || null}, ${d.deepSleepMin || null}, ${d.remSleepMin || null}, ${d.lightSleepMin || null}, ${d.awakeMin || null}, ${d.sleepEfficiency || null},
        ${d.recoveryScore || null}, ${d.readinessScore || null}, ${d.strainScore || null}, ${d.stressAvg || null},
        ${d.bodyBatteryStart || null}, ${d.bodyBatteryEnd || null},
        ${d.steps || null}, ${d.caloriesActive || null}, ${d.caloriesTotal || null},
        ${d.skinTempDeviation || null}, ${d.respiratoryRate || null}, ${d.spo2Avg || null}, ${d.activeMinutes || null},
        ${JSON.stringify(d.raw || {})}, now()
      )
      ON CONFLICT (user_id, provider, date) DO UPDATE SET
        hrv_avg = COALESCE(${d.hrvAvg || null}, wearable_data.hrv_avg),
        hrv_max = COALESCE(${d.hrvMax || null}, wearable_data.hrv_max),
        resting_hr = COALESCE(${d.restingHr || null}, wearable_data.resting_hr),
        sleep_duration_min = COALESCE(${d.sleepDurationMin || null}, wearable_data.sleep_duration_min),
        sleep_quality_score = COALESCE(${d.sleepQuality || null}, wearable_data.sleep_quality_score),
        deep_sleep_min = COALESCE(${d.deepSleepMin || null}, wearable_data.deep_sleep_min),
        rem_sleep_min = COALESCE(${d.remSleepMin || null}, wearable_data.rem_sleep_min),
        light_sleep_min = COALESCE(${d.lightSleepMin || null}, wearable_data.light_sleep_min),
        awake_min = COALESCE(${d.awakeMin || null}, wearable_data.awake_min),
        sleep_efficiency = COALESCE(${d.sleepEfficiency || null}, wearable_data.sleep_efficiency),
        recovery_score = COALESCE(${d.recoveryScore || null}, wearable_data.recovery_score),
        readiness_score = COALESCE(${d.readinessScore || null}, wearable_data.readiness_score),
        strain_score = COALESCE(${d.strainScore || null}, wearable_data.strain_score),
        stress_avg = COALESCE(${d.stressAvg || null}, wearable_data.stress_avg),
        body_battery_start = COALESCE(${d.bodyBatteryStart || null}, wearable_data.body_battery_start),
        body_battery_end = COALESCE(${d.bodyBatteryEnd || null}, wearable_data.body_battery_end),
        steps = COALESCE(${d.steps || null}, wearable_data.steps),
        calories_active = COALESCE(${d.caloriesActive || null}, wearable_data.calories_active),
        calories_total = COALESCE(${d.caloriesTotal || null}, wearable_data.calories_total),
        skin_temp_deviation = COALESCE(${d.skinTempDeviation || null}, wearable_data.skin_temp_deviation),
        respiratory_rate = COALESCE(${d.respiratoryRate || null}, wearable_data.respiratory_rate),
        spo2_avg = COALESCE(${d.spo2Avg || null}, wearable_data.spo2_avg),
        active_minutes = COALESCE(${d.activeMinutes || null}, wearable_data.active_minutes),
        raw_data = ${JSON.stringify(d.raw || {})},
        synced_at = now()
    `;
    count++;
  }

  // Update last_synced on connection
  await sql`
    UPDATE wearable_connections SET last_synced = now(), updated_at = now()
    WHERE id = ${connection.id}
  `;

  return count;
}

// ── Provider-specific sync logic ────────────────────────────────────

async function syncWhoop(connection, sql, start, end) {
  var token = await whoop.getValidToken(connection, sql);

  var recovery = await whoop.fetchRecovery(token, start, end).catch(function () { return []; });
  var sleep = await whoop.fetchSleep(token, start, end).catch(function () { return []; });
  var cycles = await whoop.fetchCycles(token, start, end).catch(function () { return []; });

  // Merge by date
  var byDate = {};
  recovery.forEach(function (r) {
    if (!r.date) return;
    byDate[r.date] = byDate[r.date] || {};
    byDate[r.date].recoveryScore = r.recoveryScore;
    byDate[r.date].hrvAvg = r.hrvMs;
    byDate[r.date].restingHr = r.restingHr;
    byDate[r.date].spo2Avg = r.spo2;
    byDate[r.date].skinTempDeviation = r.skinTemp;
  });

  sleep.forEach(function (s) {
    if (!s.date) return;
    byDate[s.date] = byDate[s.date] || {};
    byDate[s.date].sleepDurationMin = s.sleepDurationMin;
    byDate[s.date].sleepQuality = s.sleepQuality;
    byDate[s.date].sleepEfficiency = s.sleepEfficiency;
    byDate[s.date].deepSleepMin = s.deepSleepMin;
    byDate[s.date].remSleepMin = s.remSleepMin;
    byDate[s.date].lightSleepMin = s.lightSleepMin;
    byDate[s.date].awakeMin = s.awakeMin;
    byDate[s.date].respiratoryRate = s.respiratoryRate;
  });

  cycles.forEach(function (c) {
    if (!c.date) return;
    byDate[c.date] = byDate[c.date] || {};
    byDate[c.date].strainScore = c.strain;
    byDate[c.date].caloriesTotal = c.calories;
  });

  return Object.keys(byDate).map(function (date) {
    return Object.assign({ date: date }, byDate[date]);
  });
}

async function syncOura(connection, sql, start, end) {
  var token = await oura.getValidToken(connection, sql);

  var readiness = await oura.fetchReadiness(token, start, end).catch(function () { return []; });
  var sleepDaily = await oura.fetchSleep(token, start, end).catch(function () { return []; });
  var sleepSessions = await oura.fetchSleepSessions(token, start, end).catch(function () { return []; });
  var activity = await oura.fetchActivity(token, start, end).catch(function () { return []; });

  var byDate = {};

  readiness.forEach(function (r) {
    if (!r.date) return;
    byDate[r.date] = byDate[r.date] || {};
    byDate[r.date].readinessScore = r.readinessScore;
  });

  sleepDaily.forEach(function (s) {
    if (!s.date) return;
    byDate[s.date] = byDate[s.date] || {};
    byDate[s.date].sleepQuality = s.sleepScore;
  });

  sleepSessions.forEach(function (s) {
    if (!s.date) return;
    byDate[s.date] = byDate[s.date] || {};
    byDate[s.date].sleepDurationMin = s.sleepDurationMin;
    byDate[s.date].deepSleepMin = s.deepSleepMin;
    byDate[s.date].remSleepMin = s.remSleepMin;
    byDate[s.date].lightSleepMin = s.lightSleepMin;
    byDate[s.date].awakeMin = s.awakeMin;
    byDate[s.date].sleepEfficiency = s.sleepEfficiency;
    byDate[s.date].hrvAvg = s.avgHrv;
    byDate[s.date].restingHr = s.restingHr;
    byDate[s.date].respiratoryRate = s.avgBreathRate;
  });

  activity.forEach(function (a) {
    if (!a.date) return;
    byDate[a.date] = byDate[a.date] || {};
    byDate[a.date].steps = a.steps;
    byDate[a.date].caloriesActive = a.caloriesActive;
    byDate[a.date].caloriesTotal = a.caloriesTotal;
    byDate[a.date].activeMinutes = a.activeMinutes;
  });

  return Object.keys(byDate).map(function (date) {
    return Object.assign({ date: date }, byDate[date]);
  });
}

async function syncGarmin(connection, sql, start, end) {
  var tokenData = await garmin.getValidToken(connection);
  var accessToken = tokenData.accessToken;
  var tokenSecret = tokenData.tokenSecret;

  var startEpoch = Math.floor(new Date(start + 'T00:00:00Z').getTime() / 1000);
  var endEpoch = Math.floor(new Date(end + 'T23:59:59Z').getTime() / 1000);

  var dailies = await garmin.fetchDailySummaries(accessToken, tokenSecret, startEpoch, endEpoch).catch(function () { return []; });
  var sleeps = await garmin.fetchSleep(accessToken, tokenSecret, startEpoch, endEpoch).catch(function () { return []; });
  var stress = await garmin.fetchStressDetails(accessToken, tokenSecret, startEpoch, endEpoch).catch(function () { return []; });

  var byDate = {};

  dailies.forEach(function (d) {
    if (!d.date) return;
    byDate[d.date] = byDate[d.date] || {};
    byDate[d.date].steps = d.steps;
    byDate[d.date].caloriesActive = d.caloriesActive;
    byDate[d.date].caloriesTotal = d.caloriesTotal;
    byDate[d.date].stressAvg = d.stressAvg;
    byDate[d.date].bodyBatteryStart = d.bodyBatteryStart;
    byDate[d.date].bodyBatteryEnd = d.bodyBatteryEnd;
    byDate[d.date].restingHr = d.restingHr;
    byDate[d.date].activeMinutes = d.activeMinutes;
  });

  sleeps.forEach(function (s) {
    if (!s.date) return;
    byDate[s.date] = byDate[s.date] || {};
    byDate[s.date].sleepDurationMin = s.sleepDurationMin;
    byDate[s.date].deepSleepMin = s.deepSleepMin;
    byDate[s.date].remSleepMin = s.remSleepMin;
    byDate[s.date].lightSleepMin = s.lightSleepMin;
    byDate[s.date].awakeMin = s.awakeMin;
    byDate[s.date].spo2Avg = s.avgSpO2;
    byDate[s.date].respiratoryRate = s.avgRespRate;
  });

  stress.forEach(function (st) {
    if (!st.date) return;
    byDate[st.date] = byDate[st.date] || {};
    if (!byDate[st.date].stressAvg) byDate[st.date].stressAvg = st.stressAvg;
  });

  return Object.keys(byDate).map(function (date) {
    return Object.assign({ date: date }, byDate[date]);
  });
}

module.exports = {
  syncProvider: syncProvider
};
