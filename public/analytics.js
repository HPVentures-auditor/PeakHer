/**
 * PeakHer Analytics
 * Loads Vercel Analytics + Google Analytics 4 on every page.
 *
 * GA4: Replace GA_ID below with your Measurement ID (G-XXXXXXXXXX).
 * Vercel Analytics: Enable in Vercel project dashboard, script auto-served at /_vercel/insights/script.js
 */
(function () {
  'use strict';

  // === Google Analytics 4 ===
  var GA_ID = 'G-F1MPQFYYDB';

  if (GA_ID && GA_ID !== 'G-REPLACE_ME') {
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      page_path: window.location.pathname
    });
  }

  // === Vercel Analytics ===
  var vi = document.createElement('script');
  vi.defer = true;
  vi.src = '/_vercel/insights/script.js';
  document.head.appendChild(vi);
})();
