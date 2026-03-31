/**
 * PeakHer Calendar Sync
 *
 * POST /api/calendar/sync
 *
 * Syncs Google Calendar events into calendar_events table.
 * Supports incremental sync (via syncToken) and full sync fallback.
 */

var { getDb } = require('../_lib/db');
var { getUserId, sendError } = require('../_lib/auth');
var { getValidToken, fetchEvents } = require('../_lib/google-calendar');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var result = await syncCalendarForUser(userId, sql);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Calendar sync error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};

/**
 * Core sync logic — reused by the cron job.
 * @param {number} userId
 * @param {function} sql — Neon query function
 * @returns {{ synced: number, events: Array }}
 */
async function syncCalendarForUser(userId, sql) {
  // Fetch user's Google calendar connection
  var connections = await sql`
    SELECT * FROM calendar_connections
    WHERE user_id = ${userId} AND provider = 'google'
    LIMIT 1
  `;

  if (connections.length === 0) {
    throw Object.assign(new Error('No calendar connected'), { statusCode: 400 });
  }

  var connection = connections[0];

  // Get a valid access token (refreshes if expired)
  var accessToken = await getValidToken(connection, sql);

  // Build fetch options
  var opts = {};
  var isIncremental = false;

  if (connection.sync_token) {
    // Incremental sync — only changes since last sync
    opts.syncToken = connection.sync_token;
    isIncremental = true;
  } else {
    // Full sync — 7 days back, 14 days forward
    var now = new Date();
    var timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    opts.timeMin = timeMin.toISOString();
    opts.timeMax = timeMax.toISOString();
  }

  var result = await fetchEvents(accessToken, opts);

  // If sync token expired (410 Gone), retry with full sync
  if (result.fullSyncRequired && isIncremental) {
    console.log('Calendar sync: sync token expired for user ' + userId + ', doing full sync');
    var now2 = new Date();
    var timeMin2 = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1000);
    var timeMax2 = new Date(now2.getTime() + 14 * 24 * 60 * 60 * 1000);
    result = await fetchEvents(accessToken, {
      timeMin: timeMin2.toISOString(),
      timeMax: timeMax2.toISOString()
    });
  }

  var events = result.events;
  var synced = 0;
  var formattedEvents = [];

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var eventType = classifyEvent(ev.title);
    var importance = estimateImportance(ev.title, ev.attendeeCount || 1, eventType);

    // Check if event already exists (manual upsert since we use a partial index)
    var existing = await sql`
      SELECT id FROM calendar_events
      WHERE user_id = ${userId} AND external_id = ${ev.externalId}
      LIMIT 1
    `;

    var saved;
    if (existing.length > 0) {
      // Update existing event
      var rows = await sql`
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
        RETURNING id, external_id, title, description, start_time, end_time,
          is_all_day, event_type, estimated_importance, attendee_count,
          location, synced_from, created_at
      `;
      saved = rows[0];
    } else {
      // Insert new event
      var rows2 = await sql`
        INSERT INTO calendar_events (user_id, external_id, title, description, start_time,
          end_time, is_all_day, event_type, estimated_importance, attendee_count,
          location, synced_from, raw_data)
        VALUES (${userId}, ${ev.externalId}, ${ev.title}, ${ev.description},
          ${ev.startTime}, ${ev.endTime}, ${ev.isAllDay}, ${eventType},
          ${importance}, ${ev.attendeeCount || 1}, ${ev.location}, 'google',
          ${JSON.stringify(ev.rawData)})
        RETURNING id, external_id, title, description, start_time, end_time,
          is_all_day, event_type, estimated_importance, attendee_count,
          location, synced_from, created_at
      `;
      saved = rows2[0];
    }

    synced++;
    formattedEvents.push(formatEvent(saved));
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

  console.log('Calendar sync: synced ' + synced + ' events for user ' + userId);

  return { synced: synced, events: formattedEvents };
}


// ── Helpers ──────────────────────────────────────────────────────────

function formatEvent(r) {
  return {
    id: r.id,
    externalId: r.external_id,
    title: r.title,
    description: r.description,
    startTime: r.start_time,
    endTime: r.end_time,
    isAllDay: r.is_all_day,
    eventType: r.event_type,
    importance: r.estimated_importance,
    attendeeCount: r.attendee_count,
    location: r.location,
    syncedFrom: r.synced_from,
    createdAt: r.created_at
  };
}

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

  // Attendee count boosts importance
  if (attendeeCount >= 10) score = Math.min(10, score + 2);
  else if (attendeeCount >= 5) score = Math.min(10, score + 1);

  // Event type adjustments
  if (eventType === 'presentation') score = Math.min(10, score + 1);
  if (eventType === 'deadline') score = Math.min(10, score + 1);
  if (eventType === 'personal' || eventType === 'social') score = Math.max(1, score - 1);

  return Math.max(1, Math.min(10, score));
}

// Export sync function for use by cron job
module.exports.syncCalendarForUser = syncCalendarForUser;
