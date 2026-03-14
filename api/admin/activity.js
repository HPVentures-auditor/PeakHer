const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');
const { logActivity } = require('../_lib/activity');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;
  var adminId = ctx.userId;

  // GET — list recent activity log entries (paginated)
  if (req.method === 'GET') {
    try {
      var page = Math.max(1, parseInt(req.query.page) || 1);
      var limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      var offset = (page - 1) * limit;

      var countResult = await sql`SELECT COUNT(*)::int as total FROM admin_activity_log`;
      var total = countResult[0].total;

      var rows = await sql`
        SELECT a.id, a.admin_id, u.email as admin_email,
               a.action, a.target_type, a.target_id, a.target_label,
               a.details, a.created_at
        FROM admin_activity_log a
        LEFT JOIN users u ON u.id = a.admin_id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return res.status(200).json({
        entries: rows.map(function (r) {
          return {
            id: r.id,
            adminId: r.admin_id,
            adminEmail: r.admin_email,
            action: r.action,
            targetType: r.target_type,
            targetId: r.target_id,
            targetLabel: r.target_label,
            details: r.details,
            createdAt: r.created_at
          };
        }),
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      console.error('Admin activity GET error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  // POST — log a new activity entry (called internally by other admin endpoints)
  if (req.method === 'POST') {
    try {
      var body = req.body;

      if (!body.action || typeof body.action !== 'string') {
        return sendError(res, 400, 'action is required');
      }

      await logActivity(sql, adminId, {
        action: body.action,
        targetType: body.targetType || null,
        targetId: body.targetId || null,
        targetLabel: body.targetLabel || null,
        details: body.details || null
      });

      return res.status(201).json({ success: true });
    } catch (err) {
      console.error('Admin activity POST error:', err.message);
      return sendError(res, 500, 'Server error');
    }
  }

  return sendError(res, 405, 'Method not allowed');
};
