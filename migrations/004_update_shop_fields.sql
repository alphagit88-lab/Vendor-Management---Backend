-- Migration: 004_update_shop_fields.sql
-- Description: Adds detailed business and compliance fields to the shops table with idempotency.

DO $$
BEGIN
    -- Business Identity Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='registered_company_name') THEN
        ALTER TABLE shops ADD COLUMN registered_company_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='dba') THEN
        ALTER TABLE shops ADD COLUMN dba TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='email') THEN
        ALTER TABLE shops ADD COLUMN email TEXT;
    END IF;

    -- Compliance Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='sales_tax_id') THEN
        ALTER TABLE shops ADD COLUMN sales_tax_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='has_cigarette_permit') THEN
        ALTER TABLE shops ADD COLUMN has_cigarette_permit BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='tobacco_permit_number') THEN
        ALTER TABLE shops ADD COLUMN tobacco_permit_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='tobacco_expire_date') THEN
        ALTER TABLE shops ADD COLUMN tobacco_expire_date DATE;
    END IF;

    -- Finance Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='payment_type') THEN
        ALTER TABLE shops ADD COLUMN payment_type TEXT DEFAULT 'COD';
    END IF;

    -- Rename logic (Ensure target doesn't exist before renaming)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='contact') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='phone') THEN
        ALTER TABLE shops RENAME COLUMN contact TO phone;
    END IF;
END $$;
