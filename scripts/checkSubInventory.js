require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSubInventory() {
  try {
    const usersRes = await pool.query("SELECT id, name, role FROM users WHERE role = 'staff'");
    console.log("Staff Users:", usersRes.rows);

    const inventoryRes = await pool.query("SELECT * FROM salesperson_inventory");
    console.log("Salesperson Inventory Data:", inventoryRes.rows);

    const globalInventoryRes = await pool.query(`
      SELECT 
        i.id, i.description_name,
        (SELECT json_agg(si.*) FROM salesperson_inventory si WHERE si.item_id = i.id) as subs
      FROM items i
      LIMIT 5
    `);
    console.log("Joined Sub-inventory Sample:", JSON.stringify(globalInventoryRes.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
checkSubInventory();
