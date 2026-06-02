-- Add price column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00;