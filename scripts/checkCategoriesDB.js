const pool = require('../config/database');

async function check() {
  try {
    const res = await pool.query('SELECT * FROM categories');
    console.log('Categories in DB:', res.rows.length);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
