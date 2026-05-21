-- session_archive.sql
-- Adds account deletion support + tenancy archiving columns.
-- Run in Supabase SQL Editor.
-- Date: May 2026

-- ── ACCOUNT DELETION: soft-delete for user_profiles ──
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ── TENANCY ARCHIVING ──
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS end_reason text DEFAULT NULL;

-- Index for filtering archived tenants
CREATE INDEX IF NOT EXISTS idx_tenants_archived ON tenants(user_id, archived) WHERE archived = true;

-- Update RLS: users can read their own archived tenants (read-only in the app)
-- Existing RLS already covers SELECT by user_id, so no change needed.
-- For UPDATE, the app will only allow status changes (Active→Ended) via client code.
