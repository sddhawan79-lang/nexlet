-- Add compliance_checklist JSONB column to tenants table
-- Run this in Supabase SQL Editor
-- Required for the tenant compliance checklist feature (RAG status tracking)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_checklist JSONB DEFAULT '{}';
