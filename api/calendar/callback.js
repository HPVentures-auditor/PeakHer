var { getDb } = require('../_lib/db');
var { verifyToken, sendError } = require('../_lib/auth');
var { exchangeCode } = require('../_lib/google-calendar');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var code = req.query.code;
  var state = req.query.state;

  if (!code || !state) {
    return res.redirect('/app/#settings?calendar=error');
  }

  try {
    // Verify the state JWT to extract userId
    var decoded = verifyToken(state);
    if (!decoded || !decoded.userId) {
      return res.redirect('/app/#settings?calendar=error');
    }

    var userId = decoded.userId;
    var source = decoded.source || 'web';

    // Exchange authorization code for tokens
    var tokens = await exchangeCode(code);

    var sql = getDb();

    // Upsert into calendar_connections
    await sql`
      INSERT INTO calendar_connections (user_id, provider, access_token, refresh_token, token_expires_at, sync_status)
      VALUES (${userId}, 'google', ${tokens.accessToken}, ${tokens.refreshToken}, ${tokens.expiresAt.toISOString()}, 'connected')
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token = ${tokens.accessToken},
        refresh_token = ${tokens.refreshToken},
        token_expires_at = ${tokens.expiresAt.toISOString()},
        sync_status = 'connected',
        updated_at = now()
    `;

    // Trigger initial sync immediately
    try {
      var { syncCalendarForUser } = require('../_lib/google-calendar');
      if (typeof syncCalendarForUser === 'function') {
        await syncCalendarForUser(userId, sql);
      }
    } catch (syncErr) {
      // Non-fatal — cron will catch up
      console.error('Initial sync after connect:', syncErr.message);
    }

    // Redirect based on source
    if (source === 'native') {
      return res.redirect('peakher://calendar-connected');
    }
    return res.redirect('/app/#settings?calendar=connected');
  } catch (err) {
    console.error('Calendar callback error:', err.message);
    // Redirect based on source from query (fallback since state decode failed)
    return res.redirect('/app/#settings?calendar=error');
  }
};
