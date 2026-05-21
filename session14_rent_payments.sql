-- rent_payments table — tracks rent payment records per property/tenant
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rent_payments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_id    uuid REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL,
  amount     numeric DEFAULT 0,
  due_date   date,
  paid_date  date,
  status     text DEFAULT 'Due',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns if table already existed
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS month text;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- Index for fast tenant+property lookups
CREATE INDEX IF NOT EXISTS idx_rp_prop ON rent_payments(prop_id);
CREATE INDEX IF NOT EXISTS idx_rp_tenant ON rent_payments(tenant_id);

-- RLS
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own rent payments"
  ON rent_payments
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
