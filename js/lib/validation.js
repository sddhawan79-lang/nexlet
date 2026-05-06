/**
 * js/lib/validation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Input validation helpers shared across all pages.
 *
 * Exposed as: window.RSA.Validation
 *
 * Methods:
 *   RSA.Validation.isValidEmail(value)      → boolean
 *   RSA.Validation.getPasswordStrength(pw)  → number 0–5 (rules passed)
 *   RSA.Validation.PASSWORD_RULES           — array of rule descriptors
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── EMAIL ─────────────────────────────────────────────────────────────────────

  /**
   * Returns true if the value looks like a valid email address.
   * Lightweight check — definitive validation is done server-side by Supabase.
   * @param {string} value
   * @returns {boolean}
   */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // ── PASSWORD STRENGTH ─────────────────────────────────────────────────────────

  /**
   * Ordered list of password rules.
   * Each rule has:
   *   id    {string}   — matches the DOM element id for the rule indicator
   *   label {string}   — human-readable description
   *   test  {function} — (password: string) => boolean
   */
  var PASSWORD_RULES = [
    {
      id:    'rule-len',
      label: 'At least 8 characters',
      test:  function (pw) { return pw.length >= 8; },
    },
    {
      id:    'rule-upper',
      label: 'One uppercase letter',
      test:  function (pw) { return /[A-Z]/.test(pw); },
    },
    {
      id:    'rule-lower',
      label: 'One lowercase letter',
      test:  function (pw) { return /[a-z]/.test(pw); },
    },
    {
      id:    'rule-num',
      label: 'One number',
      test:  function (pw) { return /[0-9]/.test(pw); },
    },
    {
      id:    'rule-sym',
      label: 'One special character (!@#$%^&*…)',
      test:  function (pw) { return /[^A-Za-z0-9]/.test(pw); },
    },
  ];

  /**
   * Returns the number of password rules (0–5) that the given password satisfies.
   * A score of 5 means all rules pass — considered a strong password.
   * The minimum accepted score for sign-up is 4.
   * @param {string} pw
   * @returns {number}
   */
  function getPasswordStrength(pw) {
    return PASSWORD_RULES.filter(function (rule) { return rule.test(pw); }).length;
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────────

  window.RSA            = window.RSA || {};
  window.RSA.Validation = {
    isValidEmail,
    getPasswordStrength,
    PASSWORD_RULES,
  };
})();
