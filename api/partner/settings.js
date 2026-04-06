/**
 * PUT /api/partner/settings
 * Primary user updates sharing controls for partner.
 * Body: { sharingPaused?, sharePhaseName?, shareEnergyLevel?, shareNutritionTips?, shareEmotionalWeather? }
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var sql = getDb();

  try {
    // Verify caller is primary user
    var [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user || user.role !== 'user') {
      return sendError(res, 403, 'Only primary users can update partner settings');
    }

    var [partnership] = await sql`
      SELECT id, sharing_paused FROM partnerships
      WHERE primary_user_id = ${userId} AND status = 'active'
      LIMIT 1
    `;

    if (!partnership) {
      return sendError(res, 404, 'No active partnership found');
    }

    var body = req.body || {};
    var updates = [];
    var values = {};

    if (typeof body.sharingPaused === 'boolean') {
      values.sharing_paused = body.sharingPaused;
      if (body.sharingPaused && !partnership.sharing_paused) {
        values.paused_at = new Date().toISOString();
      }
    }
    if (typeof body.sharePhaseName === 'boolean') values.share_phase_name = body.sharePhaseName;
    if (typeof body.shareEnergyLevel === 'boolean') values.share_energy_level = body.shareEnergyLevel;
    if (typeof body.shareNutritionTips === 'boolean') values.share_nutrition_tips = body.shareNutritionTips;
    if (typeof body.shareEmotionalWeather === 'boolean') values.share_emotional_weather = body.shareEmotionalWeather;

    if (Object.keys(values).length === 0) {
      return sendError(res, 400, 'No valid settings to update');
    }

    // Build dynamic update
    var setClauses = Object.keys(values).map(function (key) {
      return key + ' = $' + key;
    });

    // Use parameterized update
    await sql`
      UPDATE partnerships SET
        sharing_paused = COALESCE(${values.sharing_paused ?? null}, sharing_paused),
        paused_at = COALESCE(${values.paused_at ?? null}, paused_at),
        share_phase_name = COALESCE(${values.share_phase_name ?? null}, share_phase_name),
        share_energy_level = COALESCE(${values.share_energy_level ?? null}, share_energy_level),
        share_nutrition_tips = COALESCE(${values.share_nutrition_tips ?? null}, share_nutrition_tips),
        share_emotional_weather = COALESCE(${values.share_emotional_weather ?? null}, share_emotional_weather),
        updated_at = now()
      WHERE id = ${partnership.id}
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Partner settings error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};
