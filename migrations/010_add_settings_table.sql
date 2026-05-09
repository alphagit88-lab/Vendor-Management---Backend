-- Migration: Add settings table for general configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value) VALUES
('company_name', 'SILVER EAGLE DISTRIBUTORS'),
('company_address', 'PO BOX 841521, DALLAS, TX 75284'),
('company_phone', '713-869-4361'),
('site_name', 'Super Vendor')
ON CONFLICT (key) DO NOTHING;
