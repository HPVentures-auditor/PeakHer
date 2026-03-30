const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

var VALID_TYPES = ['win', 'challenge', 'flow'];

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  // ── GET - list events with optional filters ───────────────────────
  if (req.method === 'GET') {
    try {
      var start = req.query.start;
      var end = req.query.end;
      var type = req.query.type;
      var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

      var rows;

      if (start && end && type) {
        rows = await sql`
          SELECT id, type, title, notes, category, intensity, event_date, created_at
          FROM events
          WHERE user_id = ${userId}
            AND event_date >= ${start}
            AND event_date <= ${end}
            AND type = ${type}
          ORDER BY event_date DESC
          LIMIT ${limit}
        `;
      } else if (start && end) {
        rows = await sql`
          SELECT id, type, title, notes, category, intensity, event_date, created_at
          FROM events
          WHERE user_id = ${userId}
            AND event_date >= ${start}
            AND event_date <= ${end}
          ORDER BY event_date DESC
          LIMIT ${limit}
        `;
      } else if (type) {
        rows = await sql`
          SELECT id, type, title, notes, category, intensity, event_date, created_at
          FROM events
          WHERE user_id = ${userId}
            AND type = ${type}
          ORDER BY event_date DESC
          LIMIT ${limit}
        `;
      } else {
        rows = await sql`
          SELECT id, type, title, notes, category, intensity, event_date, created_at
          FROM events
          WHERE user_id = ${userId}
          ORDER BY event_date DESC
          LIMIT ${limit}
        `;
      }

      var events = rows.map(function (r) {
        var dateStr = r.event_date instanceof Date
          ? r.event_date.toISOString().split('T')[0]
          : String(r.event_date);
        return {
          id: r.id,
          type: r.type,
          title: r.title,
          notes: r.notes,
          category: r.category,
          intensity: r.intensity,
          eventDate: dateStr,
          createdAt: r.created_at
        };
      });

      return res.status(200).json({ events: events });
    } catch (err) {
      console.error('Events GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── POST - create a new event ─────────────────────────────────────
  if (req.method === 'POST') {
    try {
      var body = req.body;
      var evType = body.type;
      var title = body.title;
      var notes = body.notes || null;
      var category = body.category || null;
      var intensity = body.intensity != null ? body.intensity : null;
      var eventDate = body.eventDate || new Date().toISOString().split('T')[0];

      // Validate type
      if (!evType || VALID_TYPES.indexOf(evType) === -1) {
        return sendError(res, 400, 'Type must be one of: ' + VALID_TYPES.join(', '));
      }

      // Validate title
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return sendError(res, 400, 'Title is required');
      }
      if (title.length > 200) {
        return sendError(res, 400, 'Title must be at most 200 characters');
      }

      // Validate notes
      if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) {
        return sendError(res, 400, 'Notes must be a string of at most 2000 characters');
      }

      // Validate category
      if (category != null && (typeof category !== 'string' || category.length > 50)) {
        return sendError(res, 400, 'Category must be a string of at most 50 characters');
      }

      // Validate intensity
      if (intensity != null) {
        var numIntensity = Number(intensity);
        if (!Number.isFinite(numIntensity) || numIntensity < 1 || numIntensity > 10 || Math.floor(numIntensity) !== numIntensity) {
          return sendError(res, 400, 'Intensity must be an integer between 1 and 10');
        }
        intensity = numIntensity;
      }

      var [created] = await sql`
        INSERT INTO events (user_id, type, title, notes, category, intensity, event_date)
        VALUES (${userId}, ${evType}, ${title.trim()}, ${notes}, ${category}, ${intensity}, ${eventDate})
        RETURNING id, type, title, notes, category, intensity, event_date, created_at
      `;

      var dateStr = created.event_date instanceof Date
        ? created.event_date.toISOString().split('T')[0]
        : String(created.event_date);

      return res.status(201).json({
        id: created.id,
        type: created.type,
        title: created.title,
        notes: created.notes,
        category: created.category,
        intensity: created.intensity,
        eventDate: dateStr,
        createdAt: created.created_at
      });
    } catch (err) {
      console.error('Events POST error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // ── DELETE - remove an event by id ────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      var eventId = req.query.id;
      if (!eventId) {
        return sendError(res, 400, 'Event id is required');
      }

      var numId = Number(eventId);
      if (!Number.isFinite(numId) || numId < 1) {
        return sendError(res, 400, 'Invalid event id');
      }

      // Delete only if the event belongs to this user
      var result = await sql`
        DELETE FROM events WHERE id = ${numId} AND user_id = ${userId}
        RETURNING id
      `;

      if (result.length === 0) {
        return sendError(res, 404, 'Event not found');
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Events DELETE error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
