const { getDb } = require('./_lib/db');
const { getUserId, sendError } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const [user] = await sql`
        SELECT id, name, email, personas, onboarding_complete, role, created_at
        FROM users WHERE id = ${userId}
      `;
      if (!user) return sendError(res, 404, 'User not found');

      const [cycleProfile] = await sql`
        SELECT tracking_enabled, average_cycle_length, last_period_start,
               cycle_date_confidence
        FROM cycle_profiles WHERE user_id = ${userId}
      `;

      const [streak] = await sql`
        SELECT current_streak, longest_streak, last_checkin_date
        FROM streaks WHERE user_id = ${userId}
      `;

      const [countResult] = await sql`
        SELECT COUNT(*) as count FROM checkins WHERE user_id = ${userId}
      `;

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          personas: user.personas,
          onboardingComplete: user.onboarding_complete,
          role: user.role || 'user',
          createdAt: user.created_at
        },
        cycleProfile: cycleProfile ? {
          trackingEnabled: cycleProfile.tracking_enabled,
          averageCycleLength: cycleProfile.average_cycle_length,
          lastPeriodStart: cycleProfile.last_period_start,
          cycleDateConfidence: cycleProfile.cycle_date_confidence || 'estimated',
          coachVoice: cycleProfile.coach_voice || 'sassy'
        } : null,
        streak: streak ? {
          current: streak.current_streak,
          longest: streak.longest_streak,
          lastCheckinDate: streak.last_checkin_date
        } : null,
        checkinCount: parseInt(countResult.count)
      });
    } catch (err) {
      console.error('User GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, personas, cycleProfile, coachVoice } = req.body;

      // Validate PUT inputs
      if (name != null) {
        if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 200) {
          return sendError(res, 400, 'Name must be a non-empty string of at most 200 characters');
        }
      }
      if (personas != null) {
        if (!Array.isArray(personas) || personas.length > 20) {
          return sendError(res, 400, 'Personas must be an array of at most 20 items');
        }
        for (var i = 0; i < personas.length; i++) {
          if (typeof personas[i] !== 'string' || personas[i].length > 100) {
            return sendError(res, 400, 'Each persona must be a string of at most 100 characters');
          }
        }
      }
      if (coachVoice != null) {
        var validVoices = ['sassy', 'scientific', 'spiritual', 'hype'];
        if (validVoices.indexOf(coachVoice) === -1) {
          return sendError(res, 400, 'Coach voice must be one of: sassy, scientific, spiritual, hype');
        }
      }
      if (cycleProfile != null) {
        if (typeof cycleProfile !== 'object') {
          return sendError(res, 400, 'Cycle profile must be an object');
        }
        if (cycleProfile.averageCycleLength != null) {
          var acl = Number(cycleProfile.averageCycleLength);
          if (!Number.isFinite(acl) || acl < 15 || acl > 60) {
            return sendError(res, 400, 'Average cycle length must be between 15 and 60');
          }
        }
        if (cycleProfile.cycleDateConfidence != null) {
          var validConfidence = ['exact', 'estimated'];
          if (validConfidence.indexOf(cycleProfile.cycleDateConfidence) === -1) {
            return sendError(res, 400, 'Cycle date confidence must be one of: exact, estimated');
          }
        }
      }

      if (name) {
        await sql`UPDATE users SET name = ${name.trim()} WHERE id = ${userId}`;
      }
      if (personas) {
        await sql`UPDATE users SET personas = ${personas} WHERE id = ${userId}`;
      }
      if (coachVoice) {
        await sql`UPDATE cycle_profiles SET coach_voice = ${coachVoice}, updated_at = now() WHERE user_id = ${userId}`;
      }
      if (cycleProfile) {
        var confidence = cycleProfile.cycleDateConfidence || 'estimated';
        await sql`
          UPDATE cycle_profiles SET
            tracking_enabled = ${cycleProfile.trackingEnabled || false},
            average_cycle_length = ${cycleProfile.averageCycleLength || 28},
            last_period_start = ${cycleProfile.lastPeriodStart || null},
            cycle_date_confidence = ${confidence},
            updated_at = now()
          WHERE user_id = ${userId}
        `;
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('User PUT error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
