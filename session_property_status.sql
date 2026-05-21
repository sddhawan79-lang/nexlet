-- session_property_status.sql
-- Adds property status, archive, tenancy timeline, and furnished columns to properties table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mahtcfukgzbonwibtsxz
-- Date: 20 May 2026

-- Property status & archive columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS archive_reason text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS archive_reason_detail text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Tenancy timeline columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vacant_since timestamptz;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tenancy_started_at timestamptz;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tenancy_ended_at timestamptz;

-- Furnished status (for PAT cert filter)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furnished boolean;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furnished_status text;

-- Backfill: set status = 'active' for existing properties that have no status
UPDATE properties SET status = 'active' WHERE status IS NULL;
