-- ============================================================
-- NEXLET — cron_setup.sql
-- Run in Supabase SQL Editor to schedule email-alert jobs.
--
-- Replaces the old sprint 10 cron jobs with the new branded
-- email system. Unschedules old jobs, creates 3 new ones.
-- ============================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Remove old Sprint 10 jobs ─────────────────────────────────
SELECT cron.unschedule('rentsafeai-daily-alerts')   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rentsafeai-daily-alerts');
SELECT cron.unschedule('rentsafeai-weekly-summary') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rentsafeai-weekly-summary');
SELECT cron.unschedule('rentsafeai-monthly-purge')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rentsafeai-monthly-purge');

-- Also remove any prior runs of this script
SELECT cron.unschedule('weekly-digest') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest');
SELECT cron.unschedule('daily-expiry')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-expiry');
SELECT cron.unschedule('daily-trial')   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-trial');


-- ════════════════════════════════════════════════════════════
-- JOB 1: WEEKLY COMPLIANCE DIGEST — Every Sunday at 08:00 UTC
--
-- Sends the branded compliance digest (Template 1) to all
-- users with newsletter_opted_in = true.
-- ════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'weekly-digest',
  '0 8 * * 0',   -- 08:00 UTC every Sunday
  $$
  SELECT net.http_post(
    url := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CURRENT_SERVICE_ROLE_KEY'
    ),
    body := '{"type":"cron_digest"}'::jsonb
  ) AS request_id;
  $$
);


-- ════════════════════════════════════════════════════════════
-- JOB 2: CERTIFICATE EXPIRY CHECK — Every day at 07:00 UTC
--
-- Checks all certificates expiring in 60, 30, or 14 days.
-- Only sends to users with newsletter_opted_in = true.
-- ════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'daily-expiry',
  '0 7 * * *',   -- 07:00 UTC daily
  $$
  SELECT net.http_post(
    url := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CURRENT_SERVICE_ROLE_KEY'
    ),
    body := '{"type":"cron_expiry"}'::jsonb
  ) AS request_id;
  $$
);


-- ════════════════════════════════════════════════════════════
-- JOB 3: TRIAL EXPIRY WARNING — Every day at 07:00 UTC
--
-- Checks user_profiles.trial_expires_at. Fires on day 25
-- and day 30. Skips users with an active stripe_subscriptions
-- row (they have already subscribed).
-- ════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'daily-trial',
  '0 7 * * *',   -- 07:00 UTC daily
  $$
  SELECT net.http_post(
    url := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CURRENT_SERVICE_ROLE_KEY'
    ),
    body := '{"type":"cron_trial"}'::jsonb
  ) AS request_id;
  $$
);


-- ── Verify jobs were created ──────────────────────────────────
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('weekly-digest', 'daily-expiry', 'daily-trial')
ORDER BY jobid;


-- ── Check job run history (after first run): ──────────────────
-- SELECT jrd.jobid, j.jobname, jrd.start_time, jrd.end_time,
--        jrd.status, jrd.return_message
-- FROM cron.job_run_details jrd
-- JOIN cron.job j ON j.jobid = jrd.jobid
-- WHERE j.jobname IN ('weekly-digest', 'daily-expiry', 'daily-trial')
-- ORDER BY jrd.start_time DESC LIMIT 20;


-- ════════════════════════════════════════════════════════════
-- MANUAL TEST QUERIES (replace CURRENT_SERVICE_ROLE_KEY)
-- Run in SQL Editor to trigger immediately:
-- ════════════════════════════════════════════════════════════

-- Test compliance digest:
-- SELECT net.http_post(
--   url := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer CURRENT_SERVICE_ROLE_KEY'
--   ),
--   body := '{"type":"cron_digest"}'::jsonb
-- );

-- Test cert expiry check:
-- SELECT net.http_post(
--   url := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer CURRENT_SERVICE_ROLE_KEY'
--   ),
--   body := '{"type":"cron_expiry"}'::jsonb
-- );

-- Test trial expiry check:
-- SELECT net.http_post(
--   url := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer CURRENT_SERVICE_ROLE_KEY'
--   ),
--   body := '{"type":"cron_trial"}'::jsonb
-- );

-- ============================================================
-- BEFORE RUNNING THIS SCRIPT:
-- 1. Replace CURRENT_SERVICE_ROLE_KEY (2 occurrences per job
--    above — 6 total) with the actual service_role key from
--    Supabase Dashboard → Settings → API → service_role
-- 2. Ensure the email-alerts edge function is deployed
-- 3. Ensure RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY secrets
--    exist in Supabase Dashboard → Edge Functions → Secrets
-- ============================================================
