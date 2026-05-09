const pool = require('../config/database');

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'salesperson_inventory'
    `);
    console.log('Columns in salesperson_inventory:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
