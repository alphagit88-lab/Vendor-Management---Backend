const pool = require('../config/database');

async function sync() {
  try {
    console.log('📦 Syncing advanced inventory tables...');

    // 1. Salesperson Inventory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salesperson_inventory (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_id, user_id)
      )
    `);

    // 2. Add unit_cost to inventory_logs if not exists
    await pool.query(`
      ALTER TABLE inventory_logs 
      ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0
    `);

    console.log('✅ DATABASE SYNC SUCCESSFUL');
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  } finally {
    process.exit(0);
  }
}

sync();
