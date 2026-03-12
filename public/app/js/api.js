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
    // data: { name, email, password, personas, cycleProfile }
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

  // ── Public API ───────────────────────────────────────────────────

  return {
    getToken: getToken,
    isLoggedIn: isLoggedIn,
    register: register,
    login: login,
    logout: logout,
    saveCheckin: saveCheckin,
    syncCheckins: syncCheckins,
    fetchUserProfile: fetchUserProfile,
    fullSync: fullSync
  };
})();
