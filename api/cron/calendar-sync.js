/**
 * PeakHer Calendar Sync Cron
 *
 * GET /api/cron/calendar-sync
 *
 * Triggered by Vercel Cron to sync Google Calendar events for all
 * connected users. Iterates all active calendar_connections and
 * runs the sync logic inline for each.
 */

var { getDb } = require('../_lib/db');
var { getValidToken, fetchEvents } = require('../_lib/google-calendar');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify cron secret if configured
  var authHeader = req.headers['authorization'];
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var sql = getDb();

  try {
    // Fetch all active Google calendar connections
    var connections = await sql`
      SELECT * FROM calendar_connections
      WHERE provider = 'google'
        AND sync_status != 'disconnected'
    `;

    var synced = 0;
    var errors = 0;
    var details = [];

    for (var i = 0; i < connections.length; i++) {
      var connection = connections[i];
      var userId = connection.user_id;

      try {
        var count = await syncConnectionEvents(connection, sql);
        synced++;
        details.push({ userId: userId, synced: count });
        console.log('Calendar cron: synced ' + count + ' events for user ' + userId);
      } catch (err) {
        errors++;
        details.push({ userId: userId, error: err.message });
        console.error('Calendar cron: error for user ' + userId + ':', err.message);

        // Mark connection as errored so we don't keep retrying a broken one
        await sql`
          UPDATE calendar_connections SET
            sync_status = 'error',
            updated_at = now()
          WHERE id = ${connection.id}
        `.catch(function (dbErr) {
          console.error('Calendar cron: failed to update sync_status for connection ' + connection.id, dbErr.message);
        });
      }
    }

    console.log('Calendar cron: processed ' + connections.length + ' connections, synced ' + synced + ', errors ' + errors);

    return res.status(200).json({
      synced: synced,
      errors: errors,
      total: connections.length,
      details: details
    });
  } catch (err) {
    console.error('Calendar cron error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};


/**
 * Sync events for a single calendar connection.
 * @param {object} connection — calendar_connections row
 * @param {function} sql — Neon query function
 * @returns {number} count of synced events
 */
async function syncConnectionEvents(connection, sql) {
  var userId = connection.user_id;

  // Get a valid access token (refreshes if expired)
  var accessToken = await getValidToken(connection, sql);

  // Build fetch options
  var opts = {};
  var isIncremental = false;

  if (connection.sync_token) {
    opts.syncToken = connection.sync_token;
    isIncremental = true;
  } else {
    var now = new Date();
    var timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    opts.timeMin = timeMin.toISOString();
    opts.timeMax = timeMax.toISOString();
  }

  var result = await fetchEvents(accessToken, opts);

  // If sync token expired (410 Gone), retry with full sync
  if (result.fullSyncRequired && isIncremental) {
    console.log('Calendar cron: sync token expired for user ' + userId + ', doing full sync');
    var now2 = new Date();
    var timeMin2 = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1000);
    var timeMax2 = new Date(now2.getTime() + 14 * 24 * 60 * 60 * 1000);
    result = await fetchEvents(accessToken, {
      timeMin: timeMin2.toISOString(),
      timeMax: timeMax2.toISOString()
    });
  }

  var events = result.events;
  var count = 0;

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var eventType = classifyEvent(ev.title);
    var importance = estimateImportance(ev.title, ev.attendeeCount || 1, eventType);

    // Check if event already exists (manual upsert for partial index)
    var existing = await sql`
      SELECT id FROM calendar_events
      WHERE user_id = ${userId} AND external_id = ${ev.externalId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE calendar_events SET
          title = ${ev.title},
          description = ${ev.description},
          start_time = ${ev.startTime},
          end_time = ${ev.endTime},
          is_all_day = ${ev.isAllDay},
          event_type = ${eventType},
          estimated_importance = ${importance},
          attendee_count = ${ev.attendeeCount || 1},
          location = ${ev.location},
          synced_from = 'google',
          raw_data = ${JSON.stringify(ev.rawData)}
        WHERE id = ${existing[0].id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        INSERT INTO calendar_events (user_id, external_id, title, description, start_time,
          end_time, is_all_day, event_type, estimated_importance, attendee_count,
          location, synced_from, raw_data)
        VALUES (${userId}, ${ev.externalId}, ${ev.title}, ${ev.description},
          ${ev.startTime}, ${ev.endTime}, ${ev.isAllDay}, ${eventType},
          ${importance}, ${ev.attendeeCount || 1}, ${ev.location}, 'google',
          ${JSON.stringify(ev.rawData)})
      `;
    }

    count++;
  }

  // Update connection with new sync token and status
  var newSyncToken = result.nextSyncToken || connection.sync_token;
  await sql`
    UPDATE calendar_connections SET
      sync_token = ${newSyncToken},
      last_synced = now(),
      sync_status = 'synced',
      updated_at = now()
    WHERE id = ${connection.id}
  `;

  return count;
}


// ── Helpers ──────────────────────────────────────────────────────────

function classifyEvent(title) {
  var lower = (title || '').toLowerCase();

  var categories = [
    { keywords: ['standup', 'sync', 'scrum', 'daily', 'weekly', 'check-in', '1:1', 'one on one'], type: 'meeting' },
    { keywords: ['present', 'pitch', 'demo', 'keynote', 'talk'], type: 'presentation' },
    { keywords: ['call', 'phone', 'ring'], type: 'call' },
    { keywords: ['deadline', 'due', 'submit', 'deliver'], type: 'deadline' },
    { keywords: ['focus', 'block', 'deep work', 'heads down'], type: 'focus' },
    { keywords: ['lunch', 'dinner', 'coffee', 'happy hour', 'drinks', 'party'], type: 'social' },
    { keywords: ['workout', 'gym', 'run', 'yoga', 'pilates', 'class'], type: 'workout' },
    { keywords: ['flight', 'airport', 'hotel', 'travel'], type: 'travel' },
    { keywords: ['birthday', 'doctor', 'dentist', 'appointment', 'personal'], type: 'personal' }
  ];

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    for (var j = 0; j < cat.keywords.length; j++) {
      if (lower.indexOf(cat.keywords[j]) !== -1) {
        return cat.type;
      }
    }
  }

  return 'meeting';
}

function estimateImportance(title, attendeeCount, eventType) {
  var score = 5;
  var lower = (title || '').toLowerCase();

  var highKeywords = ['board', 'investor', 'pitch', 'presentation', 'keynote', 'interview', 'review', 'launch', 'deadline', 'final', 'closing', 'negotiat'];
  var medKeywords = ['planning', 'strategy', 'budget', 'quarterly', 'team lead', 'client', 'partner'];
  var lowKeywords = ['standup', 'sync', 'catch up', 'catchup', 'coffee', 'lunch', '1:1', 'one on one', 'check-in'];

  for (var i = 0; i < highKeywords.length; i++) {
    if (lower.indexOf(highKeywords[i]) !== -1) { score = 8; break; }
  }
  if (score === 5) {
    for (var j = 0; j < medKeywords.length; j++) {
      if (lower.indexOf(medKeywords[j]) !== -1) { score = 7; break; }
    }
  }
  if (score === 5) {
    for (var k = 0; k < lowKeywords.length; k++) {
      if (lower.indexOf(lowKeywords[k]) !== -1) { score = 3; break; }
    }
  }

  if (attendeeCount >= 10) score = Math.min(10, score + 2);
  else if (attendeeCount >= 5) score = Math.min(10, score + 1);

  if (eventType === 'presentation') score = Math.min(10, score + 1);
  if (eventType === 'deadline') score = Math.min(10, score + 1);
  if (eventType === 'personal' || eventType === 'social') score = Math.max(1, score - 1);

  return Math.max(1, Math.min(10, score));
}
