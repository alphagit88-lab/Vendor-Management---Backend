-- Add is_upc_required field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_upc_required BOOLEAN DEFAULT FALSE;
