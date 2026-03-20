const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  try {
    // 1. User profile (exclude password_hash, reset_token, reset_token_expires)
    var userRows = await sql`
      SELECT id, name, email, personas, is_admin, email_opt_out,
             onboarding_complete, created_at
      FROM users WHERE id = ${userId}
    `;
    if (!userRows.length) return sendError(res, 404, 'User not found');
    var u = userRows[0];
    var profile = {
      id: u.id,
      name: u.name,
      email: u.email,
      personas: u.personas,
      isAdmin: u.is_admin,
      emailOptOut: u.email_opt_out,
      onboardingComplete: u.onboarding_complete,
      createdAt: u.created_at
    };

    // 2. Cycle profile
    var cpRows = await sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start, updated_at
      FROM cycle_profiles WHERE user_id = ${userId}
    `;
    var cycleProfile = cpRows.length > 0 ? {
      trackingEnabled: cpRows[0].tracking_enabled,
      averageCycleLength: cpRows[0].average_cycle_length,
      lastPeriodStart: cpRows[0].last_period_start,
      updatedAt: cpRows[0].updated_at
    } : null;

    // 3. All check-ins
    var checkinRows = await sql`
      SELECT date, energy, confidence, sleep_quality, stress_level,
             cycle_day, cycle_phase, notes, created_at
      FROM checkins WHERE user_id = ${userId}
      ORDER BY date DESC
    `;
    var checkins = checkinRows.map(function (c) {
      var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
      return {
        date: dateStr,
        energy: c.energy,
        confidence: c.confidence,
        sleepQuality: c.sleep_quality,
        stressLevel: c.stress_level,
        cycleDay: c.cycle_day,
        cyclePhase: c.cycle_phase,
        notes: c.notes,
        createdAt: c.created_at
      };
    });

    // 4. Streak data
    var streakRows = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${userId}
    `;
    var streak = streakRows.length > 0 ? {
      currentStreak: streakRows[0].current_streak,
      longestStreak: streakRows[0].longest_streak,
      lastCheckinDate: streakRows[0].last_checkin_date
    } : null;

    // 5. Cached AI insights
    var insightRows = await sql`
      SELECT pattern_insights, week_ahead_narrative, recommendations,
             model_used, input_tokens, output_tokens, generated_at
      FROM insights WHERE user_id = ${userId}
    `;
    var insights = insightRows.map(function (r) {
      return {
        patternInsights: r.pattern_insights,
        weekAheadNarrative: r.week_ahead_narrative,
        recommendations: r.recommendations,
        modelUsed: r.model_used,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        generatedAt: r.generated_at
      };
    });

    // 6. Events
    var eventRows = await sql`
      SELECT id, type, title, notes, category, intensity, event_date, created_at
      FROM events WHERE user_id = ${userId}
      ORDER BY event_date DESC
    `;
    var events = eventRows.map(function (r) {
      var dateStr = r.event_date instanceof Date
        ? r.event_date.toISOString().split('T')[0]
        : String(r.event_date);
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        notes: r.notes,
        category: r.category,
        intensity: r.intensity,
        eventDate: dateStr,
        createdAt: r.created_at
      };
    });

    // 7. Push subscriptions (endpoint URLs only, no keys)
    var pushRows = await sql`
      SELECT endpoint, created_at
      FROM push_subscriptions WHERE user_id = ${userId}
    `;
    var pushSubscriptions = pushRows.map(function (r) {
      return {
        endpoint: r.endpoint,
        createdAt: r.created_at
      };
    });

    // Build export payload
    var exportData = {
      exportDate: new Date().toISOString(),
      platform: 'PeakHer by High Performance Ventures LLC',
      profile: profile,
      cycleProfile: cycleProfile,
      streak: streak,
      checkins: checkins,
      events: events,
      insights: insights,
      pushSubscriptions: pushSubscriptions
    };

    var today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="peakher-data-export-' + today + '.json"');
    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Export GET error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
