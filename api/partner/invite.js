/**
 * POST /api/partner/invite
 * Primary user creates an invite code for their partner.
 */
const crypto = require('crypto');
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    // Verify caller is a primary user
    var [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user || user.role !== 'user') {
      return sendError(res, 403, 'Only primary users can invite partners');
    }

    // Check for existing active/pending partnership
    var existing = await sql`
      SELECT id, status, invite_code FROM partnerships
      WHERE primary_user_id = ${userId} AND status IN ('pending', 'active')
      LIMIT 1
    `;

    if (existing.length > 0 && existing[0].status === 'active') {
      return sendError(res, 409, 'You already have an active partner connection');
    }

    // If there's a pending invite, delete it and create a fresh one
    if (existing.length > 0 && existing[0].status === 'pending') {
      await sql`DELETE FROM partnerships WHERE id = ${existing[0].id}`;
    }

    // Generate a 12-char invite code
    var inviteCode = crypto.randomBytes(9).toString('base64url').slice(0, 12);
    var expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO partnerships (primary_user_id, invite_code, invite_expires_at, status)
      VALUES (${userId}, ${inviteCode}, ${expiresAt}, 'pending')
    `;

    return res.status(200).json({
      inviteCode: inviteCode,
      inviteUrl: 'https://peakher.ai/partner-invite/' + inviteCode,
      expiresAt: expiresAt
    });
  } catch (err) {
    console.error('Partner invite error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
