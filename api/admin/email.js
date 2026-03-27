const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');
const { sendEmail, welcomeEmail, reminderEmail, customEmail, escapeHtml } = require('../_lib/email');
const { logActivity } = require('../_lib/activity');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  try {
    var body = req.body;
    var type = body.type; // 'welcome', 'reminder', 'custom', 'broadcast'

    if (type === 'welcome') {
      // Send welcome email to a specific user
      if (!body.userId) return sendError(res, 400, 'userId required');
      var rows = await sql`SELECT name, email FROM users WHERE id = ${body.userId}`;
      if (!rows.length) return sendError(res, 404, 'User not found');

      var tpl = welcomeEmail(rows[0].name);
      await sendEmail({ to: rows[0].email, subject: tpl.subject, html: tpl.html, firstName: rows[0].name });
      await sql`UPDATE users SET last_email_sent = now() WHERE id = ${body.userId}`;
      logActivity(sql, ctx.userId, { action: 'send_welcome', targetType: 'user', targetId: body.userId, targetLabel: rows[0].email, details: 'Welcome email sent' });

      return res.status(200).json({ success: true, sent: 1 });
    }

    if (type === 'reminder') {
      // Send reminder to a specific user
      if (!body.userId) return sendError(res, 400, 'userId required');
      var rows2 = await sql`
        SELECT u.name, u.email, COALESCE(s.current_streak, 0) as current_streak
        FROM users u LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.id = ${body.userId}
      `;
      if (!rows2.length) return sendError(res, 404, 'User not found');

      var tpl2 = reminderEmail(rows2[0].name, rows2[0].current_streak);
      await sendEmail({ to: rows2[0].email, subject: tpl2.subject, html: tpl2.html, firstName: rows2[0].name });
      await sql`UPDATE users SET last_email_sent = now() WHERE id = ${body.userId}`;
      logActivity(sql, ctx.userId, { action: 'send_reminder', targetType: 'user', targetId: body.userId, targetLabel: rows2[0].email, details: 'Reminder email sent' });

      return res.status(200).json({ success: true, sent: 1 });
    }

    if (type === 'custom') {
      // Send custom email to specific users or all
      if (!body.subject || !body.body) return sendError(res, 400, 'subject and body required');

      var recipients;
      if (body.userIds && body.userIds.length > 0) {
        recipients = await sql`SELECT id, name, email FROM users WHERE id = ANY(${body.userIds})`;
      } else {
        // Broadcast to all non-opted-out users
        recipients = await sql`SELECT id, name, email FROM users WHERE email_opt_out = false`;
      }

      var sent = 0;
      var errors = [];
      for (var i = 0; i < recipients.length; i++) {
        try {
          var recipientName = recipients[i].name || '';
          var recipientEmail = recipients[i].email || '';
          var personalizedSubject = body.subject.replace(/\{\{name\}\}/g, recipientName).replace(/\{\{email\}\}/g, recipientEmail);
          var personalizedBody = body.body.replace(/\{\{name\}\}/g, escapeHtml(recipientName)).replace(/\{\{email\}\}/g, escapeHtml(recipientEmail));

          var htmlBody = '<h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 16px;">' + escapeHtml(personalizedSubject) + '</h1>' +
            '<div style="color:#b0b0b0;font-size:15px;line-height:1.7;">' + personalizedBody + '</div>';
          var tpl3 = customEmail(personalizedSubject, htmlBody);

          await sendEmail({ to: recipientEmail, subject: tpl3.subject, html: tpl3.html });
          await sql`UPDATE users SET last_email_sent = now() WHERE id = ${recipients[i].id}`;
          sent++;
        } catch (emailErr) {
          errors.push({ email: recipients[i].email, error: emailErr.message });
        }
      }

      logActivity(sql, ctx.userId, { action: 'send_custom_email', targetType: 'email', targetId: null, targetLabel: body.subject, details: 'Sent to ' + sent + '/' + recipients.length + ' recipients' });

      return res.status(200).json({ success: true, sent: sent, total: recipients.length, errors: errors });
    }

    if (type === 'broadcast_reminders') {
      // Send reminders to all users who haven't checked in today and haven't opted out
      var usersToRemind = await sql`
        SELECT u.id, u.name, u.email, COALESCE(s.current_streak, 0) as current_streak
        FROM users u
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.email_opt_out = false
          AND u.id NOT IN (SELECT user_id FROM checkins WHERE date = CURRENT_DATE)
      `;

      var sent2 = 0;
      var errors2 = [];
      for (var j = 0; j < usersToRemind.length; j++) {
        try {
          var r = usersToRemind[j];
          var tpl4 = reminderEmail(r.name, r.current_streak);
          await sendEmail({ to: r.email, subject: tpl4.subject, html: tpl4.html });
          await sql`UPDATE users SET last_email_sent = now() WHERE id = ${r.id}`;
          sent2++;
        } catch (emailErr2) {
          errors2.push({ email: usersToRemind[j].email, error: emailErr2.message });
        }
      }

      logActivity(sql, ctx.userId, { action: 'broadcast_reminders', targetType: 'email', targetId: null, targetLabel: 'Daily reminders', details: 'Sent to ' + sent2 + '/' + usersToRemind.length + ' users' });

      return res.status(200).json({ success: true, sent: sent2, total: usersToRemind.length, errors: errors2 });
    }

    return sendError(res, 400, 'Invalid email type. Use: welcome, reminder, custom, broadcast_reminders');
  } catch (err) {
    console.error('Admin email error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
