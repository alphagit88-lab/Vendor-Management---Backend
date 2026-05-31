-- Migration 021: Add admin_id to warehouses for multi-tenant support
-- Safe to re-run

-- 1. Add admin_id to warehouses
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE warehouses SET admin_id = 1 WHERE admin_id IS NULL;
