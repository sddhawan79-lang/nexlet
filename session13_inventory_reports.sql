-- inventory_reports table — AI-generated room-by-room condition reports
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inventory_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_id         uuid REFERENCES properties(id) ON DELETE SET NULL,
  type            text NOT NULL,
  report_text     text NOT NULL,
  photos          jsonb DEFAULT '[]',
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS: users can only see own reports
ALTER TABLE inventory_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own inventory reports"
  ON inventory_reports
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for fast property lookup
CREATE INDEX idx_inventory_reports_prop ON inventory_reports(prop_id);
CREATE INDEX idx_inventory_reports_user ON inventory_reports(user_id);
