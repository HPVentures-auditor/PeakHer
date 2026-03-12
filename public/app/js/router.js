/**
 * PeakHer Router
 * Hash-based SPA routing with screen transitions and auth guard.
 */
window.PeakHer = window.PeakHer || {};

window.PeakHer.Router = (function () {
  'use strict';

  var VALID_ROUTES = ['onboarding', 'checkin', 'history', 'patterns', 'weekahead'];

  // Tab order used to determine transition direction (forward vs backward)
  var TAB_ORDER = {
    onboarding: 0,
    checkin:    1,
    history:    2,
    patterns:   3,
    weekahead:  4
  };

  var previousRoute = null;

  // ── Screen transitions ────────────────────────────────────────────

  function showScreen(screenId, direction) {
    var allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(function (s) {
      if (s.classList.contains('active')) {
        s.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        s.style.opacity = '0';
        s.style.transform = direction === 'forward' ? 'translateX(-30px)' : 'translateX(30px)';
        setTimeout(function () {
          s.classList.remove('active');
          s.style.transform = '';
          s.style.opacity = '';
        }, 250);
      }
    });

    setTimeout(function () {
      var target = document.getElementById(screenId);
      if (!target) return;
      target.style.transform = direction === 'forward' ? 'translateX(30px)' : 'translateX(-30px)';
      target.style.opacity = '0';
      target.classList.add('active');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          target.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          target.style.opacity = '1';
          target.style.transform = 'translateX(0)';
        });
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 260);
  }

  // ── Navigation ────────────────────────────────────────────────────

  function navigate(hash) {
    var Store = window.PeakHer.Store;
    var route = (hash || '').replace('#', '') || 'checkin';

    // Auth guard: force onboarding if no user or onboarding not complete
    var user = Store.getUser();
    if (!user || !user.onboardingComplete) {
      route = 'onboarding';
    }

    // Validate route
    if (VALID_ROUTES.indexOf(route) === -1) {
      route = 'checkin';
    }

    // Determine transition direction
    var prevOrder = (previousRoute && TAB_ORDER[previousRoute] !== undefined)
      ? TAB_ORDER[previousRoute]
      : -1;
    var nextOrder = TAB_ORDER[route] !== undefined ? TAB_ORDER[route] : 0;
    var direction = nextOrder >= prevOrder ? 'forward' : 'backward';

    // Show the screen
    showScreen('screen-' + route, direction);

    // Show/hide bottom nav (hidden during onboarding)
    var bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
      if (route === 'onboarding') {
        bottomNav.classList.add('hidden');
      } else {
        bottomNav.classList.remove('hidden');
      }
    }

    // Update bottom nav active state
    updateBottomNav(route);

    // Refresh the target module so it re-renders with latest data
    var PH = window.PeakHer;
    if (route === 'checkin'   && PH.Checkin   && PH.Checkin.refresh)   PH.Checkin.refresh();
    if (route === 'history'   && PH.History   && PH.History.refresh)   PH.History.refresh();
    if (route === 'patterns'  && PH.Patterns  && PH.Patterns.refresh)  PH.Patterns.refresh();
    if (route === 'weekahead' && PH.WeekAhead && PH.WeekAhead.refresh) PH.WeekAhead.refresh();

    // Update hash without re-triggering
    if (window.location.hash !== '#' + route) {
      window.location.hash = route;
    }

    previousRoute = route;
  }

  function updateBottomNav(route) {
    var navLinks = document.querySelectorAll('.bottom-nav a, .bottom-nav button');
    navLinks.forEach(function (link) {
      var linkRoute = (link.getAttribute('href') || '').replace('#', '') ||
                      (link.getAttribute('data-route') || '');
      if (linkRoute === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function getCurrentRoute() {
    return (window.location.hash || '').replace('#', '') || 'checkin';
  }

  // ── Init ──────────────────────────────────────────────────────────

  function init() {
    window.addEventListener('hashchange', function () {
      navigate(window.location.hash);
    });

    // Navigate on initial load
    navigate(window.location.hash);
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    init: init,
    navigate: navigate,
    getCurrentRoute: getCurrentRoute
  };
})();
