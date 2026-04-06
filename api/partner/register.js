/**
 * POST /api/partner/register
 * Partner creates account via invite code.
 * Body: { name, email, password, inviteCode }
 */
const bcrypt = require('bcryptjs');
const { getDb } = require('../_lib/db');
const { createToken, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var { name, email, password, inviteCode } = req.body || {};

  if (!name || !email || !password || !inviteCode) {
    return sendError(res, 400, 'Name, email, password, and invite code are required');
  }

  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  var sql = getDb();

  try {
    // Validate invite code
    var [partnership] = await sql`
      SELECT id, primary_user_id, status, invite_expires_at
      FROM partnerships
      WHERE invite_code = ${inviteCode} AND status = 'pending'
      LIMIT 1
    `;

    if (!partnership) {
      return sendError(res, 400, 'Invalid or expired invite code');
    }

    if (new Date(partnership.invite_expires_at) < new Date()) {
      return sendError(res, 400, 'This invite code has expired. Ask your partner for a new one.');
    }

    // Check if email already exists
    var [existingUser] = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (existingUser) {
      return sendError(res, 409, 'An account with this email already exists');
    }

    // Create partner user account
    var passwordHash = await bcrypt.hash(password, 12);

    var [newUser] = await sql`
      INSERT INTO users (name, email, password_hash, role, onboarding_complete, personas)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, 'partner', true, '[]')
      RETURNING id, name, email, role, onboarding_complete, created_at
    `;

    // Link the partnership
    await sql`
      UPDATE partnerships
      SET partner_user_id = ${newUser.id},
          status = 'active',
          accepted_at = now(),
          updated_at = now()
      WHERE id = ${partnership.id}
    `;

    var token = createToken(newUser.id);

    return res.status(201).json({
      token: token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        onboardingComplete: true,
        createdAt: newUser.created_at
      }
    });
  } catch (err) {
    console.error('Partner register error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
