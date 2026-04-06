/**
 * GET /api/partner/invite-info?code=XXX
 * Public endpoint — validates invite code, returns inviter's first name.
 */
const { getDb } = require('../_lib/db');
const { sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var code = req.query.code;
  if (!code) return sendError(res, 400, 'Invite code required');

  var sql = getDb();

  try {
    var [partnership] = await sql`
      SELECT p.status, p.invite_expires_at, u.name
      FROM partnerships p
      JOIN users u ON u.id = p.primary_user_id
      WHERE p.invite_code = ${code}
      LIMIT 1
    `;

    if (!partnership) {
      return res.status(200).json({ valid: false, reason: 'invalid' });
    }

    if (partnership.status !== 'pending') {
      return res.status(200).json({ valid: false, reason: 'already_used' });
    }

    if (new Date(partnership.invite_expires_at) < new Date()) {
      return res.status(200).json({ valid: false, reason: 'expired' });
    }

    // Return only the first name for privacy
    var firstName = (partnership.name || '').split(' ')[0] || 'Someone';

    return res.status(200).json({
      valid: true,
      inviterName: firstName
    });
  } catch (err) {
    console.error('Invite info error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
