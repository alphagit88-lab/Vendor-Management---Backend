-- Migration 022: Add enable_par_levels to users table
-- Safe to re-run
ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_par_levels BOOLEAN DEFAULT TRUE;
UPDATE users SET enable_par_levels = TRUE WHERE enable_par_levels IS NULL;
