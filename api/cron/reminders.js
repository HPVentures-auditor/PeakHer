/**
 * Daily check-in reminder cron job.
 * Triggered by Vercel Cron at 2:00 PM UTC (roughly morning US time).
 * Protected by CRON_SECRET to prevent external calls.
 */
const { getDb } = require('../_lib/db');
const { sendEmail, reminderEmail } = require('../_lib/email');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret (Vercel sets this header automatically for cron jobs)
  var authHeader = req.headers['authorization'];
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var sql = getDb();

  try {
    // Find users who haven't checked in today and haven't opted out
    var users = await sql`
      SELECT u.id, u.name, u.email, COALESCE(s.current_streak, 0) as current_streak
      FROM users u
      LEFT JOIN streaks s ON s.user_id = u.id
      WHERE u.email_opt_out = false
        AND u.id NOT IN (SELECT user_id FROM checkins WHERE date = CURRENT_DATE)
    `;

    var sent = 0;
    var errors = [];

    for (var i = 0; i < users.length; i++) {
      try {
        var u = users[i];
        var tpl = reminderEmail(u.name, u.current_streak);
        await sendEmail({ to: u.email, subject: tpl.subject, html: tpl.html });
        await sql`UPDATE users SET last_email_sent = now() WHERE id = ${u.id}`;
        sent++;
      } catch (emailErr) {
        errors.push({ email: users[i].email, error: emailErr.message });
      }
    }

    console.log('Cron reminders: sent ' + sent + '/' + users.length + ', errors: ' + errors.length);

    return res.status(200).json({
      success: true,
      sent: sent,
      total: users.length,
      errors: errors.length
    });
  } catch (err) {
    console.error('Cron reminders error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
