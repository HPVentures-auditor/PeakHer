/**
 * PeakHer Morning Push Notification Cron
 *
 * GET /api/cron/morning-notifications
 *
 * Triggered by Vercel Cron daily at 11 UTC (7 AM EST / EDT).
 * Sends a phase-specific "open loop" push notification from Dot
 * to every active user with a push subscription.
 *
 * Each notification gives just enough hormonal intelligence to
 * make the user NEED to open the app, without satisfying curiosity.
 */

var { getDb } = require('../_lib/db');
var { sendPushToUser } = require('../_lib/push');
var { getNotificationHook, getPhaseDisplayName } = require('../_lib/notification-hooks');
var emailBrief = require('../email-brief');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret (same pattern as email-briefings.js)
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

    // Fetch all active users who have:
    //   1. Push subscriptions
    //   2. Cycle tracking enabled with a last_period_start date
    var users = await sql`
      SELECT DISTINCT u.id, u.name,
             cp.last_period_start, cp.average_cycle_length
      FROM users u
      INNER JOIN push_subscriptions ps ON ps.user_id = u.id
      INNER JOIN cycle_profiles cp ON cp.user_id = u.id
      WHERE cp.tracking_enabled = true
        AND cp.last_period_start IS NOT NULL
    `;

    var sent = 0;
    var skipped = 0;
    var errors = [];

    for (var i = 0; i < users.length; i++) {
      var user = users[i];

      try {
        // Calculate cycle day and phase using the shared email-brief helpers
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

        // Get the last notification index for this user to avoid repeats
        var lastHookRows = await sql`
          SELECT last_hook_index, last_hook_phase
          FROM notification_state
          WHERE user_id = ${user.id}
          LIMIT 1
        `.catch(function () {
          // Table may not exist yet. Gracefully degrade.
          return [];
        });

        var lastIndex = null;
        var hookKey = null;
        if (lastHookRows && lastHookRows.length > 0) {
          hookKey = lastHookRows[0].last_hook_phase;
          // Only use lastIndex if the phase hasn't changed
          var currentHookKey = require('../_lib/notification-hooks').PHASE_TO_HOOK_KEY[phase] || 'rise';
          if (hookKey === currentHookKey) {
            lastIndex = lastHookRows[0].last_hook_index;
          }
        }

        // Generate the notification message
        var hook = getNotificationHook(phase, lastIndex);
        var phaseName = getPhaseDisplayName(phase);

        // Build push payload
        var payload = {
          title: 'Dot',
          body: hook.message,
          icon: '/app/icon-192.png',
          url: '/app/#checkin'
        };

        // Send push to all of this user's subscriptions
        var result = await sendPushToUser(sql, user.id, payload);

        if (result.sent > 0) {
          sent++;

          // Save the hook index so we don't repeat it tomorrow
          // Uses upsert: insert or update the notification_state row
          await sql`
            INSERT INTO notification_state (user_id, last_hook_index, last_hook_phase, last_sent_at)
            VALUES (${user.id}, ${hook.index}, ${hook.hookKey}, ${now.toISOString()})
            ON CONFLICT (user_id) DO UPDATE SET
              last_hook_index = EXCLUDED.last_hook_index,
              last_hook_phase = EXCLUDED.last_hook_phase,
              last_sent_at = EXCLUDED.last_sent_at
          `.catch(function (err) {
            // Non-critical. If the table doesn't exist, notifications still send.
            console.warn('Could not save notification state for user', user.id, err.message);
          });
        } else if (result.failed > 0) {
          errors.push({ userId: user.id, reason: 'all subscriptions failed' });
        } else {
          skipped++;
        }

      } catch (userErr) {
        errors.push({ userId: user.id, error: userErr.message });
        console.error('Morning notification error for user', user.id, userErr.message);
      }
    }

    console.log(
      'Morning notifications cron: ' + users.length + ' users, ' +
      sent + ' sent, ' + skipped + ' skipped, ' + errors.length + ' errors'
    );

    return res.status(200).json({
      ok: true,
      total: users.length,
      sent: sent,
      skipped: skipped,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('Morning notification cron error:', err.message);
    return res.status(500).json({ error: 'Cron failed', message: err.message });
  }
};
