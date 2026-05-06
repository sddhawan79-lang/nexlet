/**
 * js/lib/cookies.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cookie consent banner logic shared across all pages.
 *
 * Exposed as: window.RSA.Cookies
 *
 * Expects a DOM element with id="cookie-banner" to exist in the page.
 *
 * Methods:
 *   RSA.Cookies.init()    — shows the banner if consent not yet recorded
 *   RSA.Cookies.accept()  — records "accepted" and hides the banner
 *   RSA.Cookies.decline() — records "essential" and hides the banner
 *
 * Storage key: localStorage 'rsa_cookies'
 * Values:      'accepted' | 'essential'
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'rsa_cookies';
  var BANNER_ID   = 'cookie-banner';

  // ── PRIVATE ──────────────────────────────────────────────────────────────────

  /** Returns the banner element, or null with a warning if missing. */
  function _getBanner() {
    var el = document.getElementById(BANNER_ID);
    if (!el) { console.debug('[cookies:_getBanner] #cookie-banner not found in DOM'); }
    return el;
  }

  // ── PUBLIC ────────────────────────────────────────────────────────────────────

  /** Shows the banner if the user has not yet made a consent choice. */
  function init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      var banner = _getBanner();
      if (banner) banner.style.display = 'flex';
    }
  }

  /** Records "accepted" consent and hides the banner. */
  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    var banner = _getBanner();
    if (banner) banner.style.display = 'none';
  }

  /** Records "essential only" consent and hides the banner. */
  function decline() {
    localStorage.setItem(STORAGE_KEY, 'essential');
    var banner = _getBanner();
    if (banner) banner.style.display = 'none';
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────────

  window.RSA         = window.RSA || {};
  window.RSA.Cookies = { init, accept, decline };
})();
