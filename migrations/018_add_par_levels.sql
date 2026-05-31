-- Migration 018: Add par_levels column to customers
CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY); -- placeholder to ensure table exists

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS par_levels JSONB NOT NULL DEFAULT '{}'::jsonb;
