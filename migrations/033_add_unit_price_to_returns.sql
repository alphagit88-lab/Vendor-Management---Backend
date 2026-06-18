-- Migration: Add unit_price to returns
ALTER TABLE returns ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12, 2) DEFAULT NULL;
