-- Migration 006: Staff Authentication & Sub-inventory Setup
-- Safe to re-run

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS inventory_location VARCHAR(255);

CREATE TABLE IF NOT EXISTS salesperson_inventory (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  inventory_location VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_salesperson_item') THEN
    ALTER TABLE salesperson_inventory ADD CONSTRAINT unique_salesperson_item UNIQUE (item_id, user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  salesperson_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  quantity_changed INTEGER NOT NULL,
  notes TEXT,
  unit_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

UPDATE users SET role = 'staff' WHERE role IN ('salesperson', 'manager');
