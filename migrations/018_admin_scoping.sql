-- Migration 018: Add admin scoping for multi-tenancy isolation
-- Safe to re-run

-- 1. Add admin_id to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE customers SET admin_id = 1 WHERE admin_id IS NULL;

-- 2. Add admin_id to customer_groups
ALTER TABLE customer_groups ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE customer_groups SET admin_id = 1 WHERE admin_id IS NULL;

-- Drop unique constraint on name if it exists and make it unique per admin
ALTER TABLE customer_groups DROP CONSTRAINT IF EXISTS customer_groups_name_key;
DROP INDEX IF EXISTS unique_customer_groups_name_admin;
CREATE UNIQUE INDEX unique_customer_groups_name_admin ON customer_groups (name, COALESCE(admin_id, 0));

-- 3. Add admin_id to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE categories SET admin_id = 1 WHERE admin_id IS NULL;

-- 4. Add admin_id to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE items SET admin_id = 1 WHERE admin_id IS NULL;

-- 5. Add admin_id to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Drop unique constraint on key
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;
DROP INDEX IF EXISTS unique_settings_key_admin_id;
CREATE UNIQUE INDEX unique_settings_key_admin_id ON settings (key, COALESCE(admin_id, 0));
