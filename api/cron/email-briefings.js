/**
 * PeakHer Email Briefing Cron
 *
 * GET /api/cron/email-briefings
 *
 * Triggered by Vercel Cron daily at 11 UTC (7 AM EST).
 * Fetches all active users with cycle tracking enabled,
 * generates their personalized email brief, and sends it via Resend.
 */

var { getDb } = require('../_lib/db');
var { sendEmail } = require('../_lib/resend');
var emailBrief = require('../email-brief');

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

    // Fetch all active users with cycle tracking enabled and email
    // In the future, filter by email_brief_enabled preference
    var users = await sql`
      SELECT u.id, u.name, u.email,
             cp.last_period_start, cp.average_cycle_length, cp.tracking_enabled
      FROM users u
      LEFT JOIN cycle_profiles cp ON cp.user_id = u.id
      WHERE u.email IS NOT NULL
        AND cp.tracking_enabled = true
        AND cp.last_period_start IS NOT NULL
    `;

    var sent = 0;
    var skipped = 0;
    var errors = [];

    for (var i = 0; i < users.length; i++) {
      var user = users[i];
      try {
        // Calculate cycle info
        var lastPeriodStart = user.last_period_start instanceof Date
          ? user.last_period_start.toISOString().split('T')[0]
          : String(user.last_period_start);
        var cycleLength = user.average_cycle_length || 28;
        var cycleDay = emailBrief.calculateCycleDay(lastPeriodStart, cycleLength, today);

        if (!cycleDay) {
          skipped++;
          continue;
        }

        var phase = emailBrief.getPhaseForCycleDay(cycleDay, cycleLength);

        // Fetch today's check-in for this user
        var todayCheckins = await sql`
          SELECT energy, confidence, sleep_quality, stress_level, notes
          FROM checkins WHERE user_id = ${user.id} AND date = ${today} LIMIT 1
        `;
        var todayCheckin = todayCheckins.length > 0 ? todayCheckins[0] : null;

        // Fetch today's calendar events for this user
        var todayStart = today + 'T00:00:00Z';
        var todayEnd = today + 'T23:59:59Z';
        var todayEvents = [];
        try {
          todayEvents = await sql`
            SELECT title, start_time, end_time, event_type, estimated_importance, attendee_count, is_all_day
            FROM calendar_events
            WHERE user_id = ${user.id}
              AND start_time >= ${todayStart}
              AND start_time <= ${todayEnd}
            ORDER BY start_time ASC
          `;
        } catch (calErr) {
          // Calendar table may not exist, gracefully degrade
        }

        // Generate AI content
        var aiContent = await emailBrief.generateAIContent(phase, cycleDay, cycleLength, user.name, todayEvents, todayCheckin);
        if (!aiContent) {
          aiContent = emailBrief.getFallbackContent(phase);
        }

        // Ensure calendar items from events if AI didn't generate them
        if ((!aiContent.calendarItems || aiContent.calendarItems.length === 0) && todayEvents.length > 0) {
          aiContent.calendarItems = todayEvents.map(function(ev) {
            return {
              title: ev.title,
              time: ev.is_all_day ? 'All day' : emailBrief.formatEventTime(ev.start_time),
              energyTag: 'Neutral',
              advice: 'Check your briefing in the app for full phase-specific guidance.'
            };
          });
        }

        // Build the email
        var emailHtml = emailBrief.buildEmailHtml({
          phase: phase,
          cycleDay: cycleDay,
          cycleLength: cycleLength,
          userName: user.name,
          today: today,
          ai: aiContent
        });

        var subject = emailBrief.PHASE_SUBJECTS[phase] || 'Your Daily Brief from Dot';

        // Send the email
        var result = await sendEmail({
          to: user.email,
          subject: subject,
          html: emailHtml
        });

        if (result.skipped) {
          skipped++;
        } else if (result.error) {
          errors.push({ userId: user.id, email: user.email, error: result.error });
        } else {
          sent++;
        }
      } catch (userErr) {
        errors.push({ userId: user.id, error: userErr.message });
        console.error('Email cron error for user', user.id, userErr.message);
      }
    }

    console.log('Email cron: ' + users.length + ' users found, ' + sent + ' sent, ' + skipped + ' skipped, ' + errors.length + ' errors');

    return res.status(200).json({
      ok: true,
      total: users.length,
      sent: sent,
      skipped: skipped,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('Email briefing cron error:', err.message);
    return res.status(500).json({ error: 'Cron failed', message: err.message });
  }
};
