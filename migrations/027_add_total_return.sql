-- Migration: Add total_return column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_return DECIMAL(12, 2) DEFAULT 0.00;
