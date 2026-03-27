/**
 * PeakHer SMS Briefing Cron
 *
 * GET /api/cron/sms-briefings
 *
 * Triggered by Vercel Cron (every hour) to send daily SMS briefings
 * to users based on their preferred time and timezone.
 *
 * Strategy:
 *   - Runs hourly (e.g., at :00 each hour)
 *   - Queries users whose sms_briefing_time matches the current hour in their timezone
 *   - Sends condensed briefing via Twilio
 *   - Uses sms_log to prevent duplicate sends on the same day
 */

var { getDb } = require('../_lib/db');
var { sendSMS } = require('../_lib/twilio');
var { calculateCycleDay, getPhaseForCycleDay, PHASE_CONTENT } = require('../briefing');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret
  var authHeader = req.headers['authorization'];
  var cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return res.status(500).json({ error: 'Cron not configured' });
  }
  if (authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var sql = getDb();

  try {
    var now = new Date();
    var today = now.toISOString().split('T')[0];
    var currentUtcHour = now.getUTCHours();

    // Find SMS-enabled users whose briefing hour matches current UTC hour.
    // We compute the user's local hour from their timezone offset.
    // Since Neon supports AT TIME ZONE, use it to find matching users.
    var users = await sql`
      SELECT u.id, u.name, u.phone_number, u.sms_briefing_time, u.sms_timezone,
             cp.last_period_start, cp.average_cycle_length, cp.tracking_enabled,
             s.current_streak
      FROM users u
      LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
      LEFT JOIN streaks s ON s.user_id = u.id
      WHERE u.sms_enabled = true
        AND u.phone_verified = true
        AND u.phone_number IS NOT NULL
        AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(u.sms_timezone, 'America/New_York')))
            = CAST(SPLIT_PART(u.sms_briefing_time, ':', 1) AS INTEGER)
        AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(u.sms_timezone, 'America/New_York')))
            < 30
    `;

    // Filter out users who already received a briefing today
    var usersToSend = [];
    for (var i = 0; i < users.length; i++) {
      var alreadySent = await sql`
        SELECT id FROM sms_log
        WHERE user_id = ${users[i].id}
          AND direction = 'outbound'
          AND body LIKE '%energy (1-10)%'
          AND created_at >= ${today + 'T00:00:00Z'}
        LIMIT 1
      `;
      if (alreadySent.length === 0) {
        usersToSend.push(users[i]);
      }
    }

    var sent = 0;
    var errors = [];

    for (var j = 0; j < usersToSend.length; j++) {
      try {
        var u = usersToSend[j];
        var briefingText = buildSmsBriefing(u, today);
        var result = await sendSMS(u.phone_number, briefingText);

        // Log the send
        await sql`
          INSERT INTO sms_log (user_id, phone_number, direction, message_sid, body, status)
          VALUES (${u.id}, ${u.phone_number}, 'outbound', ${result.sid || null}, ${briefingText.substring(0, 1600)}, 'sent')
        `;
        sent++;
      } catch (err) {
        errors.push({ userId: usersToSend[j].id, error: err.message });
        console.error('SMS cron send error for user', usersToSend[j].id, err.message);
      }
    }

    console.log('SMS cron: matched ' + users.length + ' users, skipped ' +
      (users.length - usersToSend.length) + ' (already sent), sent ' +
      sent + ', errors ' + errors.length);

    return res.status(200).json({
      success: true,
      matched: users.length,
      skipped: users.length - usersToSend.length,
      sent: sent,
      errors: errors.length
    });
  } catch (err) {
    console.error('SMS cron error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};


// ── Briefing builder (same logic as send-briefing.js) ───────────────────────

function buildSmsBriefing(user, today) {
  var name = (user.name || '').split(' ')[0] || 'Hey';
  var streak = user.current_streak || 0;
  var greeting = 'Good morning';
  var trackingEnabled = user.tracking_enabled && user.last_period_start;

  if (trackingEnabled) {
    return buildCycleSmsBriefing(user, today, greeting, name, streak);
  } else {
    return buildGeneralSmsBriefing(today, greeting, name, streak);
  }
}

function buildCycleSmsBriefing(user, today, greeting, name, streak) {
  var periodStr = user.last_period_start instanceof Date
    ? user.last_period_start.toISOString().split('T')[0]
    : String(user.last_period_start);
  var cycleLength = user.average_cycle_length || 28;

  var cycleDay = calculateCycleDay(periodStr, cycleLength, today);
  if (!cycleDay) return buildGeneralSmsBriefing(today, greeting, name, streak);

  var phase = getPhaseForCycleDay(cycleDay, cycleLength);
  var content = PHASE_CONTENT[phase];
  if (!content) return buildGeneralSmsBriefing(today, greeting, name, streak);

  var recs = content.recommendations;

  var lines = [];
  lines.push(greeting + '! ' + content.phaseEmoji + ' Day ' + cycleDay + ' (' + content.phaseName + ')');
  lines.push('');

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

  if (streak > 0) {
    lines.push('');
    lines.push('\uD83D\uDD25 ' + streak + '-day streak!');
  }

  lines.push('');
  lines.push('Reply with your energy (1-10) to check in!');

  return lines.join('\n');
}

function buildGeneralSmsBriefing(today, greeting, name, streak) {
  var dayOfWeek = new Date(today + 'T12:00:00Z').getUTCDay();
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayEmojis = ['\uD83C\uDF1F', '\u26A1', '\uD83D\uDD25', '\uD83E\uDDED', '\uD83C\uDFAF', '\uD83C\uDF89', '\u2600\uFE0F'];

  var tips = {
    0: 'Today: Plan your week. Set intentions. Protect your energy for tomorrow.',
    1: 'Today: Tackle your hardest task first. Your willpower is freshest now.',
    2: 'Today: Peak productivity day. Block time for deep, creative work.',
    3: 'Today: Midweek check. Are you on track with what matters most?',
    4: 'Today: Close loops. Finish what you can before the weekend.',
    5: 'Today: Wrap up loose ends. Then disconnect and recharge.',
    6: 'Today: Rest and play. Your brain needs it to perform next week.'
  };

  var lines = [];
  lines.push(greeting + '! ' + dayEmojis[dayOfWeek] + ' Happy ' + dayNames[dayOfWeek] + '!');
  lines.push('');
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
  var firstSentence = text.split('.')[0];
  if (firstSentence.length > 80) {
    return firstSentence.substring(0, 77) + '...';
  }
  return firstSentence;
}
