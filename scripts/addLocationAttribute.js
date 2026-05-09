const pool = require('../config/database');

async function update() {
  try {
    console.log('📦 Adding location tracking to personnel...');

    // Add inventory_location to users (e.g. "Kandy", "Colombo", "Main Warehouse")
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS inventory_location VARCHAR(100) DEFAULT 'Main Warehouse'
    `);

    // Assign some example locations for testing
    await pool.query(`
      UPDATE users SET inventory_location = 'Kandy' WHERE role = 'salesperson' AND id = (SELECT id FROM users WHERE role = 'salesperson' ORDER BY id LIMIT 1);
      UPDATE users SET inventory_location = 'Colombo' WHERE role = 'salesperson' AND id = (SELECT id FROM users WHERE role = 'salesperson' ORDER BY id OFFSET 1 LIMIT 1);
    `);

    console.log('✅ DATABASE UPDATED WITH LOCATION TRACKING');
  } catch (err) {
    console.error('❌ Update failed:', err.message);
  } finally {
    process.exit(0);
  }
}

update();
