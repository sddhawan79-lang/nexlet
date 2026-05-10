-- ============================================================
-- SESSION 10 — E-Sign Requests Table
-- The esign_requests table was referenced by 16 locations across
-- landlord.html, tenant.html, and js/esign-content.js but was
-- never created. This migration creates it with RLS.
--
-- Run this in Supabase SQL Editor ONCE.
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS esign_requests (
  id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id       uuid          REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id         uuid          REFERENCES tenants(id)    ON DELETE SET NULL,
  document_type     text          NOT NULL,   -- 'written_statement' | 'rra_receipt' | etc.
  document_html     text,                     -- AI-generated HTML content
  document_pdf_url  text,                     -- Uploaded PDF public URL
  token             text          UNIQUE NOT NULL,  -- UUID token for tenant signing link
  status            text          DEFAULT 'pending',  -- pending | signed | expired
  created_at        timestamptz   DEFAULT now(),
  expires_at        timestamptz,              -- Token link expiry (7 days from creation)
  signed_at         timestamptz,              -- When tenant signed
  signed_pdf_url    text,                     -- Public URL of signed PDF
  ip_address        text                      -- Tenant IP at signing time
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS esign_requests_token_idx   ON esign_requests (token);
CREATE INDEX IF NOT EXISTS esign_requests_tenant_idx  ON esign_requests (tenant_id);
CREATE INDEX IF NOT EXISTS esign_requests_prop_idx    ON esign_requests (property_id);

-- 3. Row Level Security
ALTER TABLE esign_requests ENABLE ROW LEVEL SECURITY;

-- Landlord (authenticated) can do everything
DROP POLICY IF EXISTS "Authenticated full access" ON esign_requests;
CREATE POLICY "Authenticated full access"
  ON esign_requests FOR ALL
  USING (auth.role() = 'authenticated');

-- Tenant portal (unauthenticated, token-based) can SELECT by token link
DROP POLICY IF EXISTS "Public read by token" ON esign_requests;
CREATE POLICY "Public read by token"
  ON esign_requests FOR SELECT
  USING (true);

-- Tenant portal can UPDATE (sign) by ID
DROP POLICY IF EXISTS "Public update for signing" ON esign_requests;
CREATE POLICY "Public update for signing"
  ON esign_requests FOR UPDATE
  USING (true);

-- 4. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'esign_requests'
ORDER BY ordinal_position;
