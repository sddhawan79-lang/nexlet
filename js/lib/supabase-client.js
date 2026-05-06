/**
 * js/lib/supabase-client.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Supabase client instance shared across all pages.
 *
 * Usage (after this script has loaded):
 *   const sb = window.RSA.sb;
 *
 * IMPORTANT: The Supabase CDN <script> tag must appear in HTML before this
 * file is loaded so that `window.supabase` is available.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // Guard: Supabase CDN must be loaded first
  if (!window.supabase) {
    console.error('[supabase-client] Supabase CDN not loaded. Add the CDN <script> before this file.');
    return;
  }

  const SUPABASE_URL      = 'https://mahtcfukgzbonwibtsxz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1haHRjZnVrZ3pib253aWJ0c3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjQ2MDAsImV4cCI6MjA5MTIwMDYwMH0.-wC55rGp1WFKfjKR3EhuXqAPDiWJ4w_e2LBXjHr_y5Y';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Attach to global RSA namespace
  window.RSA       = window.RSA || {};
  window.RSA.sb    = sb;
})();
