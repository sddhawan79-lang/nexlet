-- Session 18: Feedback Table v2 — Urgency + File Support
-- Run in Supabase SQL Editor.
-- Depends on: feedback table already created (sprint11_feedback_table.sql)

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('low','medium','high','critical')) DEFAULT 'medium';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS files   TEXT[] DEFAULT '{}';

COMMENT ON COLUMN feedback.urgency IS 'Urgency level: low, medium, high, critical';
COMMENT ON COLUMN feedback.files IS 'Array of file paths in Storage bucket (documents/feedback/{userId}/...)';
