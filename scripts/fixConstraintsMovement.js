const pool = require('../config/database');

async function fix() {
  try {
    console.log('📦 Fixing database constraints for movement logic...');
    
    // 1. Ensure inventory has a unique item_id for upserts
    await pool.query('ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_item_id');
    await pool.query('ALTER TABLE inventory ADD CONSTRAINT unique_item_id UNIQUE (item_id)');
    
    // 2. Ensure salesperson_inventory has a unique (item_id, user_id) for upserts
    // Check if user_id column exists (we confirmed it does)
    await pool.query('ALTER TABLE salesperson_inventory DROP CONSTRAINT IF EXISTS unique_salesperson_item');
    await pool.query('ALTER TABLE salesperson_inventory ADD CONSTRAINT unique_salesperson_item UNIQUE (item_id, user_id)');
    
    console.log('✅ Constraints updated successfully!');
  } catch (err) {
    console.error('❌ Error during constraint update:', err.message);
  } finally {
    process.exit(0);
  }
}

fix();
