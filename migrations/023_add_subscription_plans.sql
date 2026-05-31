-- Add subscription plans table
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_limit INTEGER NOT NULL DEFAULT 0,
    sales_person_limit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add subscription_plan_id to users table
ALTER TABLE users 
ADD COLUMN subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_users_subscription_plan_id ON users(subscription_plan_id);
