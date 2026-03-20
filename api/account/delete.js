const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  try {
    var body = req.body;
    var confirmEmail = body && body.confirmEmail;

    if (!confirmEmail || typeof confirmEmail !== 'string') {
      return sendError(res, 400, 'confirmEmail is required');
    }

    // Verify the confirm email matches the user's actual email
    var userRows = await sql`
      SELECT email FROM users WHERE id = ${userId}
    `;
    if (!userRows.length) return sendError(res, 404, 'User not found');

    var userEmail = userRows[0].email;
    if (confirmEmail.toLowerCase().trim() !== userEmail.toLowerCase()) {
      return sendError(res, 400, 'Email does not match your account');
    }

    // Delete all user data in dependency order
    // 1. push_subscriptions
    await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId}`;

    // 2. events
    await sql`DELETE FROM events WHERE user_id = ${userId}`;

    // 3. insights
    await sql`DELETE FROM insights WHERE user_id = ${userId}`;

    // 4. checkins
    await sql`DELETE FROM checkins WHERE user_id = ${userId}`;

    // 5. streaks
    await sql`DELETE FROM streaks WHERE user_id = ${userId}`;

    // 6. cycle_profiles
    await sql`DELETE FROM cycle_profiles WHERE user_id = ${userId}`;

    // 7. users (the user record itself)
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return res.status(200).json({
      success: true,
      message: 'Account and all data permanently deleted'
    });
  } catch (err) {
    console.error('Account delete error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
