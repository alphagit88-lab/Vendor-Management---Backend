const pool = require('../config/database');

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'salesperson_inventory'
    `);
    console.log('Columns in salesperson_inventory:', res.rows.map(r => r.column_name));
    
    // Also check unique constraints
    const constrains = await pool.query(`
        SELECT conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND conrelid = 'salesperson_inventory'::regclass
    `);
    console.log('Constraints:', constrains.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
