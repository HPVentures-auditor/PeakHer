/**
 * Daily check-in reminder cron job.
 * Triggered by Vercel Cron at 2:00 PM UTC (roughly morning US time).
 * Protected by CRON_SECRET to prevent external calls.
 *
 * Now includes a mini cycle-phase briefing in reminder emails for users
 * who have cycle tracking enabled.
 */
const { getDb } = require('../_lib/db');
const { sendEmail, reminderEmail, briefingReminderEmail } = require('../_lib/email');
const { sendPushToUser } = require('../_lib/push');
const { getMiniPhraseBriefing } = require('../briefing');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret (Vercel sets this header automatically for cron jobs)
  var authHeader = req.headers['authorization'];
  var cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured — rejecting request');
    return res.status(500).json({ error: 'Cron not configured' });
  }
  if (authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var sql = getDb();

  try {
    var today = new Date().toISOString().split('T')[0];

    // Find users who haven't checked in today and haven't opted out.
    // Also join cycle_profiles so we can include a mini briefing.
    var users = await sql`
      SELECT
        u.id, u.name, u.email,
        COALESCE(s.current_streak, 0) as current_streak,
        cp.last_period_start,
        cp.average_cycle_length,
        cp.tracking_enabled
      FROM users u
      LEFT JOIN streaks s ON s.user_id = u.id
      LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
      WHERE u.email_opt_out = false
        AND u.id NOT IN (SELECT user_id FROM checkins WHERE date = CURRENT_DATE)
    `;

    var sent = 0;
    var errors = [];

    for (var i = 0; i < users.length; i++) {
      try {
        var u = users[i];

        // Try to generate a mini phase briefing for cycle-tracking users
        var miniBriefing = null;
        if (u.tracking_enabled && u.last_period_start) {
          var periodStr = u.last_period_start instanceof Date
            ? u.last_period_start.toISOString().split('T')[0]
            : String(u.last_period_start);
          miniBriefing = getMiniPhraseBriefing(periodStr, u.average_cycle_length || 28, today);
        }

        var tpl;
        if (miniBriefing) {
          tpl = briefingReminderEmail(u.name, u.current_streak, miniBriefing);
        } else {
          tpl = reminderEmail(u.name, u.current_streak);
        }

        await sendEmail({ to: u.email, subject: tpl.subject, html: tpl.html });
        await sql`UPDATE users SET last_email_sent = now() WHERE id = ${u.id}`;
        sent++;
      } catch (emailErr) {
        errors.push({ email: users[i].email, error: emailErr.message });
      }
    }

    // Send push notifications to the same users
    var pushSent = 0;
    var pushErrors = 0;
    for (var j = 0; j < users.length; j++) {
      try {
        var pu = users[j];
        var streakCount = pu.current_streak || 0;

        // Include phase info in push notification if available
        var pushBody;
        var miniBriefingPush = null;
        if (pu.tracking_enabled && pu.last_period_start) {
          var periodStrPush = pu.last_period_start instanceof Date
            ? pu.last_period_start.toISOString().split('T')[0]
            : String(pu.last_period_start);
          miniBriefingPush = getMiniPhraseBriefing(periodStrPush, pu.average_cycle_length || 28, today);
        }

        if (miniBriefingPush) {
          pushBody = miniBriefingPush.phaseEmoji + ' ' + miniBriefingPush.miniPhrase;
        } else if (streakCount > 0) {
          pushBody = 'You\'re on a ' + streakCount + '-day streak. Keep it going!';
        } else {
          pushBody = 'Start a new streak today — one check-in is all it takes.';
        }

        var pushResult = await sendPushToUser(sql, pu.id, {
          title: 'Time for your check-in',
          body: pushBody,
          url: '/app/#checkin'
        });
        pushSent += pushResult.sent;
      } catch (pushErr) {
        pushErrors++;
        console.error('Cron push error for user', users[j].id, pushErr.message);
      }
    }

    console.log('Cron reminders: email sent ' + sent + '/' + users.length + ', errors: ' + errors.length);
    console.log('Cron reminders: push sent ' + pushSent + ', push errors: ' + pushErrors);

    return res.status(200).json({
      success: true,
      sent: sent,
      total: users.length,
      errors: errors.length,
      pushSent: pushSent,
      pushErrors: pushErrors
    });
  } catch (err) {
    console.error('Cron reminders error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
