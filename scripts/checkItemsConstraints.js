require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const res = await pool.query(`
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conrelid = 'items'::regclass
  `);
  console.log("Items Constraints:", res.rows);
  
  const indices = await pool.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'items'
  `);
  console.log("Items Indices:", indices.rows);
  process.exit();
})();
