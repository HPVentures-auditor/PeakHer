/**
 * Helper to log admin activity from any endpoint.
 *
 * Usage:
 *   var { logActivity } = require('../_lib/activity');
 *   await logActivity(sql, adminUserId, {
 *     action: 'delete_user',
 *     targetType: 'user',
 *     targetId: '...',
 *     targetLabel: 'John Doe',
 *     details: 'Deleted account'
 *   });
 */

/**
 * Insert a row into admin_activity_log.
 * Fire-and-forget — never throws or blocks the parent request.
 *
 * @param {Function} sql  Neon tagged template function
 * @param {string}   adminId  UUID of the admin performing the action
 * @param {Object}   opts
 * @param {string}   opts.action       e.g. 'delete_user', 'update_user', 'send_email'
 * @param {string}   [opts.targetType] e.g. 'user', 'email', 'setting'
 * @param {string}   [opts.targetId]   ID of the affected resource
 * @param {string}   [opts.targetLabel] Human-readable label (name, email, etc.)
 * @param {string}   [opts.details]    Free-text description
 */
function logActivity(sql, adminId, opts) {
  var action = opts.action;
  var targetType = opts.targetType || null;
  var targetId = opts.targetId || null;
  var targetLabel = opts.targetLabel || null;
  var details = opts.details || null;

  // Fire-and-forget: return the promise but catch errors silently so the
  // caller's response is never delayed or broken by a logging failure.
  return sql`
    INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, target_label, details)
    VALUES (${adminId}, ${action}, ${targetType}, ${targetId}, ${targetLabel}, ${details})
  `.catch(function (err) {
    console.error('Activity log write failed:', err.message);
  });
}

module.exports = { logActivity };
