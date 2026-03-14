const { requireAdmin } = require('../_lib/admin');
const { sendError } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var ctx = await requireAdmin(req, res);
  if (!ctx) return;
  var sql = ctx.sql;

  var type = req.query.type || 'users';

  try {
    if (type === 'checkins') {
      return await exportCheckins(sql, res);
    }
    return await exportUsers(sql, res);
  } catch (err) {
    console.error('Admin export error:', err.message);
    return sendError(res, 500, 'Server error');
  }
};

async function exportUsers(sql, res) {
  var rows = await sql`
    SELECT u.name, u.email, u.email_opt_out, u.created_at,
           s.last_checkin_date,
           COALESCE(s.current_streak, 0) as current_streak,
           COALESCE(s.longest_streak, 0) as longest_streak,
           (SELECT COUNT(*)::int FROM checkins WHERE user_id = u.id) as checkin_count
    FROM users u
    LEFT JOIN streaks s ON s.user_id = u.id
    ORDER BY u.created_at DESC
  `;

  var headers = ['Name', 'Email', 'Joined', 'Last Check-in', 'Current Streak', 'Longest Streak', 'Total Check-ins', 'Email Opt-out'];
  var csvRows = [headers.join(',')];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    csvRows.push([
      escapeCsv(r.name),
      escapeCsv(r.email),
      escapeCsv(formatDate(r.created_at)),
      escapeCsv(formatDate(r.last_checkin_date)),
      r.current_streak,
      r.longest_streak,
      r.checkin_count,
      r.email_opt_out ? 'Yes' : 'No'
    ].join(','));
  }

  return sendCsv(res, 'peakher-users.csv', csvRows.join('\n'));
}

async function exportCheckins(sql, res) {
  var rows = await sql`
    SELECT c.date, u.name, u.email,
           c.energy, c.confidence, c.sleep_quality, c.stress_level, c.notes
    FROM checkins c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.date DESC, u.name ASC
  `;

  var headers = ['Date', 'User Name', 'User Email', 'Energy', 'Confidence', 'Sleep Quality', 'Stress Level', 'Notes'];
  var csvRows = [headers.join(',')];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    csvRows.push([
      escapeCsv(formatDate(r.date)),
      escapeCsv(r.name),
      escapeCsv(r.email),
      r.energy != null ? r.energy : '',
      r.confidence != null ? r.confidence : '',
      r.sleep_quality != null ? r.sleep_quality : '',
      r.stress_level != null ? r.stress_level : '',
      escapeCsv(r.notes)
    ].join(','));
  }

  return sendCsv(res, 'peakher-checkins.csv', csvRows.join('\n'));
}

function sendCsv(res, filename, content) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  return res.status(200).send(content);
}

function escapeCsv(value) {
  if (value == null) return '';
  var str = String(value);
  if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d).split('T')[0];
}
