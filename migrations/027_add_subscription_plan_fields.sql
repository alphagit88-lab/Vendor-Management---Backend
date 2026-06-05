-- Add new fields to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN description TEXT;
ALTER TABLE subscription_plans ADD COLUMN customer_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN van_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN warehouse_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN has_category_management BOOLEAN NOT NULL DEFAULT false;
