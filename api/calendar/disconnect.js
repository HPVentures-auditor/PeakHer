var { getDb } = require('../_lib/db');
var { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    // Delete the calendar connection
    await sql`
      DELETE FROM calendar_connections
      WHERE user_id = ${userId}
    `;

    // Delete all Google-synced calendar events
    await sql`
      DELETE FROM calendar_events
      WHERE user_id = ${userId} AND synced_from = 'google'
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Calendar disconnect error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
