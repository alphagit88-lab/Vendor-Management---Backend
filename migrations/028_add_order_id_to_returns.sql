-- Migration: Add order_id column to returns table
ALTER TABLE returns
ADD COLUMN order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE;
