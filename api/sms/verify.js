/**
 * PeakHer SMS Verify: OTP verification for phone number
 *
 * POST /api/sms/verify - Verify OTP code
 *
 * Body: { code: "123456" }
 * Auth: JWT required.
 */

var { getDb } = require('../_lib/db');
var { getUserId, sendError } = require('../_lib/auth');
var { sendSMS } = require('../_lib/twilio');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var code = req.body && req.body.code;
  if (!code || typeof code !== 'string' || code.length !== 6) {
    return sendError(res, 400, 'A 6-digit verification code is required');
  }

  var sql = getDb();

  try {
    // Get the most recent unexpired, unverified code for this user
    var codes = await sql`
      SELECT id, phone_number, code, expires_at, attempts
      FROM sms_verification_codes
      WHERE user_id = ${userId}
        AND verified = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (codes.length === 0) {
      return sendError(res, 400, 'No active verification code found. Request a new one.');
    }

    var record = codes[0];

    // Check max attempts (5)
    if (record.attempts >= 5) {
      return sendError(res, 429, 'Too many attempts. Request a new verification code.');
    }

    // Increment attempt count
    await sql`
      UPDATE sms_verification_codes SET attempts = attempts + 1 WHERE id = ${record.id}
    `;

    // Verify code
    if (record.code !== code.trim()) {
      var remaining = 4 - record.attempts;
      return sendError(res, 400, 'Incorrect code. ' + (remaining > 0 ? remaining + ' attempts remaining.' : 'Request a new code.'));
    }

    // Code matches: mark as verified
    await sql`UPDATE sms_verification_codes SET verified = true WHERE id = ${record.id}`;

    // Update user: mark phone as verified, enable SMS
    await sql`
      UPDATE users SET
        phone_verified = true,
        sms_enabled = true
      WHERE id = ${userId}
    `;

    // Send welcome SMS
    var welcomeMsg = 'Phone verified! You\'re all set for PeakHer SMS briefings.\n\n' +
      'You\'ll receive your daily briefing each morning. Reply with your energy (1-10) anytime to check in.\n\n' +
      'Text HELP for commands, STOP to unsubscribe.';
    await sendSMS(record.phone_number, welcomeMsg);

    // Fetch updated settings
    var user = await sql`
      SELECT phone_number, phone_verified, sms_enabled, sms_briefing_time, sms_timezone
      FROM users WHERE id = ${userId}
    `;
    var u = user[0];

    return res.status(200).json({
      success: true,
      message: 'Phone number verified! SMS briefings are now enabled.',
      smsSettings: {
        phoneNumber: maskPhone(u.phone_number),
        phoneVerified: u.phone_verified,
        smsEnabled: u.sms_enabled,
        smsBriefingTime: u.sms_briefing_time,
        smsTimezone: u.sms_timezone
      }
    });
  } catch (err) {
    console.error('SMS verify error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};

function maskPhone(phone) {
  if (!phone) return null;
  if (phone.length > 4) {
    return phone.substring(0, phone.length > 6 ? 2 : 1) +
      '***' +
      phone.substring(phone.length - 4);
  }
  return '****';
}
