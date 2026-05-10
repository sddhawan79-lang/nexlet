-- ============================================================
-- SESSION 10 — Tenants Table: Add Missing Columns
-- The _saveTenantSetupToDB function and various UI/alert
-- features reference columns that don't exist in the DB yet.
-- Run this in Supabase SQL Editor ONCE.
-- ============================================================

-- 1. Tenancy type (APT / AST / Company let)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS type             text;

-- 2. Rent tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rent_day         int     DEFAULT 1;

-- 3. Deposit
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS scheme_ref       text;

-- 4. Right to Rent (RTR) compliance fields
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_doc_type     text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_ref          text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_check_date   date;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_checked_by   text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_expiry       date;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_skipped      boolean DEFAULT false;

-- 5. Address proof documents
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS addr_proof_1     text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS addr_proof_2     text;

-- 6. Lead tenant flag
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_lead          boolean DEFAULT false;

-- 7. Portal invite tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invite_used      boolean DEFAULT false;

-- 8. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
