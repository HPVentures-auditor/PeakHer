const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');
const { sendEmail, escapeHtml } = require('../_lib/email');
const { logActivity } = require('../_lib/activity');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  var userId = req.query.id;
  if (!userId) return sendError(res, 400, 'User ID required');

  // GET — single user detail
  if (req.method === 'GET') {
    try {
      var rows = await sql`
        SELECT u.id, u.name, u.email, u.personas, u.is_admin, u.email_opt_out,
               u.onboarding_complete, u.created_at,
               cp.tracking_enabled, cp.average_cycle_length, cp.last_period_start,
               s.current_streak, s.longest_streak, s.last_checkin_date
        FROM users u
        LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.id = ${userId}
      `;
      if (!rows.length) return sendError(res, 404, 'User not found');
      var u = rows[0];

      var checkins = await sql`
        SELECT date, energy, confidence, sleep_quality, stress_level, notes, created_at
        FROM checkins WHERE user_id = ${userId}
        ORDER BY date DESC LIMIT 30
      `;

      var countResult = await sql`SELECT COUNT(*)::int as count FROM checkins WHERE user_id = ${userId}`;

      return res.status(200).json({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          personas: u.personas,
          isAdmin: u.is_admin,
          emailOptOut: u.email_opt_out,
          onboardingComplete: u.onboarding_complete,
          createdAt: u.created_at
        },
        cycleProfile: {
          trackingEnabled: u.tracking_enabled,
          averageCycleLength: u.average_cycle_length,
          lastPeriodStart: u.last_period_start
        },
        streak: {
          current: u.current_streak || 0,
          longest: u.longest_streak || 0,
          lastCheckinDate: u.last_checkin_date
        },
        checkinCount: countResult[0].count,
        recentCheckins: checkins.map(function (c) {
          var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
          return {
            date: dateStr,
            energy: c.energy,
            confidence: c.confidence,
            sleepQuality: c.sleep_quality,
            stressLevel: c.stress_level,
            notes: c.notes
          };
        })
      });
    } catch (err) {
      console.error('Admin user GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // PUT — update user
  if (req.method === 'PUT') {
    try {
      var body = req.body;

      // Update name
      if (body.name != null) {
        if (typeof body.name !== 'string' || body.name.trim().length === 0) {
          return sendError(res, 400, 'Name must be a non-empty string');
        }
        await sql`UPDATE users SET name = ${body.name.trim()} WHERE id = ${userId}`;
      }

      // Update email
      if (body.email != null) {
        var newEmail = body.email.toLowerCase().trim();
        if (!newEmail || newEmail.indexOf('@') === -1) {
          return sendError(res, 400, 'Invalid email address');
        }
        // Check for duplicates
        var existing = await sql`SELECT id FROM users WHERE email = ${newEmail} AND id != ${userId}`;
        if (existing.length > 0) {
          return sendError(res, 409, 'Email already in use by another account');
        }
        await sql`UPDATE users SET email = ${newEmail} WHERE id = ${userId}`;
      }

      // Toggle email opt-out
      if (body.emailOptOut != null) {
        await sql`UPDATE users SET email_opt_out = ${!!body.emailOptOut} WHERE id = ${userId}`;
      }

      // Reset password (admin sets a new password directly)
      if (body.newPassword != null) {
        if (typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
          return sendError(res, 400, 'Password must be at least 8 characters');
        }
        var hash = await bcrypt.hash(body.newPassword, 10);
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
      }

      // Log activity
      var changes = [];
      if (body.name != null) changes.push('name');
      if (body.email != null) changes.push('email');
      if (body.newPassword != null) changes.push('password');
      if (body.emailOptOut != null) changes.push('email_opt_out');
      logActivity(sql, ctx.userId, { action: 'edit_user', targetType: 'user', targetId: userId, targetLabel: body.email || body.name || userId, details: 'Updated: ' + changes.join(', ') });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Admin user PUT error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // DELETE — delete user and all their data
  if (req.method === 'DELETE') {
    try {
      // Prevent self-deletion
      if (String(userId) === String(ctx.userId)) {
        return sendError(res, 400, 'Cannot delete your own account');
      }

      await sql`DELETE FROM checkins WHERE user_id = ${userId}`;
      await sql`DELETE FROM streaks WHERE user_id = ${userId}`;
      await sql`DELETE FROM cycle_profiles WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;

      logActivity(sql, ctx.userId, { action: 'delete_user', targetType: 'user', targetId: userId, targetLabel: userId, details: 'Account permanently deleted' });

      return res.status(200).json({ success: true, deleted: userId });
    } catch (err) {
      console.error('Admin user DELETE error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // POST — special actions (password reset email)
  if (req.method === 'POST') {
    try {
      var action = req.body.action;

      if (action === 'send_password_reset') {
        var userRows = await sql`SELECT name, email FROM users WHERE id = ${userId}`;
        if (!userRows.length) return sendError(res, 404, 'User not found');
        var user = userRows[0];

        // Generate reset token (valid 24h)
        var token = crypto.randomBytes(32).toString('hex');
        var expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await sql`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
        `.catch(function() {});
        // Run as separate statements for Neon compatibility
        await sql`UPDATE users SET reset_token = ${token}, reset_token_expires = ${expires.toISOString()} WHERE id = ${userId}`;

        var resetUrl = 'https://peakher.ai/reset-password/?token=' + token;

        var emailHtml = '<!DOCTYPE html>' +
          '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
          '<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
          '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">' +
            '<div style="text-align:center;margin-bottom:32px;">' +
              '<span style="font-size:15px;font-weight:800;letter-spacing:4px;color:#2d8a8a;text-transform:uppercase;">PEAKHER</span>' +
            '</div>' +
            '<div style="background:#0f2035;border-radius:12px;padding:32px 24px;border:1px solid rgba(255,255,255,0.06);">' +
              '<h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 12px;">Reset Your Password</h1>' +
              '<p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 20px;">' +
                'Hi ' + escapeHtml(user.name) + ', we received a request to reset your password. Click the button below to choose a new one.' +
              '</p>' +
              '<div style="text-align:center;margin-bottom:20px;">' +
                '<a href="' + resetUrl + '" style="display:inline-block;background:#E87461;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Reset Password</a>' +
              '</div>' +
              '<p style="color:#999;font-size:13px;line-height:1.5;">This link expires in 24 hours. If you didn\'t request this, you can safely ignore this email.</p>' +
            '</div>' +
            '<div style="text-align:center;margin-top:32px;">' +
              '<p style="color:rgba(255,255,255,0.25);font-size:12px;">PeakHer &copy; 2026 High Performance Ventures LLC.</p>' +
            '</div>' +
          '</div>' +
          '</body></html>';

        await sendEmail({ to: user.email, subject: 'Reset your PeakHer password', html: emailHtml });
        await sql`UPDATE users SET last_email_sent = now() WHERE id = ${userId}`;

        logActivity(sql, ctx.userId, { action: 'send_password_reset', targetType: 'user', targetId: userId, targetLabel: user.email, details: 'Password reset email sent' });

        return res.status(200).json({ success: true, message: 'Password reset email sent' });
      }

      return sendError(res, 400, 'Unknown action');
    } catch (err) {
      console.error('Admin user POST error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
