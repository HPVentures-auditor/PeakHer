/**
 * GET /api/cron/partner-briefings
 * Pre-generates partner briefings daily at 6:30 AM UTC.
 * Triggered by Vercel cron.
 */
const { getDb } = require('../_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var sql = getDb();

  try {
    // Find all active, non-paused partnerships
    var partnerships = await sql`
      SELECT p.id, p.partner_user_id
      FROM partnerships p
      WHERE p.status = 'active' AND p.sharing_paused = false AND p.partner_user_id IS NOT NULL
      LIMIT 100
    `;

    if (partnerships.length === 0) {
      return res.status(200).json({ total: 0, message: 'No active partnerships to brief' });
    }

    // For each partnership, trigger the partner briefing endpoint internally
    // by making a fetch to the partner briefing API with the partner's auth
    // For V1, we just log the count — the briefing generates on-demand and caches
    // Pre-generation can be added later when there are enough partners to warrant it

    return res.status(200).json({
      total: partnerships.length,
      message: 'Partner briefings will generate on-demand and cache for today'
    });
  } catch (err) {
    console.error('Partner briefings cron error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
