-- sprint10_fix_cron_key.sql
-- Replaces YOUR_SERVICE_ROLE_KEY placeholder in cron jobs with the actual key.
-- Run this in Supabase SQL Editor AFTER getting your key from:
--   Supabase Dashboard → Settings → API → service_role (reveal & copy)
--
-- ⚠️ REPLACE 'sk_live_abc...' BELOW with your actual service_role key before running!

-- Step 1: Drop old jobs (they have the placeholder key)
SELECT cron.unschedule('rentsafeai-daily-alerts')   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rentsafeai-daily-alerts');
SELECT cron.unschedule('rentsafeai-weekly-summary') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rentsafeai-weekly-summary');

-- Step 2: Re-create with REAL service role key
SELECT cron.schedule(
  'rentsafeai-daily-alerts',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sk_live_abc123_REPLACE_WITH_YOUR_ACTUAL_KEY'
    ),
    body    := '{"type":"daily"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'rentsafeai-weekly-summary',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/email-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sk_live_abc123_REPLACE_WITH_YOUR_ACTUAL_KEY'
    ),
    body    := '{"type":"weekly_summary"}'::jsonb
  ) AS request_id;
  $$
);

-- Step 3: Verify jobs exist
SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'rentsafeai%';
