/**
 * Oura Ring API helper -- OAuth2 + data fetching.
 *
 * Env vars required:
 *   OURA_CLIENT_ID
 *   OURA_CLIENT_SECRET
 *   OURA_REDIRECT_URI  (e.g. https://peakher.ai/api/wearable/oura/callback)
 *
 * Oura API v2 docs: https://cloud.ouraring.com/v2/docs
 */

var AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
var TOKEN_URL = 'https://api.ouraring.com/oauth/token';
var API_BASE = 'https://api.ouraring.com/v2/usercollection';
var SCOPES = 'daily heartrate personal sleep session workout';

function getConfig() {
  return {
    clientId: process.env.OURA_CLIENT_ID,
    clientSecret: process.env.OURA_CLIENT_SECRET,
    redirectUri: process.env.OURA_REDIRECT_URI || 'https://peakher.ai/api/wearable/oura/callback'
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
    throw new Error('Oura token exchange failed: ' + resp.status + ' ' + errBody);
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
    throw new Error('Oura token refresh failed: ' + resp.status + ' ' + errBody);
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
    throw new Error('No Oura refresh token -- user must re-authenticate');
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
    throw new Error('Oura API error: ' + resp.status + ' ' + errBody);
  }
  return resp.json();
}

/**
 * Fetch daily readiness scores.
 * Returns array of { date, readinessScore, hrvBalance, bodyTemp, restingHr }
 */
async function fetchReadiness(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/daily_readiness?start_date=' + startDate + '&end_date=' + endDate);
  var records = data.data || [];
  return records.map(function (r) {
    var contributors = r.contributors || {};
    return {
      date: r.day,
      readinessScore: r.score || null,
      bodyTempContrib: contributors.body_temperature || null,
      restingHrContrib: contributors.resting_heart_rate || null,
      hrvContrib: contributors.hrv_balance || null,
      recoveryContrib: contributors.recovery_index || null
    };
  });
}

/**
 * Fetch daily sleep data.
 * Returns array of normalized sleep metrics.
 */
async function fetchSleep(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/daily_sleep?start_date=' + startDate + '&end_date=' + endDate);
  var records = data.data || [];
  return records.map(function (r) {
    var contributors = r.contributors || {};
    return {
      date: r.day,
      sleepScore: r.score || null,
      deepSleepContrib: contributors.deep_sleep || null,
      remSleepContrib: contributors.rem_sleep || null,
      efficiencyContrib: contributors.efficiency || null,
      latencyContrib: contributors.latency || null
    };
  });
}

/**
 * Fetch detailed sleep sessions for duration/stages.
 */
async function fetchSleepSessions(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/sleep?start_date=' + startDate + '&end_date=' + endDate);
  var records = data.data || [];
  return records
    .filter(function (r) { return r.type === 'long_sleep'; })
    .map(function (r) {
      return {
        date: r.day,
        sleepDurationMin: r.total_sleep_duration ? r.total_sleep_duration / 60 : null,
        deepSleepMin: r.deep_sleep_duration ? r.deep_sleep_duration / 60 : null,
        remSleepMin: r.rem_sleep_duration ? r.rem_sleep_duration / 60 : null,
        lightSleepMin: r.light_sleep_duration ? r.light_sleep_duration / 60 : null,
        awakeMin: r.awake_time ? r.awake_time / 60 : null,
        sleepEfficiency: r.efficiency || null,
        avgHrv: r.average_hrv || null,
        restingHr: r.lowest_heart_rate || null,
        avgBreathRate: r.average_breath || null
      };
    });
}

/**
 * Fetch daily activity/steps.
 */
async function fetchActivity(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/daily_activity?start_date=' + startDate + '&end_date=' + endDate);
  var records = data.data || [];
  return records.map(function (r) {
    return {
      date: r.day,
      steps: r.steps || null,
      caloriesActive: r.active_calories || null,
      caloriesTotal: r.total_calories || null,
      activeMinutes: (r.high_activity_time || 0) + (r.medium_activity_time || 0)
    };
  });
}

/**
 * Fetch heart rate data (daily summary).
 */
async function fetchHeartRate(accessToken, startDate, endDate) {
  var data = await apiGet(accessToken, '/heartrate?start_datetime=' + startDate + 'T00:00:00&end_datetime=' + endDate + 'T23:59:59');
  // Oura returns timestamped HR readings; summarize by day
  var byDay = {};
  var records = data.data || [];
  records.forEach(function (r) {
    var day = r.timestamp ? r.timestamp.split('T')[0] : null;
    if (!day) return;
    if (!byDay[day]) byDay[day] = { readings: [], source: r.source };
    byDay[day].readings.push(r.bpm);
  });

  return Object.keys(byDay).map(function (day) {
    var bpms = byDay[day].readings;
    var avg = bpms.reduce(function (s, v) { return s + v; }, 0) / bpms.length;
    var min = Math.min.apply(null, bpms);
    return {
      date: day,
      avgHr: Math.round(avg),
      restingHr: min
    };
  });
}

/**
 * Fetch personal info (for skin temp deviation from ring temp).
 */
async function fetchPersonalInfo(accessToken) {
  var resp = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!resp.ok) return null;
  return resp.json();
}

module.exports = {
  getAuthUrl: getAuthUrl,
  exchangeCode: exchangeCode,
  refreshAccessToken: refreshAccessToken,
  getValidToken: getValidToken,
  fetchReadiness: fetchReadiness,
  fetchSleep: fetchSleep,
  fetchSleepSessions: fetchSleepSessions,
  fetchActivity: fetchActivity,
  fetchHeartRate: fetchHeartRate,
  fetchPersonalInfo: fetchPersonalInfo
};
