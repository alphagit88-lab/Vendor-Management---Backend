-- Migration: Add client_timestamp to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMP WITH TIME ZONE;
