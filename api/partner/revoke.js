/**
 * POST /api/partner/revoke
 * Primary user permanently disconnects partner.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user || user.role !== 'user') {
      return sendError(res, 403, 'Only primary users can revoke partner access');
    }

    var [partnership] = await sql`
      SELECT id FROM partnerships
      WHERE primary_user_id = ${userId} AND status IN ('pending', 'active')
      LIMIT 1
    `;

    if (!partnership) {
      return sendError(res, 404, 'No active partnership found');
    }

    // Revoke the partnership
    await sql`
      UPDATE partnerships SET
        status = 'revoked',
        revoked_at = now(),
        updated_at = now()
      WHERE id = ${partnership.id}
    `;

    // Clear cached briefings
    await sql`DELETE FROM partner_briefings WHERE partnership_id = ${partnership.id}`;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Partner revoke error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
