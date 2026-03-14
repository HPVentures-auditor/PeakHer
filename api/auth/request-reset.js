var crypto = require('crypto');
var { getDb } = require('../_lib/db');
var { sendError } = require('../_lib/auth');
var { sendEmail, escapeHtml } = require('../_lib/email');

// In-memory rate limiting: 3 requests per email per hour
var resetAttempts = new Map();
var RESET_WINDOW_MS = 60 * 60 * 1000;
var RESET_MAX_ATTEMPTS = 3;

function checkResetRateLimit(email) {
  var now = Date.now();
  var key = email.toLowerCase().trim();
  var record = resetAttempts.get(key);
  if (!record || now - record.windowStart > RESET_WINDOW_MS) {
    resetAttempts.set(key, { windowStart: now, count: 1 });
    return true;
  }
  record.count++;
  if (record.count > RESET_MAX_ATTEMPTS) return false;
  return true;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var body = req.body;
  var email = (body.email || '').toLowerCase().trim();

  if (!email || email.indexOf('@') === -1) {
    return sendError(res, 400, 'A valid email address is required');
  }

  // Rate limit by email
  if (!checkResetRateLimit(email)) {
    return sendError(res, 429, 'Too many reset requests. Please try again later.');
  }

  var successMsg = "If an account with that email exists, we've sent a reset link.";

  var sql = getDb();

  try {
    // Look up user by email (case-insensitive)
    var rows = await sql`SELECT id, name, email FROM users WHERE LOWER(email) = ${email}`;

    if (!rows.length) {
      // Don't leak whether email exists — return success either way
      return res.status(200).json({ success: true, message: successMsg });
    }

    var user = rows[0];

    // Generate reset token (valid 24h)
    var token = crypto.randomBytes(32).toString('hex');
    var expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`UPDATE users SET reset_token = ${token}, reset_token_expires = ${expires.toISOString()} WHERE id = ${user.id}`;

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

    return res.status(200).json({ success: true, message: successMsg });
  } catch (err) {
    console.error('Password reset request error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
