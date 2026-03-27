const { getDb } = require('./db');
const { getUserId, sendError } = require('./auth');

/**
 * Hardcoded admin allow-list. Only these emails can access admin endpoints,
 * regardless of the is_admin flag in the database.
 */
var ADMIN_EMAILS = [
  'results@jairekrobbins.com',
  'jairekr@mac.com',
  'jairekr@me.com'
];

/**
 * Verify the request is from an authenticated admin user.
 * Checks: (1) valid JWT, (2) user exists, (3) email is in ADMIN_EMAILS allow-list.
 * Returns { userId, sql } on success, or sends 401/403 and returns null.
 */
async function requireAdmin(req, res) {
  var userId = getUserId(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return null;
  }

  var sql = getDb();

  var rows = await sql`SELECT email FROM users WHERE id = ${userId}`;
  if (!rows.length) {
    sendError(res, 401, 'Unauthorized');
    return null;
  }

  var email = rows[0].email.toLowerCase().trim();
  if (ADMIN_EMAILS.indexOf(email) === -1) {
    sendError(res, 403, 'Forbidden — admin access required');
    return null;
  }

  return { userId: userId, sql: sql };
}

module.exports = { requireAdmin };
