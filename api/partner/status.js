/**
 * GET /api/partner/status
 * Returns partnership status from the caller's perspective (works for both roles).
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    var [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user) return sendError(res, 404, 'User not found');

    if (user.role === 'user') {
      // Primary user — show full partnership details
      var [partnership] = await sql`
        SELECT p.*, u.name as partner_name, u.email as partner_email
        FROM partnerships p
        LEFT JOIN users u ON u.id = p.partner_user_id
        WHERE p.primary_user_id = ${userId} AND p.status IN ('pending', 'active')
        ORDER BY p.created_at DESC
        LIMIT 1
      `;

      if (!partnership) {
        return res.status(200).json({ hasPartnership: false });
      }

      return res.status(200).json({
        hasPartnership: true,
        status: partnership.status,
        partnerName: partnership.partner_name || null,
        inviteCode: partnership.status === 'pending' ? partnership.invite_code : undefined,
        inviteExpiresAt: partnership.status === 'pending' ? partnership.invite_expires_at : undefined,
        sharingPaused: partnership.sharing_paused,
        shareSettings: {
          phaseName: partnership.share_phase_name,
          energyLevel: partnership.share_energy_level,
          nutritionTips: partnership.share_nutrition_tips,
          emotionalWeather: partnership.share_emotional_weather
        },
        acceptedAt: partnership.accepted_at,
        createdAt: partnership.created_at
      });
    } else {
      // Partner user — show basic status
      var [partnerShip] = await sql`
        SELECT p.status, p.sharing_paused, u.name as primary_name
        FROM partnerships p
        JOIN users u ON u.id = p.primary_user_id
        WHERE p.partner_user_id = ${userId} AND p.status = 'active'
        LIMIT 1
      `;

      if (!partnerShip) {
        return res.status(200).json({ hasPartnership: false });
      }

      return res.status(200).json({
        hasPartnership: true,
        status: partnerShip.status,
        primaryName: (partnerShip.primary_name || '').split(' ')[0],
        sharingPaused: partnerShip.sharing_paused
      });
    }
  } catch (err) {
    console.error('Partner status error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
