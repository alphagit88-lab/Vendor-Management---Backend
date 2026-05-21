-- Migration 015: Add Super Admin User
-- Safe to re-run

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE phone = '0987654321') THEN
    INSERT INTO users (name, phone, email, password_hash, role)
    VALUES (
      'Super Admin',
      '0987654321',
      'superadmin@email.com',
      crypt('SuperAdmin@123', gen_salt('bf', 10)),
      'super_admin'
    );
  END IF;
END $$;
