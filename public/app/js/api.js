window.PeakHer = window.PeakHer || {};

window.PeakHer.API = (function () {
  'use strict';

  var BASE_URL = '/api';
  var TOKEN_KEY = 'peakher_token';

  // ── Token management ─────────────────────────────────────────────

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  // ── HTTP helpers ─────────────────────────────────────────────────

  function request(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var opts = { method: method, headers: headers };
    if (body && (method === 'POST' || method === 'PUT')) {
      opts.body = JSON.stringify(body);
    }

    return fetch(BASE_URL + path, opts)
      .then(function (res) {
        if (res.status === 401) {
          clearToken();
          // Don't redirect here — let the caller handle it
        }
        return res.json().then(function (data) {
          if (!res.ok) {
            var err = new Error(data.error || 'Request failed');
            err.status = res.status;
            throw err;
          }
          return data;
        });
      });
  }

  // ── Auth ──────────────────────────────────────────────────────────

  function register(data) {
    // data: { name, email, password, personas, cycleProfile, coachVoice }
    return request('POST', '/auth/register', data)
      .then(function (result) {
        setToken(result.token);
        // Store user data locally for offline access
        var Store = window.PeakHer.Store;
        Store.setUser({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          personas: result.user.personas,
          onboardingComplete: result.user.onboardingComplete,
          coachVoice: result.user.coachVoice || 'sassy',
          createdAt: result.user.createdAt
        });
        return result;
      });
  }

  function login(email, password) {
    return request('POST', '/auth/login', { email: email, password: password })
      .then(function (result) {
        setToken(result.token);
        // Hydrate local store from server data
        var Store = window.PeakHer.Store;
        Store.setUser({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          personas: result.user.personas,
          onboardingComplete: result.user.onboardingComplete,
          coachVoice: result.user.coachVoice || 'sassy',
          createdAt: result.user.createdAt
        });
        if (result.cycleProfile) {
          Store.setCycleProfile(result.cycleProfile);
        }
        if (result.streak) {
          // Update local streak
          var streakData = {
            current: result.streak.current,
            longest: result.streak.longest,
            lastCheckinDate: result.streak.lastCheckinDate
          };
          localStorage.setItem('peakher_streak', JSON.stringify(streakData));
        }
        return result;
      });
  }

  function logout() {
    clearToken();
    window.PeakHer.Store.clearAll();
    window.location.hash = '#onboarding';
    window.location.reload();
  }

  // ── Data sync ────────────────────────────────────────────────────

  function syncCheckins() {
    // Pull all check-ins from server and merge into localStorage
    if (!isLoggedIn()) return Promise.resolve();
    return request('GET', '/checkins')
      .then(function (serverCheckins) {
        var Store = window.PeakHer.Store;
        var localCheckins = Store.getCheckins();
        // Merge: server wins for existing dates, keep local-only dates
        var merged = Object.assign({}, localCheckins, serverCheckins);
        localStorage.setItem('peakher_checkins', JSON.stringify(merged));
        return merged;
      })
      .catch(function (err) {
        console.warn('Sync checkins failed:', err.message);
      });
  }

  function saveCheckin(data) {
    // Save locally first (instant), then push to server
    var Store = window.PeakHer.Store;
    Store.setCheckin(data.date, data);
    Store.updateStreak(data.date);

    if (!isLoggedIn()) return Promise.resolve(data);
    return request('POST', '/checkins', data)
      .catch(function (err) {
        console.warn('Save checkin to server failed:', err.message);
        // Data is already saved locally — will sync later
      });
  }

  function fetchUserProfile() {
    if (!isLoggedIn()) return Promise.resolve(null);
    return request('GET', '/user')
      .then(function (result) {
        // Hydrate local store
        var Store = window.PeakHer.Store;
        Store.setUser({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          personas: result.user.personas,
          onboardingComplete: result.user.onboardingComplete,
          coachVoice: result.user.coachVoice || 'sassy',
          createdAt: result.user.createdAt
        });
        if (result.cycleProfile) {
          Store.setCycleProfile(result.cycleProfile);
        }
        if (result.streak) {
          localStorage.setItem('peakher_streak', JSON.stringify({
            current: result.streak.current,
            longest: result.streak.longest,
            lastCheckinDate: result.streak.lastCheckinDate
          }));
        }
        return result;
      })
      .catch(function (err) {
        console.warn('Fetch user profile failed:', err.message);
        return null;
      });
  }

  // ── User Profile Update ──────────────────────────────────────

  function updateUser(data) {
    // data: { name?, personas?, coachVoice?, cycleProfile? }
    if (!isLoggedIn()) return Promise.resolve(null);
    return request('PUT', '/user', data)
      .then(function (result) {
        // Update local store with the changed fields
        var Store = window.PeakHer.Store;
        var current = Store.getUser() || {};
        if (data.name) current.name = data.name;
        if (data.personas) current.personas = data.personas;
        if (data.coachVoice) current.coachVoice = data.coachVoice;
        Store.setUser(current);
        if (data.cycleProfile) {
          Store.setCycleProfile(data.cycleProfile);
        }
        return result;
      });
  }

  // ── Daily Briefing ─────────────────────────────────────────────

  function getBriefing() {
    if (!isLoggedIn()) return Promise.resolve(null);
    return request('GET', '/briefing')
      .catch(function (err) {
        console.warn('Fetch briefing failed:', err.message);
        return null;
      });
  }

  // ── AI Insights ─────────────────────────────────────────────────

  function getInsights() {
    if (!isLoggedIn()) return Promise.resolve(null);
    return request('GET', '/insights')
      .then(function (result) {
        if (result && result.ready) {
          window.PeakHer.Store.setInsights(result);
        }
        return result;
      })
      .catch(function (err) {
        console.warn('Fetch insights failed:', err.message);
        return null;
      });
  }

  // ── Events ─────────────────────────────────────────────────────

  function getEvents(params) {
    var qs = '';
    if (params && typeof params === 'object') {
      var parts = [];
      if (params.start) parts.push('start=' + encodeURIComponent(params.start));
      if (params.end) parts.push('end=' + encodeURIComponent(params.end));
      if (params.type) parts.push('type=' + encodeURIComponent(params.type));
      if (params.limit) parts.push('limit=' + encodeURIComponent(params.limit));
      if (parts.length > 0) qs = '?' + parts.join('&');
    }
    if (!isLoggedIn()) return Promise.resolve({ events: [] });
    return request('GET', '/events' + qs)
      .then(function (result) {
        if (result && result.events) {
          window.PeakHer.Store.setEvents(result.events);
        }
        return result;
      })
      .catch(function (err) {
        console.warn('Fetch events failed:', err.message);
        return { events: [] };
      });
  }

  function saveEvent(data) {
    // Save locally first, then push to server
    var Store = window.PeakHer.Store;
    if (!isLoggedIn()) {
      // Assign a temporary local id
      var tempEvent = Object.assign({}, data, { id: Date.now() });
      Store.addEvent(tempEvent);
      return Promise.resolve(tempEvent);
    }
    return request('POST', '/events', data)
      .then(function (result) {
        Store.addEvent(result);
        return result;
      });
  }

  function deleteEvent(id) {
    var Store = window.PeakHer.Store;
    Store.removeEvent(id);
    if (!isLoggedIn()) return Promise.resolve({ success: true });
    return request('DELETE', '/events?id=' + encodeURIComponent(id))
      .catch(function (err) {
        console.warn('Delete event from server failed:', err.message);
      });
  }

  // Full sync — call on app load when logged in
  function fullSync() {
    if (!isLoggedIn()) return Promise.resolve();
    return Promise.all([fetchUserProfile(), syncCheckins()])
      .then(function () {
        console.log('PeakHer: sync complete');
      })
      .catch(function (err) {
        console.warn('PeakHer: sync error:', err.message);
      });
  }

  // ── Push Notifications ─────────────────────────────────────────

  function getVapidKey() {
    return fetch(BASE_URL + '/notifications/vapid-key')
      .then(function (res) {
        return res.json();
      });
  }

  function subscribePush(subscription) {
    return request('POST', '/notifications/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys.p256dh,
        auth: subscription.toJSON().keys.auth
      }
    });
  }

  function unsubscribePush(endpoint) {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(BASE_URL + '/notifications/subscribe', {
      method: 'DELETE',
      headers: headers,
      body: JSON.stringify({ endpoint: endpoint })
    }).then(function (res) {
      return res.json();
    });
  }

  /**
   * Full push notification orchestration.
   * Checks browser support, registers service worker, gets VAPID key,
   * subscribes to push manager, and sends subscription to server.
   * Silently skips if not supported or user denies permission.
   */
  function initPushNotifications() {
    if (!isLoggedIn()) return Promise.resolve();

    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('PeakHer Push: not supported in this browser');
      return Promise.resolve();
    }

    return navigator.serviceWorker.register('/sw.js')
      .then(function (registration) {
        console.log('PeakHer Push: service worker registered');
        return registration;
      })
      .then(function (registration) {
        return getVapidKey().then(function (data) {
          if (!data.publicKey) {
            console.warn('PeakHer Push: no VAPID public key configured');
            return null;
          }
          return { registration: registration, publicKey: data.publicKey };
        });
      })
      .then(function (context) {
        if (!context) return null;

        // Check for existing subscription first
        return context.registration.pushManager.getSubscription().then(function (existing) {
          if (existing) {
            // Already subscribed, just ensure server knows about it
            return subscribePush(existing).then(function () {
              console.log('PeakHer Push: existing subscription synced');
              return existing;
            });
          }

          // Convert VAPID key from base64url to Uint8Array
          var rawKey = context.publicKey;
          var padding = '='.repeat((4 - rawKey.length % 4) % 4);
          var base64 = (rawKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          var rawData = atob(base64);
          var outputArray = new Uint8Array(rawData.length);
          for (var i = 0; i < rawData.length; i++) {
            outputArray[i] = rawData.charCodeAt(i);
          }

          return context.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray
          }).then(function (subscription) {
            console.log('PeakHer Push: subscribed successfully');
            return subscribePush(subscription);
          });
        });
      })
      .catch(function (err) {
        // Silently handle — user may have denied permission or browser doesn't support
        console.log('PeakHer Push: init skipped -', err.message || err);
      });
  }

  // ── GDPR: Data Export ───────────────────────────────────────────

  function exportData() {
    var headers = {};
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(BASE_URL + '/export', { method: 'GET', headers: headers })
      .then(function (res) {
        if (res.status === 401) {
          clearToken();
          var err = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }
        if (!res.ok) {
          return res.json().then(function (data) {
            var err = new Error(data.error || 'Export failed');
            err.status = res.status;
            throw err;
          });
        }
        // Get the filename from Content-Disposition header or generate one
        var disposition = res.headers.get('Content-Disposition');
        var filename = 'peakher-data-export.json';
        if (disposition) {
          var match = disposition.match(/filename="?([^";\s]+)"?/);
          if (match) filename = match[1];
        }
        return res.blob().then(function (blob) {
          // Trigger download via temporary anchor element
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          // Clean up
          setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
          return { success: true };
        });
      });
  }

  // ── GDPR: Account Deletion ────────────────────────────────────

  function deleteAccount(confirmEmail) {
    return request('POST', '/account/delete', { confirmEmail: confirmEmail })
      .then(function (result) {
        // Clear all localStorage keys starting with peakher_
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('peakher_') === 0) {
            keysToRemove.push(key);
          }
        }
        for (var j = 0; j < keysToRemove.length; j++) {
          localStorage.removeItem(keysToRemove[j]);
        }
        // Redirect to home page
        window.location.href = '/';
        return result;
      });
  }

  // ── SMS Settings ─────────────────────────────────────────────────

  function getSmsSettings() {
    if (!isLoggedIn()) return Promise.resolve(null);
    return request('GET', '/sms/subscribe')
      .catch(function (err) {
        console.warn('Fetch SMS settings failed:', err.message);
        return null;
      });
  }

  function addPhoneNumber(phoneNumber) {
    return request('POST', '/sms/subscribe', { phoneNumber: phoneNumber });
  }

  function verifyPhoneCode(code) {
    return request('POST', '/sms/verify', { code: code });
  }

  function updateSmsSettings(settings) {
    return request('PUT', '/sms/subscribe', settings);
  }

  function removePhoneNumber() {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(BASE_URL + '/sms/subscribe', {
      method: 'DELETE',
      headers: headers
    }).then(function (res) { return res.json(); });
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    getToken: getToken,
    isLoggedIn: isLoggedIn,
    register: register,
    login: login,
    logout: logout,
    updateUser: updateUser,
    saveCheckin: saveCheckin,
    syncCheckins: syncCheckins,
    fetchUserProfile: fetchUserProfile,
    getBriefing: getBriefing,
    getInsights: getInsights,
    getEvents: getEvents,
    saveEvent: saveEvent,
    deleteEvent: deleteEvent,
    exportData: exportData,
    deleteAccount: deleteAccount,
    fullSync: fullSync,
    getVapidKey: getVapidKey,
    subscribePush: subscribePush,
    unsubscribePush: unsubscribePush,
    initPushNotifications: initPushNotifications,
    getSmsSettings: getSmsSettings,
    addPhoneNumber: addPhoneNumber,
    verifyPhoneCode: verifyPhoneCode,
    updateSmsSettings: updateSmsSettings,
    removePhoneNumber: removePhoneNumber
  };
})();
