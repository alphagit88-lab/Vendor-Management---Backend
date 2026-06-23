const pool = require('../config/database');

async function migrate() {
  try {
    console.log('Adding units_per_case to items table...');
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS units_per_case NUMERIC;`);
    console.log('Successfully added units_per_case column.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
