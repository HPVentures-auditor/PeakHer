const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const { start, end } = req.query;
      let checkins;
      if (start && end) {
        checkins = await sql`
          SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes, created_at
          FROM checkins WHERE user_id = ${userId} AND date >= ${start} AND date <= ${end}
          ORDER BY date DESC
        `;
      } else {
        checkins = await sql`
          SELECT date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes, created_at
          FROM checkins WHERE user_id = ${userId}
          ORDER BY date DESC
        `;
      }

      // Convert to object keyed by date string for frontend compatibility
      const result = {};
      checkins.forEach(function(c) {
        var dateStr = c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date);
        result[dateStr] = {
          date: dateStr,
          energy: c.energy,
          confidence: c.confidence,
          sleepQuality: c.sleep_quality,
          stressLevel: c.stress_level,
          cycleDay: c.cycle_day,
          cyclePhase: c.cycle_phase,
          notes: c.notes,
          createdAt: c.created_at
        };
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error('Checkins GET error:', err);
      return sendError(res, 500, 'Server error');
    }
  }

  if (req.method === 'POST') {
    try {
      const { date, energy, confidence, sleepQuality, stressLevel, cycleDay, cyclePhase, notes } = req.body;

      if (!date || !energy || !confidence) {
        return sendError(res, 400, 'Date, energy, and confidence are required');
      }

      // Upsert: insert or update on conflict
      const [checkin] = await sql`
        INSERT INTO checkins (user_id, date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes)
        VALUES (${userId}, ${date}, ${energy}, ${confidence}, ${sleepQuality || null}, ${stressLevel || null}, ${cycleDay || null}, ${cyclePhase || null}, ${notes || null})
        ON CONFLICT (user_id, date) DO UPDATE SET
          energy = EXCLUDED.energy,
          confidence = EXCLUDED.confidence,
          sleep_quality = EXCLUDED.sleep_quality,
          stress_level = EXCLUDED.stress_level,
          cycle_day = EXCLUDED.cycle_day,
          cycle_phase = EXCLUDED.cycle_phase,
          notes = EXCLUDED.notes,
          created_at = now()
        RETURNING date, energy, confidence, sleep_quality, stress_level, cycle_day, cycle_phase, notes, created_at
      `;

      // Update streak
      await updateStreak(sql, userId, date);

      var dateStr = checkin.date instanceof Date ? checkin.date.toISOString().split('T')[0] : String(checkin.date);

      return res.status(200).json({
        date: dateStr,
        energy: checkin.energy,
        confidence: checkin.confidence,
        sleepQuality: checkin.sleep_quality,
        stressLevel: checkin.stress_level,
        cycleDay: checkin.cycle_day,
        cyclePhase: checkin.cycle_phase,
        notes: checkin.notes,
        createdAt: checkin.created_at
      });
    } catch (err) {
      console.error('Checkins POST error:', err);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};

async function updateStreak(sql, userId, dateStr) {
  // Get all check-in dates for user, ordered desc
  const dates = await sql`
    SELECT DISTINCT date FROM checkins WHERE user_id = ${userId} ORDER BY date DESC
  `;

  if (dates.length === 0) {
    await sql`
      UPDATE streaks SET current_streak = 0, last_checkin_date = NULL WHERE user_id = ${userId}
    `;
    return;
  }

  // Calculate current streak (consecutive days backward from most recent)
  var current = 1;
  for (var i = 1; i < dates.length; i++) {
    var prev = new Date(dates[i - 1].date);
    var curr = new Date(dates[i].date);
    var diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      current++;
    } else {
      break;
    }
  }

  var lastDate = dates[0].date instanceof Date ? dates[0].date.toISOString().split('T')[0] : String(dates[0].date);

  await sql`
    UPDATE streaks SET
      current_streak = ${current},
      longest_streak = GREATEST(longest_streak, ${current}),
      last_checkin_date = ${lastDate}
    WHERE user_id = ${userId}
  `;
}
