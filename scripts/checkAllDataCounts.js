require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const users = await pool.query("SELECT count(*) FROM users");
  const items = await pool.query("SELECT count(*) FROM items");
  const inv = await pool.query("SELECT count(*) FROM inventory");
  const subinv = await pool.query("SELECT count(*) FROM salesperson_inventory");
  
  console.log("Counts:");
  console.log("- Users:", users.rows[0].count);
  console.log("- Items:", items.rows[0].count);
  console.log("- Inventory (Warehouse):", inv.rows[0].count);
  console.log("- Sub-inventory:", subinv.rows[0].count);
  process.exit();
})();
