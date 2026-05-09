-- Add is_checklist field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_checklist BOOLEAN DEFAULT FALSE;
