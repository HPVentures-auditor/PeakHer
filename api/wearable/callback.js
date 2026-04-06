/**
 * GET /api/wearable/callback?provider=whoop|oura|garmin&code=...&state=...
 *
 * Handles OAuth callback for all wearable providers.
 * Garmin uses oauth_token + oauth_verifier instead of code.
 */
const { getDb } = require('../_lib/db');
const { sendError } = require('../_lib/auth');
const whoop = require('../_lib/whoop');
const oura = require('../_lib/oura');
const garmin = require('../_lib/garmin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  var sql = getDb();

  try {
    var provider = (req.query.provider || '').toLowerCase();
    var stateParam = req.query.state || '';

    // For Whoop/Oura, state contains { userId, provider }
    // For Garmin, we look up the pending connection by oauth_token
    var userId, tokens;

    if (provider === 'garmin' || req.query.oauth_verifier) {
      // Garmin OAuth 1.0a callback
      var oauthToken = req.query.oauth_token;
      var oauthVerifier = req.query.oauth_verifier;

      if (!oauthToken || !oauthVerifier) {
        return redirectWithError(res, 'Missing Garmin auth parameters');
      }

      // Find the pending connection with this request token
      var pending = await sql`
        SELECT id, user_id, oauth_token_secret, metadata
        FROM wearable_connections
        WHERE provider = 'garmin' AND sync_status = 'pending_auth'
          AND metadata->>'requestToken' = ${oauthToken}
        LIMIT 1
      `;

      if (pending.length === 0) {
        return redirectWithError(res, 'Garmin auth session expired');
      }

      userId = pending[0].user_id;
      var tokenSecret = pending[0].oauth_token_secret;

      var garminTokens = await garmin.exchangeVerifier(oauthToken, tokenSecret, oauthVerifier);

      await sql`
        UPDATE wearable_connections
        SET access_token = ${garminTokens.accessToken},
            oauth_token_secret = ${garminTokens.accessTokenSecret},
            sync_status = 'connected',
            metadata = '{}',
            updated_at = now()
        WHERE id = ${pending[0].id}
      `;
    } else {
      // Whoop / Oura OAuth 2.0 callback
      var code = req.query.code;
      if (!code || !stateParam) {
        return redirectWithError(res, 'Missing auth code');
      }

      var stateData;
      try {
        stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      } catch (e) {
        return redirectWithError(res, 'Invalid state parameter');
      }

      userId = stateData.userId;
      provider = stateData.provider;

      if (provider === 'whoop') {
        tokens = await whoop.exchangeCode(code);
      } else if (provider === 'oura') {
        tokens = await oura.exchangeCode(code);
      } else {
        return redirectWithError(res, 'Unknown provider: ' + provider);
      }

      // Upsert the connection
      await sql`
        INSERT INTO wearable_connections (user_id, provider, access_token, refresh_token, token_expires_at, sync_status)
        VALUES (${userId}, ${provider}, ${tokens.accessToken}, ${tokens.refreshToken},
                ${tokens.expiresAt.toISOString()}, 'connected')
        ON CONFLICT (user_id, provider) DO UPDATE SET
          access_token = ${tokens.accessToken},
          refresh_token = ${tokens.refreshToken},
          token_expires_at = ${tokens.expiresAt.toISOString()},
          sync_status = 'connected',
          updated_at = now()
      `;
    }

    // Determine redirect source
    var source = 'web';
    if (req.query.oauth_verifier) {
      // Garmin — check metadata for source
      var garminConn = await sql`
        SELECT metadata FROM wearable_connections
        WHERE user_id = ${userId} AND provider = 'garmin' AND sync_status = 'connected'
        LIMIT 1
      `;
      if (garminConn.length > 0 && garminConn[0].metadata && garminConn[0].metadata.source) {
        source = garminConn[0].metadata.source;
      }
    } else if (stateParam) {
      try {
        var sd = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
        if (sd.source) source = sd.source;
      } catch (e) { /* ignore */ }
    }

    // Redirect back to app
    if (source === 'native') {
      return res.writeHead(302, { Location: 'peakher://wearable-connected?provider=' + (provider || 'garmin') }).end();
    }
    return res.writeHead(302, { Location: '/app/#settings?wearable=' + (provider || 'garmin') + '&connected=1' }).end();
  } catch (err) {
    console.error('Wearable callback error:', err);
    return redirectWithError(res, 'Connection failed');
  }
};

function redirectWithError(res, msg) {
  return res.writeHead(302, { Location: '/app/#settings?wearable_error=' + encodeURIComponent(msg) }).end();
}
