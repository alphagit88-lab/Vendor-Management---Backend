-- One-time subscription purchases (separate from hardware shop_orders)
CREATE TABLE IF NOT EXISTS subscription_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  plan_name VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  purchase_type VARCHAR(30) NOT NULL DEFAULT 'purchase',
  stripe_session_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_purchases_user ON subscription_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_purchases_plan ON subscription_purchases(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_purchases_session ON subscription_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscription_purchases_status ON subscription_purchases(status);
