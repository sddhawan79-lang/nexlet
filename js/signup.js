/**
 * js/signup.js
 * Sign-up page logic for signup.html.
 * Dependencies: Supabase CDN, js/lib/supabase-client.js (window.sb)
 */
(function () {
  'use strict';

  // ── DOM REFS ──
  function _q(id) { return document.getElementById(id); }

  var _els = {};
  function _resolveEls() {
    var ids = ['email','password','confirm-password','signup-newsletter',
               'signup-btn','error-msg','success-msg','pw-strength',
               'bar1','bar2','bar3','bar4','pw-label',
               'rule-len','rule-upper','rule-lower','rule-num','rule-sym',
               'match-hint'];
    var ok = true;
    ids.forEach(function(id) {
      _els[id] = _q(id);
      if (!_els[id]) { console.error('[signup] missing element:', id); ok = false; }
    });
    return ok;
  }

  // ── PASSWORD CHECK ──
  var RULES = [
    { id:'rule-len',  fn:function(pw){ return pw.length >= 8; }},
    { id:'rule-upper',fn:function(pw){ return /[A-Z]/.test(pw); }},
    { id:'rule-lower',fn:function(pw){ return /[a-z]/.test(pw); }},
    { id:'rule-num',  fn:function(pw){ return /[0-9]/.test(pw); }},
    { id:'rule-sym',  fn:function(pw){ return /[!@#$%^&*_\\.-]/.test(pw); }}
  ];

  function _updateStrength(pw) {
    var el = _els['pw-strength'];
    if (el) el.style.display = 'block';
    var met = 0;
    RULES.forEach(function(r) {
      var ok = r.fn(pw);
      var row = _els[r.id];
      if (row) { row.classList.toggle('met', ok); }
      if (ok) met++;
    });
    var bars = [_els.bar1, _els.bar2, _els.bar3, _els.bar4];
    bars.forEach(function(b) {
      if (!b) return;
      b.className = '';
    });
    var label = _els['pw-label'];
    if (met <= 1) {
      bars.forEach(function(b) { if (b) b.className = 'weak'; });
      if (label) { label.textContent = 'Too weak'; label.style.color = 'var(--red)'; }
    } else if (met <= 3) {
      bars[0] && (bars[0].className = 'fair');
      bars[1] && (bars[1].className = 'fair');
      if (label) { label.textContent = 'Fair'; label.style.color = 'var(--amber)'; }
    } else if (met === 4) {
      bars.forEach(function(b, i) { if (b && i < 3) b.className = 'strong'; });
      if (label) { label.textContent = 'Good'; label.style.color = 'var(--green)'; }
    } else {
      bars.forEach(function(b) { if (b) b.className = 'strong'; });
      if (label) { label.textContent = 'Strong'; label.style.color = 'var(--green)'; }
    }
    return met;
  }

  // ── CONFIRM PASSWORD ──
  function _updateMatch() {
    var pw = (_els.password && _els.password.value) || '';
    var cp = (_els['confirm-password'] && _els['confirm-password'].value) || '';
    var hint = _els['match-hint'];
    if (!hint) return;
    if (!cp) { hint.style.display = 'none'; return; }
    hint.style.display = 'block';
    if (pw === cp) {
      hint.className = 'ok';
      hint.textContent = '\u2713 Passwords match';
    } else {
      hint.className = 'fail';
      hint.textContent = '\u2717 Passwords do not match';
    }
  }

  // ── ERROR / SUCCESS ──
  var _errTimer = null;
  function _showError(msg) {
    var el = _els['error-msg'];
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(_errTimer);
    _errTimer = setTimeout(function() { el.style.display = 'none'; }, 4000);
  }

  function _showSuccess(msg) {
    var el = _els['success-msg'];
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ── FORM SUBMISSION ──
  async function _submit() {
    var btn = _els['signup-btn'];
    var errEl = _els['error-msg'];
    if (errEl) errEl.style.display = 'none';
    var okEl = _els['success-msg'];
    if (okEl) okEl.style.display = 'none';

    var email = ((_els.email && _els.email.value) || '').trim();
    var pw = (_els.password && _els.password.value) || '';
    var cp = (_els['confirm-password'] && _els['confirm-password'].value) || '';
    var newsletter = _els['signup-newsletter'] ? _els['signup-newsletter'].checked : true;

    if (!email) { _showError('Please enter your email address.'); return; }
    if (!pw) { _showError('Please enter a password.'); return; }
    if (!cp) { _showError('Please confirm your password.'); return; }
    if (pw !== cp) { _showError('Passwords do not match.'); return; }

    var score = _updateStrength(pw);
    if (score < 2) { _showError('Password is too weak. Please choose a stronger password.'); return; }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Creating account...';
    }

    try {
      var result = await window.RSA.sb.auth.signUp({
        email: email,
        password: pw,
        options: { data: { newsletter_opted_in: newsletter } }
      });

      if (result.error) {
        var msg = result.error.message;
        if (msg && msg.toLowerCase().indexOf('already registered') !== -1) {
          msg = 'An account with this email already exists. Please log in instead.';
        }
        _showError(msg || 'Sign up failed. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }
        return;
      }

      if (result.data && result.data.user) {
        _showSuccess('\u2713 Account created! Check your email to confirm, then log in.');
        // Upsert newsletter preference — fire and forget
        var uid = result.data.user.id;
        var now = new Date().toISOString();
        window.RSA.sb.from('user_profiles').upsert({
          id: uid,
          newsletter_opted_in: newsletter,
          newsletter_opted_at: newsletter ? now : null
        }, { onConflict: 'id' }).then(function(){}, function(){});

        setTimeout(function() { window.location.href = 'login.html'; }, 2000);
      } else {
        _showError('Sign up failed. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }
      }

    } catch (err) {
      console.error('[signup]', err);
      _showError('An unexpected error occurred. Please try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }
    }
  }

  // ── INIT ──
  async function _init() {
    // Wait for Supabase client (stored on RSA namespace by js/lib/supabase-client.js)
    var tries = 0;
    while (!(window.RSA && window.RSA.sb) && tries < 40) {
      await new Promise(function(r) { setTimeout(r, 50); });
      tries++;
    }
    if (!(window.RSA && window.RSA.sb)) {
      console.error('[signup] Supabase client not loaded');
      _showError('Service unavailable. Please refresh the page.');
      return;
    }

    // Check if already logged in
    try {
      var session = await window.RSA.sb.auth.getSession();
      if (session && session.data && session.data.session) {
        window.location.href = 'landlord.html';
        return;
      }
    } catch(e) {}

    if (!_resolveEls()) return;

    var pw = _els.password;
    var cp = _els['confirm-password'];

    if (pw) {
      pw.addEventListener('input', function() { _updateStrength(pw.value); });
      pw.addEventListener('input', _updateMatch);
    }
    if (cp) {
      cp.addEventListener('input', _updateMatch);
    }

    var btn = _els['signup-btn'];
    if (btn) {
      btn.addEventListener('click', _submit);
    }
  }

  document.addEventListener('DOMContentLoaded', _init);
})();
