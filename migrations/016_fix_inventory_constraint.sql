-- Migration 016: Fix inventory unique constraint for multiple warehouses
-- This patches databases where 015 ran but left the old constraint intact,
-- or where the constraint was named differently than expected.
-- Safe to re-run.

-- Ensure warehouses table exists (safety net if 015 was partial)
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default warehouse if none exists
INSERT INTO warehouses (name, location) 
VALUES ('Main Warehouse', 'Central Facility') 
ON CONFLICT (name) DO NOTHING;

-- Ensure warehouse_id column exists on inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE;

-- Map any un-assigned rows to the default warehouse
UPDATE inventory 
SET warehouse_id = (SELECT id FROM warehouses ORDER BY id LIMIT 1)
WHERE warehouse_id IS NULL;

-- Drop ALL known variants of the old single-column unique constraint on item_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_item_id') THEN
    ALTER TABLE inventory DROP CONSTRAINT unique_item_id;
    RAISE NOTICE 'Dropped constraint: unique_item_id';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_id_unique') THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_item_id_unique;
    RAISE NOTICE 'Dropped constraint: inventory_item_id_unique';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_id_key') THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_item_id_key;
    RAISE NOTICE 'Dropped constraint: inventory_item_id_key';
  END IF;
END $$;

-- Add the correct compound unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_warehouse_unique') THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_item_warehouse_unique UNIQUE (item_id, warehouse_id);
    RAISE NOTICE 'Added constraint: inventory_item_warehouse_unique';
  END IF;
END $$;

-- Ensure logs table has warehouse columns
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS target_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
