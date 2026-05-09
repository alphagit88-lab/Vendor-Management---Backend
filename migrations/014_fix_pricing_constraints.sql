-- Migration 014: Fix Customer Item Prices Constraints
-- Description: Adds partial unique indexes to support both customer-specific and group-specific pricing correctly.

DO $$
BEGIN
    -- 1. Ensure the old constraint is gone (if it still exists)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_item_prices_customer_id_item_id_key') THEN
        ALTER TABLE customer_item_prices DROP CONSTRAINT customer_item_prices_customer_id_item_id_key;
    END IF;

    -- 2. Drop existing UNIQUE constraints if they exist (to replace with partial indexes)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_customer_item_price') THEN
        ALTER TABLE customer_item_prices DROP CONSTRAINT unique_customer_item_price;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_group_item_price') THEN
        ALTER TABLE customer_item_prices DROP CONSTRAINT unique_group_item_price;
    END IF;
END $$;

-- 3. Create Partial Unique Index for Group-Specific Pricing
-- This ensures one price per item per group, ignoring rows that are customer-specific (group_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_group_item_price 
ON customer_item_prices (item_id, group_id) 
WHERE group_id IS NOT NULL;

-- 4. Create Partial Unique Index for Customer-Specific Pricing
-- This ensures one price per item per customer, ignoring rows that are group-specific (customer_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_customer_item_price 
ON customer_item_prices (item_id, customer_id) 
WHERE customer_id IS NOT NULL;

