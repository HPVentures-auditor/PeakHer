var { getDb } = require('../_lib/db');
var { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var rows = await sql`
      SELECT provider, sync_status, last_synced
      FROM calendar_connections
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(200).json({ connected: false });
    }

    var conn = rows[0];
    return res.status(200).json({
      connected: true,
      provider: conn.provider,
      lastSynced: conn.last_synced,
      syncStatus: conn.sync_status
    });
  } catch (err) {
    console.error('Calendar status error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
