/**
 * js/signup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sign-up page logic for signup.html.
 *
 * Depends on (must load before this file):
 *   - Supabase CDN             → window.supabase
 *   - js/lib/supabase-client.js → window.RSA.sb
 *   - js/lib/ui.js              → window.RSA.UI
 *   - js/lib/validation.js      → window.RSA.Validation
 *   - js/lib/auth.js            → window.RSA.Auth
 *   - js/lib/cookies.js         → window.RSA.Cookies
 *
 * Responsibilities:
 *   - Redirect already-logged-in users to landlord.html
 *   - Real-time password strength meter (4-bar, 5-rule checklist)
 *   - Real-time confirm-password match indicator
 *   - Form submission: validate → check duplicate → signUp → redirect
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── CONSTANTS ─────────────────────────────────────────────────────────────────

  /** Minimum password strength score (out of 5 rules) required to submit. */
  var MIN_STRENGTH = 4;

  /** Milliseconds to wait after successful sign-up before redirecting to login. */
  var REDIRECT_DELAY_MS = 3500;

  // ── DOM REFERENCES (resolved after DOMContentLoaded) ─────────────────────────

  var _els = {};

  /** Resolves and caches all required DOM elements. Returns false if any are missing. */
  function _resolveElements() {
    var ids = [
      'email', 'password', 'confirm-password',
      'signup-btn', 'error-msg', 'success-msg',
      'pw-strength', 'pw-label',
      'bar1', 'bar2', 'bar3', 'bar4',
      'match-hint',
    ];

    var ok = true;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) {
        console.error('[signup:_resolveElements] Missing DOM element: #' + id);
        ok = false;
      }
      _els[id] = el;
    });

    // Rule indicator elements (one per password rule)
    RSA.Validation.PASSWORD_RULES.forEach(function (rule) {
      var el = document.getElementById(rule.id);
      if (!el) {
        console.error('[signup:_resolveElements] Missing rule element: #' + rule.id);
        ok = false;
      }
      _els[rule.id] = el;
    });

    return ok;
  }

  // ── PASSWORD STRENGTH METER ───────────────────────────────────────────────────

  /**
   * Maps a strength score (0–5) to a display tier.
   * Returns { bars: number, cls: string, label: string }
   */
  function _strengthTier(score) {
    if (score <= 1) return { bars: 1, cls: 'weak',   label: 'Weak'   };
    if (score <= 2) return { bars: 2, cls: 'weak',   label: 'Weak'   };
    if (score <= 3) return { bars: 3, cls: 'fair',   label: 'Fair'   };
    return           { bars: 4, cls: 'strong', label: 'Strong' };
  }

  /** Updates the 4-segment strength bar and label based on the current password value. */
  function _renderStrengthMeter(pw) {
    var score = RSA.Validation.getPasswordStrength(pw);
    var tier  = _strengthTier(score);
    var bars  = [_els['bar1'], _els['bar2'], _els['bar3'], _els['bar4']];

    // Colour the bars
    bars.forEach(function (bar, i) {
      bar.className = 'pw-bar';
      if (i < tier.bars) bar.classList.add(tier.cls);
    });

    // Update label
    _els['pw-label'].className   = 'pw-label ' + tier.cls;
    _els['pw-label'].textContent = tier.label;

    // Update individual rule indicators
    RSA.Validation.PASSWORD_RULES.forEach(function (rule) {
      var ruleEl = _els[rule.id];
      if (ruleEl) ruleEl.classList.toggle('met', rule.test(pw));
    });
  }

  /** Handles input on the password field — shows/updates the strength meter. */
  function _onPasswordInput() {
    var pw = _els['password'].value;

    if (!pw) {
      _els['pw-strength'].style.display = 'none';
      return;
    }

    _els['pw-strength'].style.display = 'block';
    _renderStrengthMeter(pw);

    // Re-check confirm match if already typed
    if (_els['confirm-password'].value) {
      _onConfirmInput();
    }
  }

  // ── CONFIRM PASSWORD MATCH ────────────────────────────────────────────────────

  /** Handles input on the confirm-password field — shows a live match hint. */
  function _onConfirmInput() {
    var pw   = _els['password'].value;
    var cpw  = _els['confirm-password'].value;
    var hint = _els['match-hint'];

    if (!cpw) {
      hint.style.display = 'none';
      RSA.UI.clearFieldError(_els['confirm-password']);
      return;
    }

    hint.style.display = 'block';

    if (pw === cpw) {
      hint.textContent = 'Passwords match';
      hint.className   = 'match-hint ok';
      RSA.UI.markFieldSuccess(_els['confirm-password']);
    } else {
      hint.textContent = 'Passwords do not match';
      hint.className   = 'match-hint fail';
      RSA.UI.markFieldError(_els['confirm-password']);
    }
  }

  // ── FORM VALIDATION ───────────────────────────────────────────────────────────

  /**
   * Validates all form fields before submission.
   * Returns true if valid; shows an error and returns false otherwise.
   */
  function _validateForm() {
    var email    = _els['email'].value.trim();
    var pw       = _els['password'].value;
    var cpw      = _els['confirm-password'].value;
    var errEl    = _els['error-msg'];

    // Email presence
    if (!email) {
      RSA.UI.showError(errEl, 'Please enter your email address.');
      RSA.UI.markFieldError(_els['email']);
      return false;
    }

    // Email format
    if (!RSA.Validation.isValidEmail(email)) {
      RSA.UI.showError(errEl, 'Please enter a valid email address.');
      RSA.UI.markFieldError(_els['email']);
      return false;
    }

    // Password presence
    if (!pw) {
      RSA.UI.showError(errEl, 'Please enter a password.');
      RSA.UI.markFieldError(_els['password']);
      return false;
    }

    // Password strength
    if (RSA.Validation.getPasswordStrength(pw) < MIN_STRENGTH) {
      RSA.UI.showError(errEl, 'Your password is too weak. Please meet all the requirements shown.');
      RSA.UI.markFieldError(_els['password']);
      return false;
    }

    // Confirm password match
    if (pw !== cpw) {
      RSA.UI.showError(errEl, 'Passwords do not match. Please re-enter your confirm password.');
      RSA.UI.markFieldError(_els['confirm-password']);
      return false;
    }

    return true;
  }

  // ── SIGN UP ───────────────────────────────────────────────────────────────────

  /** Clears the form fields and resets all UI state after a successful sign-up. */
  function _resetForm() {
    _els['email'].value            = '';
    _els['password'].value         = '';
    _els['confirm-password'].value = '';
    _els['pw-strength'].style.display = 'none';
    _els['match-hint'].style.display  = 'none';
    RSA.UI.clearFieldError(_els['email']);
    RSA.UI.clearFieldError(_els['password']);
    RSA.UI.clearFieldError(_els['confirm-password']);
  }

  /**
   * Main sign-up handler.
   * 1. Validates form fields.
   * 2. Calls Supabase signUp().
   * 3. Guards against the silent-duplicate edge case (empty identities[]).
   * 4. On success: shows confirmation and redirects to login.html.
   */
  async function signup() {
    var btn    = _els['signup-btn'];
    var errEl  = _els['error-msg'];
    var okEl   = _els['success-msg'];

    // Hide any previous messages
    RSA.UI.hideMessage(errEl);
    RSA.UI.hideMessage(okEl);

    // Client-side validation
    if (!_validateForm()) return;

    var email = _els['email'].value.trim();
    var pw    = _els['password'].value;

    // Loading state
    RSA.UI.setLoading(btn, true, 'Creating account…');

    try {
      var newsletterOptedIn = !!(document.getElementById('signup-newsletter')?.checked);
      var result = await RSA.sb.auth.signUp({ email: email, password: pw, options: { data: { newsletter_opted_in: newsletterOptedIn } } });
      var data   = result.data;
      var error  = result.error;

      if (error) {
        // Supabase returns "User already registered" for duplicate emails
        var msg = (error.message && error.message.toLowerCase().includes('already registered'))
          ? 'An account with this email already exists. Please log in instead.'
          : (error.message || 'Sign up failed. Please try again.');
        RSA.UI.showError(errEl, msg);
        return;
      }

      // Silent duplicate: Supabase returns a user but with no identities
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        RSA.UI.showError(errEl, 'An account with this email already exists. Please log in instead.');
        return;
      }

      // Success
      _resetForm();
      RSA.UI.showSuccess(okEl, 'Account created! Check your email to confirm your address, then log in.');
      setTimeout(function () { window.location.href = 'login.html'; }, REDIRECT_DELAY_MS);

    } catch (err) {
      console.error('[signup:signup]', err);
      RSA.UI.showError(errEl, 'An unexpected error occurred. Please try again.');
    } finally {
      RSA.UI.setLoading(btn, false, 'Create account');
    }
  }

  // ── FIELD ERROR CLEAR HANDLERS ────────────────────────────────────────────────

  /** Clears the global error banner and field error state when the user edits a field. */
  function _clearErrorOnInput(inputEl) {
    inputEl.addEventListener('input', function () {
      RSA.UI.hideMessage(_els['error-msg']);
      RSA.UI.clearFieldError(inputEl);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────────

  /** Entry point — runs after the DOM is fully parsed. */
  function _init() {
    if (!_resolveElements()) {
      console.error('[signup:_init] One or more DOM elements are missing — aborting init.');
      return;
    }

    // Redirect already-logged-in users
    RSA.Auth.redirectIfLoggedIn('landlord.html');

    // Wire up form events
    _els['password'].addEventListener('input', _onPasswordInput);
    _els['confirm-password'].addEventListener('input', _onConfirmInput);
    _els['signup-btn'].addEventListener('click', signup);

    // Allow Enter key to submit from password fields
    _els['password'].addEventListener('keydown', function (e) {
      if (e.key === 'Enter') signup();
    });
    _els['confirm-password'].addEventListener('keydown', function (e) {
      if (e.key === 'Enter') signup();
    });
    _els['email'].addEventListener('keydown', function (e) {
      if (e.key === 'Enter') signup();
    });

    // Clear error state when user corrects a field
    _clearErrorOnInput(_els['email']);
    _clearErrorOnInput(_els['password']);
    _clearErrorOnInput(_els['confirm-password']);

    // Wire cookie banner buttons
    var cookieAccept  = document.getElementById('cookie-accept');
    var cookieDecline = document.getElementById('cookie-decline');
    if (cookieAccept)  cookieAccept.addEventListener('click', RSA.Cookies.accept);
    if (cookieDecline) cookieDecline.addEventListener('click', RSA.Cookies.decline);

    // Initialise cookie banner (shows if consent not yet recorded)
    RSA.Cookies.init();

    console.debug('[signup:_init] Signup page initialised.');
  }

  document.addEventListener('DOMContentLoaded', _init);

})();
