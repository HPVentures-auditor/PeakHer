const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  var userId = req.query.id;
  if (!userId) return sendError(res, 400, 'User ID required');

  // GET — single user detail
  if (req.method === 'GET') {
    try {
      var rows = await sql`
        SELECT u.id, u.name, u.email, u.personas, u.is_admin, u.email_opt_out,
               u.onboarding_complete, u.created_at,
               cp.tracking_enabled, cp.average_cycle_length, cp.last_period_start,
               s.current_streak, s.longest_streak, s.last_checkin_date
        FROM users u
        LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.id = ${userId}
      `;
      if (!rows.length) return sendError(res, 404, 'User not found');
      var u = rows[0];

      // Get recent check-ins
      var checkins = await sql`
        SELECT date, energy, confidence, sleep_quality, stress_level, notes, created_at
        FROM checkins WHERE user_id = ${userId}
        ORDER BY date DESC LIMIT 30
      `;

      // Get total check-in count
      var countResult = await sql`SELECT COUNT(*)::int as count FROM checkins WHERE user_id = ${userId}`;

      return res.status(200).json({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          personas: u.personas,
          isAdmin: u.is_admin,
          emailOptOut: u.email_opt_out,
          onboardingComplete: u.onboarding_complete,
          createdAt: u.created_at
        },
        cycleProfile: {
          trackingEnabled: u.tracking_enabled,
          averageCycleLength: u.average_cycle_length,
          lastPeriodStart: u.last_period_start
        },
        streak: {
          current: u.current_streak || 0,
          longest: u.longest_streak || 0,
          lastCheckinDate: u.last_checkin_date
        },
        checkinCount: countResult[0].count,
        recentCheckins: checkins.map(function (c) {
          var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
          return {
            date: dateStr,
            energy: c.energy,
            confidence: c.confidence,
            sleepQuality: c.sleep_quality,
            stressLevel: c.stress_level,
            notes: c.notes
          };
        })
      });
    } catch (err) {
      console.error('Admin user GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // PUT — update user
  if (req.method === 'PUT') {
    try {
      var body = req.body;

      // Update name
      if (body.name != null) {
        if (typeof body.name !== 'string' || body.name.trim().length === 0) {
          return sendError(res, 400, 'Name must be a non-empty string');
        }
        await sql`UPDATE users SET name = ${body.name.trim()} WHERE id = ${userId}`;
      }

      // Toggle admin
      if (body.isAdmin != null) {
        // Prevent removing your own admin
        if (String(userId) === String(ctx.userId) && !body.isAdmin) {
          return sendError(res, 400, 'Cannot remove your own admin access');
        }
        await sql`UPDATE users SET is_admin = ${!!body.isAdmin} WHERE id = ${userId}`;
      }

      // Toggle email opt-out
      if (body.emailOptOut != null) {
        await sql`UPDATE users SET email_opt_out = ${!!body.emailOptOut} WHERE id = ${userId}`;
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Admin user PUT error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // DELETE — delete user and all their data
  if (req.method === 'DELETE') {
    try {
      // Prevent self-deletion
      if (String(userId) === String(ctx.userId)) {
        return sendError(res, 400, 'Cannot delete your own account');
      }

      // Delete in order (foreign key constraints)
      await sql`DELETE FROM checkins WHERE user_id = ${userId}`;
      await sql`DELETE FROM streaks WHERE user_id = ${userId}`;
      await sql`DELETE FROM cycle_profiles WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;

      return res.status(200).json({ success: true, deleted: userId });
    } catch (err) {
      console.error('Admin user DELETE error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
