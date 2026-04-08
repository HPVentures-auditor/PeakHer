/**
 * GET /api/wearable/status
 * Returns connection status for all wearable providers.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  try {
    var sql = getDb();

    var connections = await sql`
      SELECT provider, sync_status, last_synced, created_at
      FROM wearable_connections
      WHERE user_id = ${userId} AND sync_status != 'pending_auth'
    `;

    var status = {
      whoop: { connected: false },
      oura: { connected: false },
      garmin: { connected: false }
    };

    connections.forEach(function (c) {
      if (status[c.provider]) {
        status[c.provider] = {
          connected: c.sync_status === 'connected',
          lastSynced: c.last_synced,
          connectedAt: c.created_at
        };
      }
    });

    return res.status(200).json(status);
  } catch (err) {
    console.error('Wearable status error:', err);
    return sendError(res, 500, 'Failed to get wearable status');
  }
};
