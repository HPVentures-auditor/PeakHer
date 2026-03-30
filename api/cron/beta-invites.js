/**
 * Beta invite cron job.
 * Runs daily. Finds waitlist entries 2-3 days old that haven't been invited,
 * checks total registered users < 1000, and sends beta invite emails.
 */
var { getDb } = require('../_lib/db');
var { sendEmail, betaInviteEmail } = require('../_lib/email');

var MAX_BETA_USERS = 1000;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret
  var authHeader = req.headers['authorization'];
  var cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured, rejecting request');
    return res.status(500).json({ error: 'Cron not configured' });
  }
  if (authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var sql = getDb();

  try {
    // 1. Check how many registered users we have
    var countResult = await sql`SELECT COUNT(*)::int as total FROM users`;
    var totalUsers = countResult[0].total;

    if (totalUsers >= MAX_BETA_USERS) {
      console.log('Beta invites: capacity reached (' + totalUsers + '/' + MAX_BETA_USERS + ')');
      return res.status(200).json({
        success: true,
        message: 'Beta capacity reached',
        totalUsers: totalUsers,
        sent: 0
      });
    }

    var spotsLeft = MAX_BETA_USERS - totalUsers;

    // 2. Find waitlist entries that are 2+ days old, not yet invited, and not already registered
    var eligible = await sql`
      SELECT w.id, w.email, w.first_name, w.quiz_level
      FROM waitlist w
      WHERE w.invited_at IS NULL
        AND w.registered_at IS NULL
        AND w.created_at <= now() - INTERVAL '2 days'
        AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(w.email))
      ORDER BY w.created_at ASC
      LIMIT ${Math.min(spotsLeft, 50)}
    `;

    if (eligible.length === 0) {
      console.log('Beta invites: no eligible waitlist entries');
      return res.status(200).json({
        success: true,
        sent: 0,
        eligible: 0,
        totalUsers: totalUsers,
        spotsLeft: spotsLeft
      });
    }

    var sent = 0;
    var errors = [];

    for (var i = 0; i < eligible.length; i++) {
      try {
        var entry = eligible[i];
        var name = entry.first_name || 'there';
        var tpl = betaInviteEmail(name, spotsLeft - sent);

        await sendEmail({ to: entry.email, subject: tpl.subject, html: tpl.html });

        // Mark as invited
        await sql`UPDATE waitlist SET invited_at = now() WHERE id = ${entry.id}`;
        sent++;
      } catch (emailErr) {
        errors.push({ email: eligible[i].email, error: emailErr.message });
      }
    }

    console.log('Beta invites: sent ' + sent + '/' + eligible.length + ', errors: ' + errors.length + ', total users: ' + totalUsers);

    return res.status(200).json({
      success: true,
      sent: sent,
      eligible: eligible.length,
      errors: errors.length,
      totalUsers: totalUsers,
      spotsLeft: spotsLeft - sent
    });
  } catch (err) {
    console.error('Beta invites error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
