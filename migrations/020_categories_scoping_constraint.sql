-- Migration 020: Make categories.name unique per admin
-- Safe to re-run

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
DROP INDEX IF EXISTS unique_categories_name_admin;
CREATE UNIQUE INDEX unique_categories_name_admin ON categories (name, COALESCE(admin_id, 0));
