-- Add 'order' column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;