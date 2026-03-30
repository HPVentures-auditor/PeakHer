/**
 * PeakHer SMS Subscribe / Unsubscribe
 *
 * POST /api/sms/subscribe - Add phone number + send OTP
 * PUT  /api/sms/subscribe - Update SMS preferences (time, timezone, enabled)
 * DELETE /api/sms/subscribe - Remove phone number, unsubscribe
 *
 * Auth: JWT required.
 */

var { getDb } = require('../_lib/db');
var { getUserId, sendError } = require('../_lib/auth');
var { sendSMS } = require('../_lib/twilio');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  // ── POST: Add phone number and send verification OTP ──────────────────
  if (req.method === 'POST') {
    try {
      var phone = req.body && req.body.phoneNumber;

      if (!phone || typeof phone !== 'string') {
        return sendError(res, 400, 'Phone number is required');
      }

      // Normalize: strip everything except digits and leading +
      phone = phone.replace(/[^\d+]/g, '');
      if (!phone.startsWith('+')) {
        // Assume US if no country code
        if (phone.length === 10) phone = '+1' + phone;
        else if (phone.length === 11 && phone.startsWith('1')) phone = '+' + phone;
        else return sendError(res, 400, 'Please include country code (e.g. +15551234567)');
      }

      // Basic E.164 validation
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        return sendError(res, 400, 'Invalid phone number format. Use E.164 format (e.g. +15551234567)');
      }

      // Check if phone is already used by another user
      var existing = await sql`
        SELECT id FROM users WHERE phone_number = ${phone} AND id != ${userId}
      `;
      if (existing.length > 0) {
        return sendError(res, 409, 'This phone number is already linked to another account');
      }

      // Generate 6-digit OTP
      var code = String(Math.floor(100000 + Math.random() * 900000));
      var expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Rate limit: max 3 codes per hour for this user
      var recentCodes = await sql`
        SELECT COUNT(*) as count FROM sms_verification_codes
        WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '1 hour'
      `;
      if (parseInt(recentCodes[0].count) >= 3) {
        return sendError(res, 429, 'Too many verification attempts. Try again in an hour.');
      }

      // Save phone to user (unverified)
      await sql`
        UPDATE users SET phone_number = ${phone}, phone_verified = false, sms_enabled = false
        WHERE id = ${userId}
      `;

      // Save OTP code
      await sql`
        INSERT INTO sms_verification_codes (user_id, phone_number, code, expires_at)
        VALUES (${userId}, ${phone}, ${code}, ${expiresAt.toISOString()})
      `;

      // Send OTP via SMS
      var message = 'Your PeakHer verification code is: ' + code + '\n\nThis code expires in 10 minutes.';
      await sendSMS(phone, message);

      return res.status(200).json({
        success: true,
        message: 'Verification code sent to ' + maskPhone(phone)
      });
    } catch (err) {
      console.error('SMS subscribe POST error:', err.message);
      return sendError(res, 500, 'Failed to send verification code');
    }
  }

  // ── PUT: Update SMS preferences ──────────────────────────────────────
  if (req.method === 'PUT') {
    try {
      var body = req.body || {};

      // Validate inputs
      if (body.smsEnabled !== undefined && typeof body.smsEnabled !== 'boolean') {
        return sendError(res, 400, 'smsEnabled must be a boolean');
      }
      if (body.smsBriefingTime !== undefined) {
        if (typeof body.smsBriefingTime !== 'string' || !/^\d{2}:\d{2}$/.test(body.smsBriefingTime)) {
          return sendError(res, 400, 'smsBriefingTime must be in HH:MM format');
        }
        var parts = body.smsBriefingTime.split(':');
        var hh = parseInt(parts[0], 10);
        var mm = parseInt(parts[1], 10);
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
          return sendError(res, 400, 'Invalid time value');
        }
      }
      if (body.smsTimezone !== undefined) {
        if (typeof body.smsTimezone !== 'string' || body.smsTimezone.length > 60) {
          return sendError(res, 400, 'Invalid timezone');
        }
      }

      // Check user has verified phone before enabling
      if (body.smsEnabled === true) {
        var userCheck = await sql`
          SELECT phone_number, phone_verified FROM users WHERE id = ${userId}
        `;
        if (userCheck.length === 0 || !userCheck[0].phone_verified || !userCheck[0].phone_number) {
          return sendError(res, 400, 'Verify your phone number first before enabling SMS');
        }
      }

      // Build update
      if (body.smsEnabled !== undefined) {
        await sql`UPDATE users SET sms_enabled = ${body.smsEnabled} WHERE id = ${userId}`;
      }
      if (body.smsBriefingTime !== undefined) {
        await sql`UPDATE users SET sms_briefing_time = ${body.smsBriefingTime} WHERE id = ${userId}`;
      }
      if (body.smsTimezone !== undefined) {
        await sql`UPDATE users SET sms_timezone = ${body.smsTimezone} WHERE id = ${userId}`;
      }

      // Fetch updated state
      var updated = await sql`
        SELECT phone_number, phone_verified, sms_enabled, sms_briefing_time, sms_timezone
        FROM users WHERE id = ${userId}
      `;
      var u = updated[0];

      return res.status(200).json({
        success: true,
        smsSettings: {
          phoneNumber: maskPhone(u.phone_number),
          phoneVerified: u.phone_verified,
          smsEnabled: u.sms_enabled,
          smsBriefingTime: u.sms_briefing_time,
          smsTimezone: u.sms_timezone
        }
      });
    } catch (err) {
      console.error('SMS subscribe PUT error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── DELETE: Remove phone number and unsubscribe ────────────────────────
  if (req.method === 'DELETE') {
    try {
      await sql`
        UPDATE users SET
          phone_number = NULL,
          phone_verified = false,
          sms_enabled = false
        WHERE id = ${userId}
      `;

      // Clean up verification codes
      await sql`DELETE FROM sms_verification_codes WHERE user_id = ${userId}`;

      // Clean up conversation state
      await sql`DELETE FROM sms_conversation_state WHERE user_id = ${userId}`;

      return res.status(200).json({ success: true, message: 'Phone number removed and SMS unsubscribed' });
    } catch (err) {
      console.error('SMS subscribe DELETE error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── GET: Fetch current SMS settings ────────────────────────────────────
  if (req.method === 'GET') {
    try {
      var user = await sql`
        SELECT phone_number, phone_verified, sms_enabled, sms_briefing_time, sms_timezone
        FROM users WHERE id = ${userId}
      `;
      if (user.length === 0) return sendError(res, 404, 'User not found');

      var u = user[0];
      return res.status(200).json({
        phoneNumber: u.phone_number ? maskPhone(u.phone_number) : null,
        hasPhone: !!u.phone_number,
        phoneVerified: u.phone_verified,
        smsEnabled: u.sms_enabled,
        smsBriefingTime: u.sms_briefing_time,
        smsTimezone: u.sms_timezone
      });
    } catch (err) {
      console.error('SMS subscribe GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};


// ── Helpers ─────────────────────────────────────────────────────────────────

function maskPhone(phone) {
  if (!phone) return null;
  // Show last 4 digits: +1***1234
  if (phone.length > 4) {
    return phone.substring(0, phone.length > 6 ? 2 : 1) +
      '***' +
      phone.substring(phone.length - 4);
  }
  return '****';
}
