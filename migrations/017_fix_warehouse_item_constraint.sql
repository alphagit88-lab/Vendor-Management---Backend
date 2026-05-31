-- Migration 017: Drop remaining legacy inventory unique constraints
-- Safe to re-run.

-- Drop the unique_warehouse_item constraint (another old naming variant)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_warehouse_item') THEN
    ALTER TABLE inventory DROP CONSTRAINT unique_warehouse_item;
    RAISE NOTICE 'Dropped constraint: unique_warehouse_item';
  END IF;
END $$;

-- Catch any other remaining single-column unique constraints on item_id
DO $$ BEGIN
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN 
      SELECT c.conname 
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE t.relname = 'inventory'
        AND c.contype = 'u'
        AND a.attname = 'item_id'
        AND array_length(c.conkey, 1) = 1  -- single-column constraint only
    LOOP
      EXECUTE 'ALTER TABLE inventory DROP CONSTRAINT ' || quote_ident(r.conname);
      RAISE NOTICE 'Dropped single-column constraint: %', r.conname;
    END LOOP;
  END;
END $$;

-- Ensure the correct compound unique constraint exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_warehouse_unique') THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_item_warehouse_unique UNIQUE (item_id, warehouse_id);
    RAISE NOTICE 'Added constraint: inventory_item_warehouse_unique';
  END IF;
END $$;
