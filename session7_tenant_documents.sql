-- ============================================================
-- SESSION 7 — Tenant Documents Table
-- Creates the tenant_documents table used by:
--   - uploadTenantDoc() — KYC document upload
--   - scanTenantDoc()   — AI document scanning
--   - verifyTenantDoc() — Landlord verification
--   - deleteTenantDoc() — Document removal
--   - exportEvidenceBundle() — PDF evidence bundle
--
-- Run this in Supabase SQL Editor ONCE before using
-- the Tenant KYC / document scanning features.
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_documents (
  id                    uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             uuid          REFERENCES tenants(id)     ON DELETE CASCADE,
  prop_id               uuid          REFERENCES properties(id)  ON DELETE SET NULL,
  user_id               uuid          REFERENCES auth.users(id)  ON DELETE CASCADE,

  -- Document slot (one per category per tenant)
  slot                  text          NOT NULL,  -- 'passport' | 'right_to_rent' | 'address_1' | 'address_2' | 'reference' | 'guarantor'
  doc_type              text,                    -- user-facing label
  doc_label             text,                    -- original filename
  file_name             text,                    -- Supabase Storage path: {user_id}/{tenant_id}/{slot}_{timestamp}.{ext}

  -- AI-extracted fields (populated by scanTenantDoc via Claude)
  extracted_name        text,                    -- Full name from document
  extracted_doc_number  text,                    -- Passport/ID number, doc type, or referee company
  extracted_expiry      date,                    -- Document expiry date
  extracted_address     text,                    -- Address from document
  share_code            text,                    -- Right to Rent share code (if applicable)
  share_code_expiry     date,                    -- Share code expiry

  -- Verification
  name_mismatch         boolean       DEFAULT false,  -- true if AI detected name differs from tenant record
  verified              boolean       DEFAULT false,  -- landlord has manually confirmed document

  uploaded_at           timestamptz   DEFAULT now(),
  updated_at            timestamptz   DEFAULT now()
);

-- One document per slot per tenant (upsert constraint)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_documents_slot_unique
  ON tenant_documents (tenant_id, slot);

-- Performance indexes
CREATE INDEX IF NOT EXISTS tenant_documents_tenant_idx ON tenant_documents (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_documents_user_idx   ON tenant_documents (user_id);

-- Row Level Security
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlords manage own tenant documents" ON tenant_documents;
CREATE POLICY "Landlords manage own tenant documents"
  ON tenant_documents
  FOR ALL
  USING (user_id = auth.uid());

-- Storage bucket: tenant-documents
-- IMPORTANT: Also create the storage bucket in Supabase Dashboard → Storage
-- Bucket name: tenant-documents
-- Access: Private (landlord access via signed URLs only)
-- RLS policy on storage:
--   Allow authenticated users to upload/read/delete files
--   where (storage.foldername(name))[1] = auth.uid()::text

-- Verify the table was created
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_documents'
ORDER BY ordinal_position;
