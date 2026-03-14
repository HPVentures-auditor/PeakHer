const { getDb } = require('./db');
const { getUserId, sendError } = require('./auth');

/**
 * Verify the request is from an authenticated admin user.
 * Returns { userId, sql } on success, or sends 401/403 and returns null.
 */
async function requireAdmin(req, res) {
  var userId = getUserId(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return null;
  }

  var sql = getDb();

  var rows = await sql`SELECT is_admin FROM users WHERE id = ${userId}`;
  if (!rows.length || !rows[0].is_admin) {
    sendError(res, 403, 'Forbidden — admin access required');
    return null;
  }

  return { userId: userId, sql: sql };
}

module.exports = { requireAdmin };
