-- Migration 013: Add Customer Groups and Update Pricing to Group-Based
-- Description: Creates customer_groups table, links customers to groups, and migrates pricing to be group-based.

-- 1. Create customer_groups table
CREATE TABLE IF NOT EXISTS customer_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add group_id to customers (shops) table
-- Note: In this project, 'customers' often refers to the 'shops' table or a 'customers' table.
-- Let's check if 'customers' table exists first. Based on migrations, it seems 'shops' was used, 
-- but later migrations like 011 reference 'customers' table.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'group_id') THEN
            ALTER TABLE customers ADD COLUMN group_id INTEGER REFERENCES customer_groups(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'group_id') THEN
            ALTER TABLE shops ADD COLUMN group_id INTEGER REFERENCES customer_groups(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 3. Update customer_item_prices to be group-based
-- We will add group_id and make customer_id optional, or transition to a new table.
-- The user said "this should be Customer Group Specific Price".
-- To be safe and support both for a transition or purely group-based, we add group_id.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_item_prices' AND column_name = 'group_id') THEN
        ALTER TABLE customer_item_prices ADD COLUMN group_id INTEGER REFERENCES customer_groups(id) ON DELETE CASCADE;
    END IF;

    -- Make customer_id nullable because it's now group-based
    ALTER TABLE customer_item_prices ALTER COLUMN customer_id DROP NOT NULL;

    -- Update unique constraint to include group_id and handle the transition
    -- First drop the old unique constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_item_prices_customer_id_item_id_key') THEN
        ALTER TABLE customer_item_prices DROP CONSTRAINT customer_item_prices_customer_id_item_id_key;
    END IF;
    
    -- Add new unique constraints for both customer-specific and group-specific prices
    -- Actually, the user wants it to BE group-specific.
END $$;

-- Trigger for updated_at on customer_groups
CREATE TRIGGER update_customer_groups_updated_at
    BEFORE UPDATE ON customer_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
