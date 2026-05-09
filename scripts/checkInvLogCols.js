require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_logs'");
  console.log("InvLog Columns:", res.rows.map(r => r.column_name));
  process.exit();
})();
