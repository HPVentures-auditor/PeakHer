const bcrypt = require('bcryptjs');
const { getDb } = require('../_lib/db');
const { sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var { token, password } = req.body;
  if (!token || !password) return sendError(res, 400, 'Token and password are required');
  if (password.length < 8) return sendError(res, 400, 'Password must be at least 8 characters');
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return sendError(res, 400, 'Password must contain at least one letter and one number');
  }

  var sql = getDb();

  try {
    // Find user with valid, non-expired token
    var rows = await sql`
      SELECT id, name FROM users
      WHERE reset_token = ${token}
        AND reset_token_expires > now()
    `;

    if (!rows.length) {
      return sendError(res, 400, 'Invalid or expired reset link. Please request a new one.');
    }

    var user = rows[0];
    var hash = await bcrypt.hash(password, 10);

    // Update password and clear token
    await sql`
      UPDATE users
      SET password_hash = ${hash}, reset_token = NULL, reset_token_expires = NULL
      WHERE id = ${user.id}
    `;

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
