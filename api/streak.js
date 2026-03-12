const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  try {
    const [streak] = await sql`
      SELECT current_streak, longest_streak, last_checkin_date
      FROM streaks WHERE user_id = ${userId}
    `;

    return res.status(200).json({
      current: streak ? streak.current_streak : 0,
      longest: streak ? streak.longest_streak : 0,
      lastCheckinDate: streak ? streak.last_checkin_date : null
    });
  } catch (err) {
    console.error('Streak GET error:', err);
    return sendError(res, 500, 'Server error');
  }
};
