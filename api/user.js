const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const [user] = await sql`
        SELECT id, name, email, personas, onboarding_complete, created_at
        FROM users WHERE id = ${userId}
      `;
      if (!user) return sendError(res, 404, 'User not found');

      const [cycleProfile] = await sql`
        SELECT tracking_enabled, average_cycle_length, last_period_start
        FROM cycle_profiles WHERE user_id = ${userId}
      `;

      const [streak] = await sql`
        SELECT current_streak, longest_streak, last_checkin_date
        FROM streaks WHERE user_id = ${userId}
      `;

      const [countResult] = await sql`
        SELECT COUNT(*) as count FROM checkins WHERE user_id = ${userId}
      `;

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          personas: user.personas,
          onboardingComplete: user.onboarding_complete,
          createdAt: user.created_at
        },
        cycleProfile: cycleProfile ? {
          trackingEnabled: cycleProfile.tracking_enabled,
          averageCycleLength: cycleProfile.average_cycle_length,
          lastPeriodStart: cycleProfile.last_period_start
        } : null,
        streak: streak ? {
          current: streak.current_streak,
          longest: streak.longest_streak,
          lastCheckinDate: streak.last_checkin_date
        } : null,
        checkinCount: parseInt(countResult.count)
      });
    } catch (err) {
      console.error('User GET error:', err);
      return sendError(res, 500, 'Server error');
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, personas, cycleProfile } = req.body;

      if (name) {
        await sql`UPDATE users SET name = ${name.trim()} WHERE id = ${userId}`;
      }
      if (personas) {
        await sql`UPDATE users SET personas = ${personas} WHERE id = ${userId}`;
      }
      if (cycleProfile) {
        await sql`
          UPDATE cycle_profiles SET
            tracking_enabled = ${cycleProfile.trackingEnabled || false},
            average_cycle_length = ${cycleProfile.averageCycleLength || 28},
            last_period_start = ${cycleProfile.lastPeriodStart || null},
            updated_at = now()
          WHERE user_id = ${userId}
        `;
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('User PUT error:', err);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
