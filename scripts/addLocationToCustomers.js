const pool = require('../config/database');

async function migrate() {
  try {
    console.log('Adding latitude and longitude columns to customers table...');
    await pool.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
    `);
    console.log('Successfully added latitude and longitude columns.');
  } catch (err) {
    console.error('Error migrating database:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
