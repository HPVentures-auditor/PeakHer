const bcrypt = require('bcryptjs');
const { getDb } = require('../_lib/db');
const { createToken, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  const { email, password } = req.body;
  if (!email || !password) return sendError(res, 400, 'Email and password are required');

  const sql = getDb();

  try {
    const [user] = await sql`
      SELECT id, name, email, password_hash, personas, onboarding_complete, created_at
      FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (!user) return sendError(res, 401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return sendError(res, 401, 'Invalid email or password');

    const token = createToken(user.id);

    // Get cycle profile
    const [cycleProfile] = await sql`
      SELECT tracking_enabled, average_cycle_length, last_period_start
      FROM cycle_profiles WHERE user_id = ${user.id}
    `;

    // Get streak
    const [streak] = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${user.id}
    `;

    return res.status(200).json({
      token: token,
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
      } : null
    });
  } catch (err) {
    console.error('Login error:', err);
    return sendError(res, 500, 'Server error');
  }
};
