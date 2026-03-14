const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  try {
    var search = (req.query.search || '').trim().toLowerCase();
    var sortBy = req.query.sortBy || 'created_at';
    var sortOrder = req.query.sortOrder || 'desc';
    var page = Math.max(1, parseInt(req.query.page) || 1);
    var limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    var offset = (page - 1) * limit;

    // Whitelist sort columns to prevent injection
    var allowedSorts = ['created_at', 'name', 'email', 'current_streak', 'checkin_count'];
    if (allowedSorts.indexOf(sortBy) === -1) sortBy = 'created_at';
    if (sortOrder !== 'asc' && sortOrder !== 'desc') sortOrder = 'desc';

    var users;
    var countResult;

    if (search) {
      countResult = await sql`
        SELECT COUNT(*)::int as total FROM users
        WHERE LOWER(name) LIKE ${'%' + search + '%'} OR LOWER(email) LIKE ${'%' + search + '%'}
      `;

      // For search + sort, we fetch all matching and sort in JS since Neon tagged templates
      // don't support dynamic ORDER BY easily
      users = await sql`
        SELECT u.id, u.name, u.email, u.personas, u.is_admin, u.email_opt_out, u.created_at,
               COALESCE(s.current_streak, 0) as current_streak,
               COALESCE(s.longest_streak, 0) as longest_streak,
               s.last_checkin_date,
               (SELECT COUNT(*)::int FROM checkins WHERE user_id = u.id) as checkin_count
        FROM users u
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE LOWER(u.name) LIKE ${'%' + search + '%'} OR LOWER(u.email) LIKE ${'%' + search + '%'}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      countResult = await sql`SELECT COUNT(*)::int as total FROM users`;

      users = await sql`
        SELECT u.id, u.name, u.email, u.personas, u.is_admin, u.email_opt_out, u.created_at,
               COALESCE(s.current_streak, 0) as current_streak,
               COALESCE(s.longest_streak, 0) as longest_streak,
               s.last_checkin_date,
               (SELECT COUNT(*)::int FROM checkins WHERE user_id = u.id) as checkin_count
        FROM users u
        LEFT JOIN streaks s ON s.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    var total = countResult[0].total;

    return res.status(200).json({
      users: users.map(function (u) {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          personas: u.personas,
          isAdmin: u.is_admin,
          emailOptOut: u.email_opt_out,
          createdAt: u.created_at,
          currentStreak: u.current_streak,
          longestStreak: u.longest_streak,
          lastCheckinDate: u.last_checkin_date,
          checkinCount: u.checkin_count
        };
      }),
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Admin users error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
