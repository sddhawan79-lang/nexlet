-- ============================================================
-- RENT PAYMENTS TABLE — Full Schema & Fixes
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. CREATE TABLE if not exists (full definition with all columns)
CREATE TABLE IF NOT EXISTS rent_payments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_id    uuid REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id  uuid REFERENCES tenants(id) ON DELETE SET NULL,
  amount     numeric DEFAULT 0,
  month      text,
  due_date   date,
  paid_date  date,
  status     text DEFAULT 'Due',
  notes      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. ADD MISSING COLUMNS (if table already existed without them)
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS month     text;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS notes     text;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_rp_prop   ON rent_payments(prop_id);
CREATE INDEX IF NOT EXISTS idx_rp_tenant ON rent_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rp_user   ON rent_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rp_due    ON rent_payments(due_date);

-- 4. ROW LEVEL SECURITY
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own rent payments" ON rent_payments;
CREATE POLICY "Users can CRUD own rent payments"
  ON rent_payments
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. VERIFY
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rent_payments'
ORDER BY ordinal_position;
