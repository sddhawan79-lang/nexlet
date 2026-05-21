/**
 * js/profile.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Account & Billing page logic.
 *
 * Responsibilities:
 *   1. Require authenticated session (redirect to login.html if none)
 *   2. Display the logged-in user's email (immutable)
 *   3. Load / save personal details to the user_profiles table
 *   4. Load subscription status from stripe_subscriptions table
 *   5. Initiate Stripe Checkout via the stripe-checkout Edge Function
 *   6. Handle Stripe redirect params (?success=true / ?canceled=true)
 *
 * Depends on: js/lib/supabase-client.js, js/lib/auth.js, js/lib/ui.js
 * Exposed globals: none (fully self-contained IIFE)
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── PRIVATE STATE ────────────────────────────────────────────────────────────
  var _userId    = null;
  var _userEmail = null;

  // ── INIT ─────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async function () {

    // Redirect to login if no active session
    await window.RSA.Auth.requireSession('login.html');

    var session = await window.RSA.Auth.getSession();
    if (!session) return; // requireSession will have redirected

    _userId    = session.user.id;
    _userEmail = session.user.email;

    // Populate immutable email display
    var emailEl = document.getElementById('prof-email');
    if (emailEl) emailEl.textContent = _userEmail;

    // Handle ?success=true / ?canceled=true from Stripe redirect
    _handleStripeRedirect();

    // Load profile data and subscription in parallel
    await Promise.all([_loadProfile(), _loadSubscription()]);

    // Wire events
    var saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.addEventListener('click', _saveProfile);

    document.querySelectorAll('.plan-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _startCheckout(btn.dataset.price);
      });
    });
  });


  // ── STRIPE REDIRECT HANDLER ──────────────────────────────────────────────────

  /** Shows success or canceled banner when returning from Stripe Checkout. */
  function _handleStripeRedirect() {
    var params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      var okEl = document.getElementById('stripe-success');
      if (okEl) okEl.style.display = 'block';
      // Clean the URL without a page reload
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      var cancelEl = document.getElementById('stripe-canceled');
      if (cancelEl) cancelEl.style.display = 'block';
      window.history.replaceState({}, '', window.location.pathname);
    }
  }


  // ── DATA LOADING ──────────────────────────────────────────────────────────────

  /** Loads personal details from user_profiles and populates the form. */
  async function _loadProfile() {
    try {
      var sb = window.RSA.sb;
      var result = await sb
        .from('user_profiles')
        .select('full_name, phone, company_name, address, utr_number')
        .eq('id', _userId)
        .single();

      // PGRST116 = no rows found — that's fine for a new user
      if (result.error && result.error.code !== 'PGRST116') {
        console.error('[profile:_loadProfile]', result.error);
        return;
      }

      if (result.data) {
        _setField('full-name',    result.data.full_name);
        _setField('phone',        result.data.phone);
        _setField('company-name', result.data.company_name);
        _setField('address',      result.data.address);
        _setField('utr-number',   result.data.utr_number);
      }
    } catch (err) {
      console.error('[profile:_loadProfile]', err);
    }
  }

  /** Loads subscription status from stripe_subscriptions and updates plan UI. */
  async function _loadSubscription() {
    try {
      var sb = window.RSA.sb;
      var result = await sb
        .from('stripe_subscriptions')
        .select('plan_name, status, current_period_end, cancel_at_period_end')
        .eq('user_id', _userId)
        .single();

      // PGRST116 = no subscription — that's normal for free users
      if (result.error && result.error.code !== 'PGRST116') {
        console.error('[profile:_loadSubscription]', result.error);
        return;
      }

      if (result.data && (result.data.status === 'active' || result.data.status === 'trialing')) {
        _renderActivePlan(result.data);
      }
    } catch (err) {
      console.error('[profile:_loadSubscription]', err);
    }
  }


  // ── PROFILE SAVE ──────────────────────────────────────────────────────────────

  /** Upserts personal details to user_profiles table. */
  async function _saveProfile() {
    var btn   = document.getElementById('save-btn');
    var errEl = document.getElementById('prof-error');
    var okEl  = document.getElementById('prof-success');

    window.RSA.UI.hideMessage(errEl);
    window.RSA.UI.hideMessage(okEl);
    window.RSA.UI.setLoading(btn, true, 'Saving\u2026');

    try {
      var sb = window.RSA.sb;
      var result = await sb.from('user_profiles').upsert(
        {
          id:           _userId,
          full_name:    _getField('full-name'),
          phone:        _getField('phone'),
          company_name: _getField('company-name'),
          address:      _getField('address'),
          utr_number:   _getField('utr-number'),
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (result.error) {
        console.error('[profile:_saveProfile]', result.error);
        window.RSA.UI.showError(errEl, 'Failed to save: ' + result.error.message);
        return;
      }

      window.RSA.UI.showSuccess(okEl, 'Profile saved successfully.');
    } catch (err) {
      console.error('[profile:_saveProfile]', err);
      window.RSA.UI.showError(errEl, 'Unexpected error. Please try again.');
    } finally {
      window.RSA.UI.setLoading(btn, false, 'Save Changes');
    }
  }


  // ── STRIPE CHECKOUT ───────────────────────────────────────────────────────────

  /**
   * Calls the stripe-checkout Edge Function to create a Stripe Checkout Session,
   * then redirects the user to the Stripe-hosted payment page.
   *
   * NOTE: No Stripe.js SDK is needed for Hosted Checkout — we simply redirect
   * the browser to the URL returned by our Edge Function.
   *
   * @param {string} priceId  Stripe Price ID
   */
  async function _startCheckout(priceId) {
    var btn   = document.querySelector('.plan-btn[data-price="' + priceId + '"]');
    var errEl = document.getElementById('billing-error');

    window.RSA.UI.hideMessage(errEl);
    if (btn) window.RSA.UI.setLoading(btn, true, 'Redirecting\u2026');

    try {
      var sb = window.RSA.sb;

      // supabase.functions.invoke() automatically includes the user's JWT
      var result = await sb.functions.invoke('stripe-checkout', {
        body: { price_id: priceId },
      });

      if (result.error) {
        console.error('[profile:_startCheckout]', result.error);
        window.RSA.UI.showError(errEl, 'Could not start checkout. Please try again.');
        if (btn) window.RSA.UI.setLoading(btn, false, 'Subscribe');
        return;
      }

      if (result.data && result.data.url) {
        // Open Stripe Checkout in a new tab
        window.open(result.data.url, '_blank');
        if (btn) window.RSA.UI.setLoading(btn, false, 'Subscribe');
      } else {
        window.RSA.UI.showError(errEl, 'Unexpected response from payment service. Please try again.');
        if (btn) window.RSA.UI.setLoading(btn, false, 'Subscribe');
      }
    } catch (err) {
      console.error('[profile:_startCheckout]', err);
      window.RSA.UI.showError(errEl, 'Unexpected error. Please try again.');
      if (btn) window.RSA.UI.setLoading(btn, false, 'Subscribe');
    }
  }


  // ── SUBSCRIPTION DISPLAY ──────────────────────────────────────────────────────

  /**
   * Shows the current plan banner and marks the matching plan card.
   * @param {{ plan_name: string, status: string, current_period_end: string, cancel_at_period_end: boolean }} sub
   */
  function _renderActivePlan(sub) {
    var wrap      = document.getElementById('current-plan-wrap');
    var nameEl    = document.getElementById('current-plan-name');
    var detailEl  = document.getElementById('current-plan-detail');

    var LABELS = { starter: 'Starter', landlord: 'Landlord', portfolio: 'Portfolio' };
    var label = LABELS[sub.plan_name] || sub.plan_name;

    if (nameEl)  nameEl.textContent  = label + ' Plan';

    if (detailEl && sub.current_period_end) {
      var date = new Date(sub.current_period_end).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      if (sub.cancel_at_period_end) {
        detailEl.textContent = 'Cancels on ' + date;
        detailEl.className   = 'current-plan-detail canceling';
      } else {
        detailEl.textContent = 'Renews ' + date;
        detailEl.className   = 'current-plan-detail';
      }
    }

    if (wrap) wrap.style.display = 'flex';

    // Highlight the matching plan card and disable its button
    var card = document.getElementById('plan-' + sub.plan_name);
    if (card) {
      card.classList.add('plan-current');
      var planBtn = card.querySelector('.plan-btn');
      if (planBtn) {
        planBtn.textContent = 'Current Plan';
        planBtn.disabled    = true;
        planBtn.classList.remove('plan-btn-featured');
      }
    }
  }


  // ── DOM HELPERS ───────────────────────────────────────────────────────────────

  /** Returns the trimmed value of a form field by its ID. */
  function _getField(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /** Sets the value of a form field by its ID (empty string if falsy). */
  function _setField(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || '';
  }

})();
