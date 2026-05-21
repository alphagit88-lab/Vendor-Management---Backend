-- Migration 019: Set username for super_admin
-- Safe to re-run

UPDATE users SET username = 'superadmin' WHERE role = 'super_admin' AND username IS NULL;
