-- Add trial fields to user_profiles table
-- Run this in Supabase SQL Editor
-- Required for the 30-day free trial system

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan_activated_at timestamptz;

-- Migrate existing users: set trial as expired, plan to 'portfolio' (grandfather)
UPDATE user_profiles SET plan = 'portfolio' WHERE plan IS NULL OR plan = 'trial';
UPDATE user_profiles SET trial_expires_at = now() WHERE trial_expires_at IS NULL;
