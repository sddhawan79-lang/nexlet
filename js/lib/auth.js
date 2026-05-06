/**
 * js/lib/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth session helpers shared across all pages.
 *
 * Depends on: js/lib/supabase-client.js (window.RSA.sb must exist)
 * Exposed as: window.RSA.Auth
 *
 * Methods:
 *   RSA.Auth.redirectIfLoggedIn(dest)   — send to dest if a session already exists
 *   RSA.Auth.requireSession(dest)       — send to dest if NO session exists
 *   RSA.Auth.onAuthChange(callback)     — thin wrapper around onAuthStateChange
 *   RSA.Auth.getSession()               — returns the current session or null
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  /**
   * Redirects to `dest` if the user is already authenticated.
   * Use on login / signup pages to skip the form for logged-in users.
   * @param {string} [dest='landlord.html']
   */
  async function redirectIfLoggedIn(dest) {
    var target = dest || 'landlord.html';
    try {
      var sb = window.RSA.sb;
      var result = await sb.auth.getSession();
      if (result.data && result.data.session) {
        window.location.href = target;
      }
    } catch (err) {
      console.error('[auth:redirectIfLoggedIn]', err);
    }
  }

  /**
   * Redirects to `dest` if there is NO active session.
   * Use on protected pages (landlord.html, mtd.html) to enforce login.
   * @param {string} [dest='login.html']
   */
  async function requireSession(dest) {
    var target = dest || 'login.html';
    try {
      var sb = window.RSA.sb;
      var result = await sb.auth.getSession();
      if (!result.data || !result.data.session) {
        window.location.href = target;
      }
    } catch (err) {
      console.error('[auth:requireSession]', err);
      window.location.href = target;
    }
  }

  /**
   * Subscribes to Supabase auth state changes.
   * The callback receives (event, session) — same signature as onAuthStateChange.
   * @param {function} callback
   */
  function onAuthChange(callback) {
    try {
      window.RSA.sb.auth.onAuthStateChange(callback);
    } catch (err) {
      console.error('[auth:onAuthChange]', err);
    }
  }

  /**
   * Returns the current Supabase session object, or null if not logged in.
   * @returns {Promise<object|null>}
   */
  async function getSession() {
    try {
      var result = await window.RSA.sb.auth.getSession();
      return (result.data && result.data.session) ? result.data.session : null;
    } catch (err) {
      console.error('[auth:getSession]', err);
      return null;
    }
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────────

  window.RSA      = window.RSA || {};
  window.RSA.Auth = {
    redirectIfLoggedIn,
    requireSession,
    onAuthChange,
    getSession,
  };
})();
