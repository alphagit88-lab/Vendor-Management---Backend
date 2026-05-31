-- Migration 015: Multiple Warehouses Support
-- Safe to re-run

-- 1. Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed default Main Warehouse
INSERT INTO warehouses (name, location) 
VALUES ('Main Warehouse', 'Central Facility') 
ON CONFLICT (name) DO NOTHING;

-- 3. Add warehouse_id column to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE;

-- 4. Map existing inventory rows to the default warehouse
UPDATE inventory 
SET warehouse_id = (SELECT id FROM warehouses WHERE name = 'Main Warehouse') 
WHERE warehouse_id IS NULL;

-- 5. Set warehouse_id NOT NULL
ALTER TABLE inventory ALTER COLUMN warehouse_id SET NOT NULL;

-- 6. Re-configure constraints on inventory
-- Drop any old single-column unique constraint on item_id (handles all known naming variants)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_item_id') THEN
    ALTER TABLE inventory DROP CONSTRAINT unique_item_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_id_unique') THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_item_id_unique;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_id_key') THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_item_id_key;
  END IF;
END $$;

-- Add new compound unique constraint (item_id, warehouse_id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_warehouse_unique') THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_item_warehouse_unique UNIQUE (item_id, warehouse_id);
  END IF;
END $$;

-- 7. Add columns to inventory_logs
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS target_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
