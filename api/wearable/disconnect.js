/**
 * POST /api/wearable/disconnect
 * Body: { provider: "whoop" | "oura" | "garmin" }
 * Removes a wearable connection and its synced data.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var provider = (req.body && req.body.provider || '').toLowerCase();
  if (!['whoop', 'oura', 'garmin'].includes(provider)) {
    return sendError(res, 400, 'Invalid provider');
  }

  try {
    var sql = getDb();

    // Delete connection
    await sql`
      DELETE FROM wearable_connections
      WHERE user_id = ${userId} AND provider = ${provider}
    `;

    // Delete synced data
    await sql`
      DELETE FROM wearable_data
      WHERE user_id = ${userId} AND provider = ${provider}
    `;

    return res.status(200).json({ success: true, provider: provider });
  } catch (err) {
    console.error('Wearable disconnect error:', err);
    return sendError(res, 500, 'Failed to disconnect ' + provider);
  }
};
