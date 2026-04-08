/**
 * POST /api/wearable/garmin-webhook
 * Receives push data from Garmin Health API.
 * Garmin sends daily summaries, sleep, stress, etc. as they become available.
 */
const { getDb } = require('../_lib/db');
const garmin = require('../_lib/garmin');

module.exports = async function handler(req, res) {
  // Garmin sends a GET for webhook validation
  if (req.method === 'GET') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    var sql = getDb();
    var records = garmin.parseWebhookPayload(req.body || {});

    if (records.length === 0) {
      return res.status(200).json({ processed: 0 });
    }

    var processed = 0;

    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var garminUserId = record.userId;

      // Find the PeakHer user by their Garmin user token
      var connections = await sql`
        SELECT * FROM wearable_connections
        WHERE provider = 'garmin'
          AND (provider_user_id = ${garminUserId} OR access_token = ${garminUserId})
          AND sync_status = 'connected'
        LIMIT 1
      `;

      if (connections.length === 0) continue;

      var conn = connections[0];
      var data = record.data;
      var date = data.calendarDate || null;
      if (!date) continue;

      var normalized = {};

      if (record.type === 'dailies') {
        normalized.steps = data.steps || null;
        normalized.caloriesActive = data.activeKilocalories || null;
        normalized.caloriesTotal = data.totalKilocalories || null;
        normalized.stressAvg = data.averageStressLevel || null;
        normalized.bodyBatteryStart = data.startingBodyBatteryInDays || null;
        normalized.bodyBatteryEnd = data.endingBodyBatteryInDays || null;
        normalized.restingHr = data.restingHeartRateInBeatsPerMinute || null;
      } else if (record.type === 'sleeps') {
        normalized.sleepDurationMin = data.durationInSeconds ? data.durationInSeconds / 60 : null;
        normalized.deepSleepMin = data.deepSleepDurationInSeconds ? data.deepSleepDurationInSeconds / 60 : null;
        normalized.remSleepMin = data.remSleepInSeconds ? data.remSleepInSeconds / 60 : null;
        normalized.lightSleepMin = data.lightSleepDurationInSeconds ? data.lightSleepDurationInSeconds / 60 : null;
        normalized.awakeMin = data.awakeDurationInSeconds ? data.awakeDurationInSeconds / 60 : null;
        normalized.spo2Avg = data.averageSpO2Value || null;
        normalized.respiratoryRate = data.averageRespirationValue || null;
      } else if (record.type === 'stressDetails') {
        normalized.stressAvg = data.averageStressLevel || null;
      }

      // Upsert into wearable_data
      await sql`
        INSERT INTO wearable_data (user_id, provider, date,
          steps, calories_active, calories_total, stress_avg,
          body_battery_start, body_battery_end, resting_hr,
          sleep_duration_min, deep_sleep_min, rem_sleep_min, light_sleep_min, awake_min,
          spo2_avg, respiratory_rate,
          raw_data, synced_at
        ) VALUES (
          ${conn.user_id}, 'garmin', ${date},
          ${normalized.steps || null}, ${normalized.caloriesActive || null}, ${normalized.caloriesTotal || null}, ${normalized.stressAvg || null},
          ${normalized.bodyBatteryStart || null}, ${normalized.bodyBatteryEnd || null}, ${normalized.restingHr || null},
          ${normalized.sleepDurationMin || null}, ${normalized.deepSleepMin || null}, ${normalized.remSleepMin || null}, ${normalized.lightSleepMin || null}, ${normalized.awakeMin || null},
          ${normalized.spo2Avg || null}, ${normalized.respiratoryRate || null},
          ${JSON.stringify(data)}, now()
        )
        ON CONFLICT (user_id, provider, date) DO UPDATE SET
          steps = COALESCE(${normalized.steps || null}, wearable_data.steps),
          calories_active = COALESCE(${normalized.caloriesActive || null}, wearable_data.calories_active),
          calories_total = COALESCE(${normalized.caloriesTotal || null}, wearable_data.calories_total),
          stress_avg = COALESCE(${normalized.stressAvg || null}, wearable_data.stress_avg),
          body_battery_start = COALESCE(${normalized.bodyBatteryStart || null}, wearable_data.body_battery_start),
          body_battery_end = COALESCE(${normalized.bodyBatteryEnd || null}, wearable_data.body_battery_end),
          resting_hr = COALESCE(${normalized.restingHr || null}, wearable_data.resting_hr),
          sleep_duration_min = COALESCE(${normalized.sleepDurationMin || null}, wearable_data.sleep_duration_min),
          deep_sleep_min = COALESCE(${normalized.deepSleepMin || null}, wearable_data.deep_sleep_min),
          rem_sleep_min = COALESCE(${normalized.remSleepMin || null}, wearable_data.rem_sleep_min),
          light_sleep_min = COALESCE(${normalized.lightSleepMin || null}, wearable_data.light_sleep_min),
          awake_min = COALESCE(${normalized.awakeMin || null}, wearable_data.awake_min),
          spo2_avg = COALESCE(${normalized.spo2Avg || null}, wearable_data.spo2_avg),
          respiratory_rate = COALESCE(${normalized.respiratoryRate || null}, wearable_data.respiratory_rate),
          raw_data = ${JSON.stringify(data)},
          synced_at = now()
      `;

      processed++;
    }

    // Update last_synced for any affected connections
    await sql`
      UPDATE wearable_connections SET last_synced = now(), updated_at = now()
      WHERE provider = 'garmin' AND sync_status = 'connected'
    `;

    return res.status(200).json({ processed: processed });
  } catch (err) {
    console.error('Garmin webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
