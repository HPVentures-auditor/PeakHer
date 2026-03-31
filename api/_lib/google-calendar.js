/**
 * Google Calendar API helper — OAuth + event fetching.
 *
 * Env vars required:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI  (e.g. https://peakher.ai/api/calendar/callback)
 */

var SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
var TOKEN_URL = 'https://oauth2.googleapis.com/token';
var AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
var CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://peakher.ai/api/calendar/callback'
  };
}

/**
 * Build the Google OAuth consent URL.
 * @param {string} state — opaque state param (e.g. JWT userId)
 */
function getAuthUrl(state) {
  var cfg = getConfig();
  var params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });
  return AUTH_URL + '?' + params.toString();
}

/**
 * Exchange authorization code for tokens.
 */
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
    throw new Error('Token exchange failed: ' + resp.status + ' ' + errBody);
  }

  var data = await resp.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    expiresAt: new Date(Date.now() + data.expires_in * 1000)
  };
}

/**
 * Refresh an expired access token.
 */
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
    throw new Error('Token refresh failed: ' + resp.status + ' ' + errBody);
  }

  var data = await resp.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    expiresAt: new Date(Date.now() + data.expires_in * 1000)
  };
}

/**
 * Get a valid access token, refreshing if needed.
 * @param {object} connection — calendar_connections row
 * @param {function} sql — Neon query function
 * @returns {string} valid access token
 */
async function getValidToken(connection, sql) {
  var now = new Date();
  var expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;

  // If token is still valid (with 5 min buffer), use it
  if (expiresAt && expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
    return connection.access_token;
  }

  // Refresh the token
  if (!connection.refresh_token) {
    throw new Error('No refresh token available — user must re-authenticate');
  }

  var refreshed = await refreshAccessToken(connection.refresh_token);

  // Update in DB
  await sql`
    UPDATE calendar_connections
    SET access_token = ${refreshed.accessToken},
        token_expires_at = ${refreshed.expiresAt.toISOString()},
        updated_at = now()
    WHERE id = ${connection.id}
  `;

  return refreshed.accessToken;
}

/**
 * Fetch events from Google Calendar API.
 * @param {string} accessToken
 * @param {object} opts — { timeMin, timeMax, syncToken, calendarId }
 * @returns {{ events: Array, nextSyncToken: string|null }}
 */
async function fetchEvents(accessToken, opts) {
  var calendarId = opts.calendarId || 'primary';
  var url = CALENDAR_API + '/calendars/' + encodeURIComponent(calendarId) + '/events';

  var params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });

  if (opts.syncToken) {
    // Incremental sync — only changes since last sync
    params.set('syncToken', opts.syncToken);
  } else {
    // Full sync — fetch window
    if (opts.timeMin) params.set('timeMin', opts.timeMin);
    if (opts.timeMax) params.set('timeMax', opts.timeMax);
  }

  var resp = await fetch(url + '?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + accessToken }
  });

  // If sync token is invalid (410 Gone), caller should do full sync
  if (resp.status === 410) {
    return { events: [], nextSyncToken: null, fullSyncRequired: true };
  }

  if (!resp.ok) {
    var errBody = await resp.text();
    throw new Error('Calendar API error: ' + resp.status + ' ' + errBody);
  }

  var data = await resp.json();

  var events = (data.items || [])
    .filter(function (item) {
      return item.status !== 'cancelled';
    })
    .map(function (item) {
      var startDt = item.start.dateTime || item.start.date;
      var endDt = item.end ? (item.end.dateTime || item.end.date) : null;
      var isAllDay = !item.start.dateTime;

      return {
        externalId: item.id,
        title: item.summary || '(No title)',
        description: item.description || null,
        startTime: startDt,
        endTime: endDt,
        isAllDay: isAllDay,
        location: item.location || null,
        attendeeCount: item.attendees ? item.attendees.length : 1,
        rawData: {
          htmlLink: item.htmlLink,
          creator: item.creator,
          organizer: item.organizer,
          recurringEventId: item.recurringEventId,
          status: item.status
        }
      };
    });

  return {
    events: events,
    nextSyncToken: data.nextSyncToken || null,
    fullSyncRequired: false
  };
}

module.exports = {
  getAuthUrl: getAuthUrl,
  exchangeCode: exchangeCode,
  refreshAccessToken: refreshAccessToken,
  getValidToken: getValidToken,
  fetchEvents: fetchEvents
};
