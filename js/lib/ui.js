/**
 * js/lib/ui.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared UI utility helpers used across all pages.
 *
 * Exposed as: window.RSA.UI
 *
 * Methods:
 *   RSA.UI.showError(el, msg)         — show a red error message element
 *   RSA.UI.showSuccess(el, msg)       — show a green success message element
 *   RSA.UI.hideMessage(el)            — hide a message element
 *   RSA.UI.setLoading(btn, on, label) — toggle button loading/spinner state
 *   RSA.UI.markFieldError(input)      — add red error border to an input
 *   RSA.UI.clearFieldError(input)     — remove error border from an input
 *   RSA.UI.markFieldSuccess(input)    — add green success border to an input
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── MESSAGE HELPERS ──────────────────────────────────────────────────────────

  /** Shows a red error message inside the given element. */
  function showError(el, msg) {
    if (!el) { console.error('[ui:showError] element not found'); return; }
    el.textContent    = msg;
    el.style.display  = 'block';
  }

  /** Shows a green success message inside the given element. */
  function showSuccess(el, msg) {
    if (!el) { console.error('[ui:showSuccess] element not found'); return; }
    el.textContent   = msg;
    el.style.display = 'block';
  }

  /** Hides a message element. */
  function hideMessage(el) {
    if (!el) return;
    el.style.display = 'none';
    el.textContent   = '';
  }

  // ── BUTTON LOADING STATE ──────────────────────────────────────────────────────

  /**
   * Toggles a button between its loading state and its normal label.
   * @param {HTMLButtonElement} btn   - The button element
   * @param {boolean}           on    - true = show spinner, false = restore label
   * @param {string}            label - Label to show when not loading
   */
  function setLoading(btn, on, label) {
    if (!btn) { console.error('[ui:setLoading] button element not found'); return; }
    btn.disabled = on;
    btn.innerHTML = on
      ? '<span class="spinner"></span>' + label
      : label;
  }

  // ── FIELD STATE HELPERS ───────────────────────────────────────────────────────

  /** Adds the .error CSS class to an input field (red border). */
  function markFieldError(input) {
    if (!input) return;
    input.classList.add('error');
    input.classList.remove('success');
  }

  /** Removes error/success CSS classes from an input field. */
  function clearFieldError(input) {
    if (!input) return;
    input.classList.remove('error', 'success');
  }

  /** Adds the .success CSS class to an input field (green border). */
  function markFieldSuccess(input) {
    if (!input) return;
    input.classList.add('success');
    input.classList.remove('error');
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────────

  window.RSA      = window.RSA || {};
  window.RSA.UI   = {
    showError,
    showSuccess,
    hideMessage,
    setLoading,
    markFieldError,
    clearFieldError,
    markFieldSuccess,
  };
})();
