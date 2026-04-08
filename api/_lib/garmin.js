/**
 * Garmin Health API helper -- OAuth 1.0a + webhook push data.
 *
 * Env vars required:
 *   GARMIN_CONSUMER_KEY
 *   GARMIN_CONSUMER_SECRET
 *   GARMIN_REDIRECT_URI  (e.g. https://peakher.ai/api/wearable/garmin/callback)
 *
 * Garmin uses OAuth 1.0a (3-legged):
 *   1. Get request token
 *   2. Redirect user to Garmin for authorization
 *   3. Exchange verifier for access token
 *
 * Garmin pushes data via webhooks (daily summaries, sleep, stress, body battery).
 * We also support pull-based fetching for backfill.
 */

var crypto = require('crypto');

var REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
var AUTH_URL = 'https://connect.garmin.com/oauthConfirm';
var ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
var API_BASE = 'https://apis.garmin.com/wellness-api/rest';

function getConfig() {
  return {
    consumerKey: process.env.GARMIN_CONSUMER_KEY,
    consumerSecret: process.env.GARMIN_CONSUMER_SECRET,
    redirectUri: process.env.GARMIN_REDIRECT_URI || 'https://peakher.ai/api/wearable/garmin/callback'
  };
}

// ── OAuth 1.0a signature helpers ─────────────────────────────────────

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function buildSignatureBase(method, url, params) {
  var sortedKeys = Object.keys(params).sort();
  var paramStr = sortedKeys.map(function (k) {
    return percentEncode(k) + '=' + percentEncode(params[k]);
  }).join('&');
  return method.toUpperCase() + '&' + percentEncode(url) + '&' + percentEncode(paramStr);
}

function sign(baseString, consumerSecret, tokenSecret) {
  var key = percentEncode(consumerSecret) + '&' + percentEncode(tokenSecret || '');
  return crypto.createHmac('sha1', key).update(baseString).digest('base64');
}

function buildAuthHeader(params) {
  var parts = Object.keys(params).filter(function (k) {
    return k.indexOf('oauth_') === 0;
  }).map(function (k) {
    return percentEncode(k) + '="' + percentEncode(params[k]) + '"';
  });
  return 'OAuth ' + parts.join(', ');
}

/**
 * Step 1: Get a request token from Garmin.
 * Returns { oauthToken, oauthTokenSecret }
 */
async function getRequestToken() {
  var cfg = getConfig();
  var params = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_nonce: generateNonce(),
    oauth_version: '1.0',
    oauth_callback: cfg.redirectUri
  };

  var baseString = buildSignatureBase('POST', REQUEST_TOKEN_URL, params);
  params.oauth_signature = sign(baseString, cfg.consumerSecret, '');

  var resp = await fetch(REQUEST_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: buildAuthHeader(params) }
  });

  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Garmin request token failed: ' + resp.status + ' ' + errBody);
  }

  var body = await resp.text();
  var parsed = new URLSearchParams(body);
  return {
    oauthToken: parsed.get('oauth_token'),
    oauthTokenSecret: parsed.get('oauth_token_secret')
  };
}

/**
 * Step 2: Build the Garmin authorization URL.
 */
function getAuthUrl(oauthToken) {
  return AUTH_URL + '?oauth_token=' + encodeURIComponent(oauthToken);
}

/**
 * Step 3: Exchange the verifier for an access token.
 */
async function exchangeVerifier(oauthToken, oauthTokenSecret, oauthVerifier) {
  var cfg = getConfig();
  var params = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_token: oauthToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_nonce: generateNonce(),
    oauth_version: '1.0',
    oauth_verifier: oauthVerifier
  };

  var baseString = buildSignatureBase('POST', ACCESS_TOKEN_URL, params);
  params.oauth_signature = sign(baseString, cfg.consumerSecret, oauthTokenSecret);

  var resp = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: buildAuthHeader(params) }
  });

  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Garmin access token exchange failed: ' + resp.status + ' ' + errBody);
  }

  var body = await resp.text();
  var parsed = new URLSearchParams(body);
  return {
    accessToken: parsed.get('oauth_token'),
    accessTokenSecret: parsed.get('oauth_token_secret')
  };
}

/**
 * Make an authenticated GET to Garmin Health API.
 */
async function apiGet(accessToken, accessTokenSecret, path) {
  var cfg = getConfig();
  var url = API_BASE + path;
  var params = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_nonce: generateNonce(),
    oauth_version: '1.0'
  };

  // Parse query params from path and include in signature
  var urlParts = url.split('?');
  var baseUrl = urlParts[0];
  if (urlParts[1]) {
    var qp = new URLSearchParams(urlParts[1]);
    qp.forEach(function (v, k) { params[k] = v; });
  }

  var baseString = buildSignatureBase('GET', baseUrl, params);
  params.oauth_signature = sign(baseString, cfg.consumerSecret, accessTokenSecret);

  var resp = await fetch(url, {
    headers: { Authorization: buildAuthHeader(params) }
  });

  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Garmin API error: ' + resp.status + ' ' + errBody);
  }
  return resp.json();
}

/**
 * Fetch daily summaries (steps, calories, stress, body battery).
 * uploadStartTimeInSeconds/uploadEndTimeInSeconds = Unix epoch seconds.
 */
async function fetchDailySummaries(accessToken, tokenSecret, startEpoch, endEpoch) {
  var data = await apiGet(accessToken, tokenSecret,
    '/dailies?uploadStartTimeInSeconds=' + startEpoch + '&uploadEndTimeInSeconds=' + endEpoch);
  var records = Array.isArray(data) ? data : [];
  return records.map(function (r) {
    var date = r.calendarDate || (r.startTimeInSeconds ? new Date(r.startTimeInSeconds * 1000).toISOString().split('T')[0] : null);
    return {
      date: date,
      steps: r.steps || null,
      caloriesActive: r.activeKilocalories || null,
      caloriesTotal: r.totalKilocalories || null,
      stressAvg: r.averageStressLevel || null,
      bodyBatteryStart: r.startingBodyBatteryInDays || null,
      bodyBatteryEnd: r.endingBodyBatteryInDays || null,
      restingHr: r.restingHeartRateInBeatsPerMinute || null,
      activeMinutes: (r.moderateIntensityDurationInSeconds || 0 + r.vigorousIntensityDurationInSeconds || 0) / 60
    };
  });
}

/**
 * Fetch sleep data.
 */
async function fetchSleep(accessToken, tokenSecret, startEpoch, endEpoch) {
  var data = await apiGet(accessToken, tokenSecret,
    '/sleeps?uploadStartTimeInSeconds=' + startEpoch + '&uploadEndTimeInSeconds=' + endEpoch);
  var records = Array.isArray(data) ? data : [];
  return records.map(function (r) {
    var date = r.calendarDate || null;
    var durationMin = r.durationInSeconds ? r.durationInSeconds / 60 : null;
    return {
      date: date,
      sleepDurationMin: durationMin,
      deepSleepMin: r.deepSleepDurationInSeconds ? r.deepSleepDurationInSeconds / 60 : null,
      remSleepMin: r.remSleepInSeconds ? r.remSleepInSeconds / 60 : null,
      lightSleepMin: r.lightSleepDurationInSeconds ? r.lightSleepDurationInSeconds / 60 : null,
      awakeMin: r.awakeDurationInSeconds ? r.awakeDurationInSeconds / 60 : null,
      avgSpO2: r.averageSpO2Value || null,
      avgRespRate: r.averageRespirationValue || null
    };
  });
}

/**
 * Fetch HRV data (stress details often include HRV).
 */
async function fetchStressDetails(accessToken, tokenSecret, startEpoch, endEpoch) {
  try {
    var data = await apiGet(accessToken, tokenSecret,
      '/stressDetails?uploadStartTimeInSeconds=' + startEpoch + '&uploadEndTimeInSeconds=' + endEpoch);
    var records = Array.isArray(data) ? data : [];
    return records.map(function (r) {
      var date = r.calendarDate || null;
      return {
        date: date,
        stressAvg: r.averageStressLevel || null,
        stressMax: r.maxStressLevel || null,
        restStressPercent: r.restStressDurationInSeconds && r.stressDurationInSeconds
          ? Math.round(r.restStressDurationInSeconds / r.stressDurationInSeconds * 100) : null
      };
    });
  } catch (e) {
    // Stress details may not be available for all users
    return [];
  }
}

/**
 * Parse Garmin webhook push payload.
 * Garmin sends POST with JSON arrays of data by type.
 */
function parseWebhookPayload(body) {
  var results = [];

  // Garmin sends different arrays for different data types
  var types = ['dailies', 'sleeps', 'stressDetails', 'bodyComps', 'userMetrics'];
  types.forEach(function (type) {
    if (body[type] && Array.isArray(body[type])) {
      body[type].forEach(function (record) {
        results.push({
          type: type,
          userId: record.userId || record.userAccessToken,
          data: record
        });
      });
    }
  });

  return results;
}

module.exports = {
  getRequestToken: getRequestToken,
  getAuthUrl: getAuthUrl,
  exchangeVerifier: exchangeVerifier,
  getValidToken: function (connection) {
    // Garmin OAuth 1.0a tokens don't expire, so just return them
    return Promise.resolve({
      accessToken: connection.access_token,
      tokenSecret: connection.oauth_token_secret
    });
  },
  apiGet: apiGet,
  fetchDailySummaries: fetchDailySummaries,
  fetchSleep: fetchSleep,
  fetchStressDetails: fetchStressDetails,
  parseWebhookPayload: parseWebhookPayload
};
