const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  if (req.method === 'POST') {
    try {
      var endpoint = req.body && req.body.endpoint;
      var keys = req.body && req.body.keys;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return sendError(res, 400, 'endpoint and keys (p256dh, auth) are required');
      }

      // Upsert on (user_id, endpoint) — update keys if endpoint already exists
      await sql`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
        ON CONFLICT (user_id, endpoint) DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          created_at = now()
      `;

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Push subscribe POST error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  if (req.method === 'DELETE') {
    try {
      var endpointToDelete = req.body && req.body.endpoint;

      if (!endpointToDelete) {
        return sendError(res, 400, 'endpoint is required');
      }

      await sql`
        DELETE FROM push_subscriptions
        WHERE user_id = ${userId} AND endpoint = ${endpointToDelete}
      `;

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Push subscribe DELETE error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
