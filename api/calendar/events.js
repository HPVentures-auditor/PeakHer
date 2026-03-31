const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

var VALID_TYPES = ['meeting', 'presentation', 'call', 'deadline', 'focus', 'personal', 'workout', 'social', 'travel', 'other'];

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  // ── GET — list calendar events by date range ─────────────────────
  if (req.method === 'GET') {
    try {
      var start = req.query.start;
      var end = req.query.end;
      var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

      if (!start || !end) {
        return sendError(res, 400, 'start and end query params required (YYYY-MM-DD)');
      }

      var rows = await sql`
        SELECT id, external_id, title, description, start_time, end_time,
               is_all_day, event_type, estimated_importance, attendee_count,
               location, synced_from, created_at
        FROM calendar_events
        WHERE user_id = ${userId}
          AND start_time >= ${start}
          AND start_time <= ${end + 'T23:59:59Z'}
        ORDER BY start_time ASC
        LIMIT ${limit}
      `;

      var events = rows.map(formatEvent);
      return res.status(200).json({ events: events });
    } catch (err) {
      console.error('Calendar events GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── POST — create a manual calendar event ────────────────────────
  if (req.method === 'POST') {
    try {
      var body = req.body;
      var title = body.title;
      var startTime = body.startTime;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return sendError(res, 400, 'Title is required');
      }
      if (title.length > 500) {
        return sendError(res, 400, 'Title must be at most 500 characters');
      }
      if (!startTime) {
        return sendError(res, 400, 'startTime is required (ISO 8601)');
      }

      var eventType = body.eventType || 'meeting';
      if (VALID_TYPES.indexOf(eventType) === -1) {
        eventType = 'other';
      }

      var importance = body.importance != null ? Number(body.importance) : estimateImportance(title, body.attendeeCount || 1, eventType);
      if (!Number.isFinite(importance) || importance < 1 || importance > 10) importance = 5;
      importance = Math.round(importance);

      var attendeeCount = body.attendeeCount != null ? Math.max(1, Math.round(Number(body.attendeeCount))) : 1;

      var [created] = await sql`
        INSERT INTO calendar_events (user_id, title, description, start_time, end_time,
          is_all_day, event_type, estimated_importance, attendee_count, location, synced_from)
        VALUES (${userId}, ${title.trim()}, ${body.description || null}, ${startTime},
          ${body.endTime || null}, ${body.isAllDay || false}, ${eventType},
          ${importance}, ${attendeeCount}, ${body.location || null}, 'manual')
        RETURNING id, external_id, title, description, start_time, end_time,
          is_all_day, event_type, estimated_importance, attendee_count,
          location, synced_from, created_at
      `;

      return res.status(201).json(formatEvent(created));
    } catch (err) {
      console.error('Calendar events POST error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── PUT — update a calendar event ────────────────────────────────
  if (req.method === 'PUT') {
    try {
      var body = req.body;
      var eventId = body.id;
      if (!eventId) return sendError(res, 400, 'Event id is required');

      var fields = {};
      if (body.title != null) fields.title = body.title.trim();
      if (body.startTime != null) fields.start_time = body.startTime;
      if (body.endTime != null) fields.end_time = body.endTime;
      if (body.eventType != null) fields.event_type = VALID_TYPES.indexOf(body.eventType) !== -1 ? body.eventType : 'other';
      if (body.importance != null) fields.estimated_importance = Math.round(Math.max(1, Math.min(10, Number(body.importance))));
      if (body.attendeeCount != null) fields.attendee_count = Math.max(1, Math.round(Number(body.attendeeCount)));
      if (body.location != null) fields.location = body.location;
      if (body.description != null) fields.description = body.description;
      if (body.isAllDay != null) fields.is_all_day = !!body.isAllDay;

      if (Object.keys(fields).length === 0) {
        return sendError(res, 400, 'No fields to update');
      }

      // Build dynamic SET clause — Neon tagged templates don't support dynamic columns,
      // so we fetch, merge, and replace
      var existing = await sql`
        SELECT * FROM calendar_events WHERE id = ${eventId} AND user_id = ${userId}
      `;
      if (existing.length === 0) return sendError(res, 404, 'Event not found');

      var merged = Object.assign({}, existing[0], fields);

      var [updated] = await sql`
        UPDATE calendar_events SET
          title = ${merged.title},
          description = ${merged.description},
          start_time = ${merged.start_time},
          end_time = ${merged.end_time},
          is_all_day = ${merged.is_all_day},
          event_type = ${merged.event_type},
          estimated_importance = ${merged.estimated_importance},
          attendee_count = ${merged.attendee_count},
          location = ${merged.location}
        WHERE id = ${eventId} AND user_id = ${userId}
        RETURNING id, external_id, title, description, start_time, end_time,
          is_all_day, event_type, estimated_importance, attendee_count,
          location, synced_from, created_at
      `;

      return res.status(200).json(formatEvent(updated));
    } catch (err) {
      console.error('Calendar events PUT error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── DELETE — remove a calendar event ─────────────────────────────
  if (req.method === 'DELETE') {
    try {
      var eventId = req.query.id;
      if (!eventId) return sendError(res, 400, 'Event id is required');

      var result = await sql`
        DELETE FROM calendar_events WHERE id = ${Number(eventId)} AND user_id = ${userId}
        RETURNING id
      `;

      if (result.length === 0) return sendError(res, 404, 'Event not found');
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Calendar events DELETE error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};

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

function estimateImportance(title, attendeeCount, eventType) {
  var score = 5;
  var lower = title.toLowerCase();

  // High-stakes keywords
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
