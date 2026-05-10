-- ============================================================
-- SESSION 11 — Landlord Signature Columns for E-Sign
-- Adds landlord signature fields so both landlord and tenant
-- signatures appear in the final signed PDF.
--
-- Run this in Supabase SQL Editor.
-- ============================================================

ALTER TABLE esign_requests ADD COLUMN IF NOT EXISTS landlord_name      text;
ALTER TABLE esign_requests ADD COLUMN IF NOT EXISTS landlord_signed_at timestamptz;
ALTER TABLE esign_requests ADD COLUMN IF NOT EXISTS landlord_sig_png   text;   -- base64 PNG data URL

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'esign_requests' ORDER BY ordinal_position;
