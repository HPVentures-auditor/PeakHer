/**
 * POST /api/wearable/sync
 * Body: { provider: "whoop" | "oura" | "garmin" } (optional -- syncs all if omitted)
 * Triggers an on-demand sync for the user's connected wearables.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');
const { syncProvider } = require('../_lib/wearable-sync');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var provider = req.body && req.body.provider ? req.body.provider.toLowerCase() : null;

  try {
    var sql = getDb();
    var query;

    if (provider) {
      query = sql`
        SELECT * FROM wearable_connections
        WHERE user_id = ${userId} AND provider = ${provider} AND sync_status = 'connected'
      `;
    } else {
      query = sql`
        SELECT * FROM wearable_connections
        WHERE user_id = ${userId} AND sync_status = 'connected'
      `;
    }

    var connections = await query;

    if (connections.length === 0) {
      return res.status(200).json({ synced: 0, message: 'No connected wearables' });
    }

    var results = [];
    for (var i = 0; i < connections.length; i++) {
      var conn = connections[i];
      try {
        var count = await syncProvider(conn, sql);
        results.push({ provider: conn.provider, dayssynced: count, status: 'ok' });
      } catch (err) {
        console.error('Sync error for ' + conn.provider + ':', err.message);
        results.push({ provider: conn.provider, dayssynced: 0, status: 'error', error: err.message });
      }
    }

    return res.status(200).json({ synced: results.length, results: results });
  } catch (err) {
    console.error('Wearable sync error:', err);
    return sendError(res, 500, 'Sync failed');
  }
};
