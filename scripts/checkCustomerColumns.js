const pool = require('../config/database');

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `);
    process.stdout.write(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
