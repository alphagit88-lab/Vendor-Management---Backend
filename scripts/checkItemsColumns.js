const pool = require('../config/database');

async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'items'
  `);
  console.log('Columns in items:', res.rows.map(r => r.column_name));
  process.exit(0);
}

check();
