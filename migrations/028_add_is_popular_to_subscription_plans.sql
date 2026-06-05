-- Add is_popular column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN is_popular BOOLEAN NOT NULL DEFAULT false;