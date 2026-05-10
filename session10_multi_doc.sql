-- ============================================================
-- SESSION 10 — Multi-Document KYC Support
-- Removes the one-doc-per-slot limitation on tenant_documents.
-- Adds AI extraction columns for issuing authority and
-- auto-detected document type.
--
-- Run this in Supabase SQL Editor ONCE.
-- ============================================================

-- 1. Remove the unique constraint that prevents multiple docs per slot
DROP INDEX IF EXISTS tenant_documents_slot_unique;

-- 2. Add new AI extraction columns
ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS issuing_authority  text;
ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS doc_type_extracted text;

-- 3. Verify changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_documents'
ORDER BY ordinal_position;
