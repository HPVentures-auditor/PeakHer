/**
 * Cron: /api/cron/wearable-sync
 * Runs daily at 6:30 AM UTC. Syncs all connected wearables for all users.
 */
const { getDb } = require('../_lib/db');
const { syncProvider } = require('../_lib/wearable-sync');

module.exports = async function handler(req, res) {
  // Only allow GET (Vercel cron) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret if set
  if (process.env.CRON_SECRET && req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) {
    // Allow Vercel cron (no auth header) in production
    if (req.headers['x-vercel-cron'] !== '1' && !process.env.VERCEL) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    var sql = getDb();

    var connections = await sql`
      SELECT * FROM wearable_connections
      WHERE sync_status = 'connected'
      ORDER BY last_synced ASC NULLS FIRST
      LIMIT 100
    `;

    console.log('Wearable cron: syncing ' + connections.length + ' connections');

    var successes = 0;
    var failures = 0;

    for (var i = 0; i < connections.length; i++) {
      var conn = connections[i];
      try {
        var count = await syncProvider(conn, sql);
        console.log('  Synced ' + conn.provider + ' for user ' + conn.user_id + ': ' + count + ' days');
        successes++;
      } catch (err) {
        console.error('  Failed ' + conn.provider + ' for user ' + conn.user_id + ':', err.message);
        failures++;

        // If token refresh fails, mark as needing re-auth
        if (err.message.includes('refresh') || err.message.includes('401') || err.message.includes('403')) {
          await sql`
            UPDATE wearable_connections
            SET sync_status = 'auth_expired', updated_at = now()
            WHERE id = ${conn.id}
          `;
        }
      }
    }

    return res.status(200).json({
      total: connections.length,
      successes: successes,
      failures: failures
    });
  } catch (err) {
    console.error('Wearable cron error:', err);
    return res.status(500).json({ error: 'Cron failed' });
  }
};
