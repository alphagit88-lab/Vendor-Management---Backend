-- Migration 017: Assign existing unassigned staff members to the default admin (id: 1)
UPDATE users 
SET admin_id = 1 
WHERE role = 'staff' AND admin_id IS NULL;
