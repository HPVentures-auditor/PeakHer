const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  try {
    // Run all stat queries in parallel
    var results = await Promise.all([
      // Total users
      sql`SELECT COUNT(*)::int as count FROM users`,
      // Active this week (checked in within last 7 days)
      sql`SELECT COUNT(DISTINCT user_id)::int as count FROM checkins WHERE date >= CURRENT_DATE - INTERVAL '7 days'`,
      // Total check-ins
      sql`SELECT COUNT(*)::int as count FROM checkins`,
      // Average streak (among users with streak > 0)
      sql`SELECT COALESCE(ROUND(AVG(current_streak), 1), 0) as avg FROM streaks WHERE current_streak > 0`,
      // Signups this week
      sql`SELECT COUNT(*)::int as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      // Check-ins today
      sql`SELECT COUNT(*)::int as count FROM checkins WHERE date = CURRENT_DATE`,
      // Signups per day (last 30 days)
      sql`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      // Check-ins per day (last 30 days)
      sql`
        SELECT date, COUNT(*)::int as count
        FROM checkins
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date
      `,
      // Recent signups (last 10)
      sql`
        SELECT u.id, u.name, u.email, u.created_at,
               COALESCE(s.current_streak, 0) as current_streak,
               (SELECT COUNT(*)::int FROM checkins WHERE user_id = u.id) as checkin_count
        FROM users u
        LEFT JOIN streaks s ON s.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT 10
      `,
      // Users who haven't checked in today (for reminder targeting)
      sql`
        SELECT COUNT(*)::int as count FROM users u
        WHERE u.email_opt_out = false
        AND u.id NOT IN (SELECT user_id FROM checkins WHERE date = CURRENT_DATE)
      `,
      // Top streakers
      sql`
        SELECT u.id, u.name, u.email, s.current_streak, s.longest_streak
        FROM users u
        JOIN streaks s ON s.user_id = u.id
        WHERE s.current_streak > 0
        ORDER BY s.current_streak DESC
        LIMIT 5
      `
    ]);

    return res.status(200).json({
      overview: {
        totalUsers: results[0][0].count,
        activeThisWeek: results[1][0].count,
        totalCheckins: results[2][0].count,
        avgStreak: parseFloat(results[3][0].avg),
        signupsThisWeek: results[4][0].count,
        checkinsToday: results[5][0].count,
        usersNeedingReminder: results[9][0].count
      },
      charts: {
        signupsPerDay: results[6].map(function (r) {
          return { date: formatDate(r.date), count: r.count };
        }),
        checkinsPerDay: results[7].map(function (r) {
          return { date: formatDate(r.date), count: r.count };
        })
      },
      recentSignups: results[8].map(function (u) {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.created_at,
          currentStreak: u.current_streak,
          checkinCount: u.checkin_count
        };
      }),
      topStreakers: results[10].map(function (u) {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          currentStreak: u.current_streak,
          longestStreak: u.longest_streak
        };
      })
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};

function formatDate(d) {
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d);
}
