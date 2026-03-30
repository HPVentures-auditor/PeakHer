/**
 * PeakHer SMS Send Briefing
 *
 * POST /api/sms/send-briefing
 *
 * Sends a condensed daily briefing via SMS to a specific user or all
 * SMS-subscribed users. Intended to be called by the cron job.
 *
 * Body: { userId?: string } - if omitted, sends to all SMS-enabled users.
 * Auth: CRON_SECRET or admin JWT.
 */

var { getDb } = require('../_lib/db');
var { getUserId, sendError } = require('../_lib/auth');
var { sendSMS } = require('../_lib/twilio');
var { getMiniPhraseBriefing, calculateCycleDay, getPhaseForCycleDay, PHASE_CONTENT } = require('../briefing');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  // Auth: accept CRON_SECRET or admin JWT
  var authHeader = req.headers['authorization'] || '';
  var cronSecret = process.env.CRON_SECRET;
  var isAuthed = false;

  if (cronSecret && authHeader === 'Bearer ' + cronSecret) {
    isAuthed = true;
  } else {
    var userId = getUserId(req);
    if (userId) {
      var sql = getDb();
      var admins = await sql`SELECT is_admin FROM users WHERE id = ${userId} AND is_admin = true`;
      if (admins.length > 0) isAuthed = true;
    }
  }

  if (!isAuthed) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();
  var targetUserId = req.body && req.body.userId;

  try {
    var users;
    if (targetUserId) {
      users = await sql`
        SELECT u.id, u.name, u.phone_number, u.sms_timezone,
               cp.last_period_start, cp.average_cycle_length, cp.tracking_enabled,
               s.current_streak, s.longest_streak
        FROM users u
        LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.id = ${targetUserId}
          AND u.phone_number IS NOT NULL
          AND u.phone_verified = true
          AND u.sms_enabled = true
      `;
    } else {
      users = await sql`
        SELECT u.id, u.name, u.phone_number, u.sms_timezone,
               cp.last_period_start, cp.average_cycle_length, cp.tracking_enabled,
               s.current_streak, s.longest_streak
        FROM users u
        LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.phone_number IS NOT NULL
          AND u.phone_verified = true
          AND u.sms_enabled = true
      `;
    }

    var sent = 0;
    var errors = [];

    for (var i = 0; i < users.length; i++) {
      try {
        var u = users[i];
        var briefingText = buildSmsBriefing(u);
        var result = await sendSMS(u.phone_number, briefingText);

        // Log the send
        await logSmsSend(sql, u.id, u.phone_number, result.sid || null, briefingText);
        sent++;
      } catch (err) {
        errors.push({ userId: users[i].id, error: err.message });
        console.error('SMS briefing send error for user', users[i].id, err.message);
      }
    }

    console.log('SMS briefings: sent ' + sent + '/' + users.length + ', errors: ' + errors.length);

    return res.status(200).json({
      success: true,
      sent: sent,
      total: users.length,
      errors: errors.length
    });
  } catch (err) {
    console.error('SMS send-briefing error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};


// ── Briefing builder ───────────────────────────────────────────────────────

function buildSmsBriefing(user) {
  var today = new Date().toISOString().split('T')[0];
  var name = (user.name || '').split(' ')[0] || 'Hey';
  var streak = user.current_streak || 0;

  // Greeting based on time
  var greeting = 'Good morning';

  var trackingEnabled = user.tracking_enabled && user.last_period_start;

  if (trackingEnabled) {
    return buildCycleSmsBriefing(user, today, greeting, name, streak);
  } else {
    return buildGeneralSmsBriefing(user, today, greeting, name, streak);
  }
}

function buildCycleSmsBriefing(user, today, greeting, name, streak) {
  var periodStr = user.last_period_start instanceof Date
    ? user.last_period_start.toISOString().split('T')[0]
    : String(user.last_period_start);
  var cycleLength = user.average_cycle_length || 28;

  var cycleDay = calculateCycleDay(periodStr, cycleLength, today);
  if (!cycleDay) return buildGeneralSmsBriefing(user, today, greeting, name, streak);

  var phase = getPhaseForCycleDay(cycleDay, cycleLength);
  var content = PHASE_CONTENT[phase];
  if (!content) return buildGeneralSmsBriefing(user, today, greeting, name, streak);

  // Pick variation
  var dayWithinPhase = cycleDay % content.headlines.length;
  var recs = content.recommendations;

  var lines = [];
  lines.push(greeting + '! ' + content.phaseEmoji + ' Day ' + cycleDay + ' (' + content.phaseName + ')');
  lines.push('');

  // Condensed recommendations
  if (recs.nutrition) {
    lines.push('\uD83C\uDF7D Eat: ' + condenseTip(recs.nutrition.doThis));
  }
  if (recs.fitness) {
    lines.push('\uD83D\uDCAA Move: ' + condenseTip(recs.fitness.doThis));
  }
  if (recs.work) {
    lines.push('\uD83D\uDCCB Focus: ' + condenseTip(recs.work.doThis));
  }
  if (recs.social) {
    lines.push('\uD83D\uDCAB Vibe: ' + condenseTip(recs.social.tip));
  }

  // Streak
  if (streak > 0) {
    lines.push('');
    lines.push('\uD83D\uDD25 ' + streak + '-day streak!');
  }

  // CTA
  lines.push('');
  lines.push('Reply with your energy (1-10) to check in!');

  return lines.join('\n');
}

function buildGeneralSmsBriefing(user, today, greeting, name, streak) {
  var dayOfWeek = new Date(today + 'T12:00:00Z').getUTCDay();
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayEmojis = ['\uD83C\uDF1F', '\u26A1', '\uD83D\uDD25', '\uD83E\uDDED', '\uD83C\uDFAF', '\uD83C\uDF89', '\u2600\uFE0F'];

  var lines = [];
  lines.push(greeting + '! ' + dayEmojis[dayOfWeek] + ' Happy ' + dayNames[dayOfWeek] + '!');
  lines.push('');

  // Day-specific tip
  var tips = {
    0: 'Today: Plan your week. Set intentions. Protect your energy for tomorrow.',
    1: 'Today: Tackle your hardest task first. Your willpower is freshest now.',
    2: 'Today: Peak productivity day. Block time for deep, creative work.',
    3: 'Today: Midweek check. Are you on track with what matters most?',
    4: 'Today: Close loops. Finish what you can before the weekend.',
    5: 'Today: Wrap up loose ends. Then disconnect and recharge.',
    6: 'Today: Rest and play. Your brain needs it to perform next week.'
  };

  lines.push(tips[dayOfWeek] || tips[1]);

  if (streak > 0) {
    lines.push('');
    lines.push('\uD83D\uDD25 ' + streak + '-day streak!');
  }

  lines.push('');
  lines.push('Reply with your energy (1-10) to check in!');

  return lines.join('\n');
}

function condenseTip(text) {
  if (!text) return '';
  // Take first sentence or first 80 chars
  var firstSentence = text.split('.')[0];
  if (firstSentence.length > 80) {
    return firstSentence.substring(0, 77) + '...';
  }
  return firstSentence;
}

async function logSmsSend(sql, userId, phone, sid, body) {
  try {
    await sql`
      INSERT INTO sms_log (user_id, phone_number, direction, message_sid, body, status)
      VALUES (${userId}, ${phone}, 'outbound', ${sid}, ${(body || '').substring(0, 1600)}, 'sent')
    `;
  } catch (err) {
    console.error('SMS log write failed:', err.message);
  }
}
