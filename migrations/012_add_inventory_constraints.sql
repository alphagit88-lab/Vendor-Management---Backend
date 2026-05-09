-- Migration 012: Add explicit constraint names for inventory updates

-- 1. Fix 'inventory' table (Warehouse)
-- The application code expects the constraint name to be 'inventory_item_id_unique'

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_id_unique') THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_item_id_unique UNIQUE (item_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Skipping inventory_item_id_unique due to duplicate rows. Run scripts/fix_constraints.js first.';
END $$;


-- 2. Fix 'salesperson_inventory' table
-- The application code expects the constraint name to be 'salesperson_item_user_unique'

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_salesperson_item') THEN
    ALTER TABLE salesperson_inventory DROP CONSTRAINT unique_salesperson_item;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salesperson_item_user_unique') THEN
    ALTER TABLE salesperson_inventory ADD CONSTRAINT salesperson_item_user_unique UNIQUE (item_id, user_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Skipping salesperson_item_user_unique due to duplicate rows. Run scripts/fix_constraints.js first.';
END $$;
