const pool = require('../config/database');

async function update() {
  try {
    console.log('📦 Finalizing Inventory Location properties...');

    // 1. Add to Warehouse inventory
    await pool.query(`
      ALTER TABLE inventory 
      ADD COLUMN IF NOT EXISTS location_name VARCHAR(100) DEFAULT 'Main Warehouse'
    `);

    // 2. Add to Salesperson inventory record
    await pool.query(`
      ALTER TABLE salesperson_inventory 
      ADD COLUMN IF NOT EXISTS location_name VARCHAR(100)
    `);

    // 3. Update salesperson inventory with their user-assigned location
    await pool.query(`
      UPDATE salesperson_inventory si
      SET location_name = u.inventory_location
      FROM users u
      WHERE si.user_id = u.id AND si.location_name IS NULL;
    `);

    console.log('✅ INVENTORY TABLES UPDATED WITH LOCATION PROPERTIES');
  } catch (err) {
    console.error('❌ Update failed:', err.message);
  } finally {
    process.exit(0);
  }
}

update();
