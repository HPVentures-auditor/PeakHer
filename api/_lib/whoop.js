/**
 * Whoop API helper -- OAuth2 + data fetching.
 *
 * Env vars required:
 *   WHOOP_CLIENT_ID
 *   WHOOP_CLIENT_SECRET
 *   WHOOP_REDIRECT_URI  (e.g. https://peakher.ai/api/wearable/whoop/callback)
 *
 * Whoop API docs: https://developer.whoop.com/api
 */

var TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
var AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
var API_BASE = 'https://api.prod.whoop.com/developer/v1';
var SCOPES = 'read:recovery read:sleep read:workout read:cycles read:profile read:body_measurement';

function getConfig() {
  return {
    clientId: process.env.WHOOP_CLIENT_ID,
    clientSecret: process.env.WHOOP_CLIENT_SECRET,
    redirectUri: process.env.WHOOP_REDIRECT_URI || 'https://peakher.ai/api/wearable/whoop/callback'
  };
}

function getAuthUrl(state) {
  var cfg = getConfig();
  var params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state: state
  });
  return AUTH_URL + '?' + params.toString();
}

async function exchangeCode(code) {
  var cfg = getConfig();
  var resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  });

  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Whoop token exchange failed: ' + resp.status + ' ' + errBody);
  }

  var data = await resp.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    expiresAt: new Date(Date.now() + data.expires_in * 1000)
  };
}

async function refreshAccessToken(refreshToken) {
  var cfg = getConfig();
  var resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token'
    }).toString()
  });

  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Whoop token refresh failed: ' + resp.status + ' ' + errBody);
  }

  var data = await resp.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    expiresAt: new Date(Date.now() + data.expires_in * 1000)
  };
}

async function getValidToken(connection, sql) {
  var now = new Date();
  var expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;

  if (expiresAt && expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error('No Whoop refresh token -- user must re-authenticate');
  }

  var refreshed = await refreshAccessToken(connection.refresh_token);

  await sql`
    UPDATE wearable_connections
    SET access_token = ${refreshed.accessToken},
        refresh_token = ${refreshed.refreshToken},
        token_expires_at = ${refreshed.expiresAt.toISOString()},
        updated_at = now()
    WHERE id = ${connection.id}
  `;

  return refreshed.accessToken;
}

async function apiGet(accessToken, path) {
  var resp = await fetch(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Whoop API error: ' + resp.status + ' ' + errBody);
  }
  return resp.json();
}

/**
 * Fetch recovery data for a date range.
 * Returns array of { date, recoveryScore, hrvMs, restingHr, spo2 }
 */
async function fetchRecovery(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/recovery?start=' + startDate + 'T00:00:00.000Z&end=' + endDate + 'T23:59:59.999Z&limit=25');
  var records = data.records || [];
  return records.map(function (r) {
    var score = r.score || {};
    var date = r.created_at ? r.created_at.split('T')[0] : null;
    return {
      date: date,
      recoveryScore: score.recovery_score || null,
      hrvMs: score.hrv_rmssd_milli || null,
      restingHr: score.resting_heart_rate || null,
      spo2: score.spo2_percentage || null,
      skinTemp: score.skin_temp_celsius || null
    };
  });
}

/**
 * Fetch sleep data for a date range.
 * Returns array of { date, sleepDurationMin, sleepQuality, stages }
 */
async function fetchSleep(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/activity/sleep?start=' + startDate + 'T00:00:00.000Z&end=' + endDate + 'T23:59:59.999Z&limit=25');
  var records = data.records || [];
  return records.map(function (r) {
    var score = r.score || {};
    var sleepStart = r.start ? new Date(r.start) : null;
    var sleepEnd = r.end ? new Date(r.end) : null;
    var durationMin = (sleepStart && sleepEnd) ? (sleepEnd - sleepStart) / 60000 : null;
    return {
      date: r.start ? r.start.split('T')[0] : null,
      sleepDurationMin: durationMin,
      sleepEfficiency: score.sleep_efficiency_percentage || null,
      sleepQuality: score.sleep_performance_percentage || null,
      lightSleepMin: score.light_sleep_duration_milli ? score.light_sleep_duration_milli / 60000 : null,
      deepSleepMin: score.slow_wave_sleep_duration_milli ? score.slow_wave_sleep_duration_milli / 60000 : null,
      remSleepMin: score.rem_sleep_duration_milli ? score.rem_sleep_duration_milli / 60000 : null,
      awakeMin: score.awake_duration_milli ? score.awake_duration_milli / 60000 : null,
      respiratoryRate: score.respiratory_rate || null
    };
  });
}

/**
 * Fetch physiological cycles (strain) for a date range.
 * Returns array of { date, strain, calories }
 */
async function fetchCycles(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/cycle?start=' + startDate + 'T00:00:00.000Z&end=' + endDate + 'T23:59:59.999Z&limit=25');
  var records = data.records || [];
  return records.map(function (r) {
    var score = r.score || {};
    return {
      date: r.start ? r.start.split('T')[0] : null,
      strain: score.strain || null,
      calories: score.kilojoule ? Math.round(score.kilojoule / 4.184) : null,
      avgHr: score.average_heart_rate || null,
      maxHr: score.max_heart_rate || null
    };
  });
}

/**
 * Fetch user profile.
 */
async function fetchProfile(accessToken) {
  return apiGet(accessToken, '/user/profile/basic');
}

module.exports = {
  getAuthUrl: getAuthUrl,
  exchangeCode: exchangeCode,
  refreshAccessToken: refreshAccessToken,
  getValidToken: getValidToken,
  fetchRecovery: fetchRecovery,
  fetchSleep: fetchSleep,
  fetchCycles: fetchCycles,
  fetchProfile: fetchProfile
};
