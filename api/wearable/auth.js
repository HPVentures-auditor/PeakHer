/**
 * GET /api/wearable/auth?provider=whoop|oura|garmin
 * Starts OAuth flow for the specified wearable provider.
 */
const { getDb } = require('../_lib/db');
const { getUserId, sendError } = require('../_lib/auth');
const whoop = require('../_lib/whoop');
const oura = require('../_lib/oura');
const garmin = require('../_lib/garmin');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var userId = getUserId(req);
  if (!userId) return sendError(res, 401, 'Unauthorized');

  var provider = (req.query.provider || '').toLowerCase();
  if (!['whoop', 'oura', 'garmin'].includes(provider)) {
    return sendError(res, 400, 'Invalid provider. Must be whoop, oura, or garmin');
  }

  try {
    var sql = getDb();
    var source = req.query.source || 'web';
    var state = Buffer.from(JSON.stringify({ userId: userId, provider: provider, source: source })).toString('base64url');
    var url;

    if (provider === 'whoop') {
      url = whoop.getAuthUrl(state);
    } else if (provider === 'oura') {
      url = oura.getAuthUrl(state);
    } else if (provider === 'garmin') {
      // Garmin needs a request token first (OAuth 1.0a)
      var reqToken = await garmin.getRequestToken();

      // Store the request token secret temporarily so callback can use it
      await sql`
        INSERT INTO wearable_connections (user_id, provider, oauth_token_secret, sync_status, metadata)
        VALUES (${userId}, 'garmin', ${reqToken.oauthTokenSecret}, 'pending_auth',
                ${JSON.stringify({ requestToken: reqToken.oauthToken, source: source })})
        ON CONFLICT (user_id, provider) DO UPDATE SET
          oauth_token_secret = ${reqToken.oauthTokenSecret},
          sync_status = 'pending_auth',
          metadata = ${JSON.stringify({ requestToken: reqToken.oauthToken, source: source })},
          updated_at = now()
      `;

      url = garmin.getAuthUrl(reqToken.oauthToken);
    }

    return res.status(200).json({ url: url });
  } catch (err) {
    console.error('Wearable auth error:', err);
    return sendError(res, 500, 'Failed to start ' + provider + ' auth');
  }
};
