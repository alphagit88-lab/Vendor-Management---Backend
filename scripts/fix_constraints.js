const pool = require('../config/database');

async function fixConstraints() {
  const client = await pool.connect();
  try {
    console.log("🚀 STARTING DATABASE CONSTRAINT REPAIR...");

    // 1. Fix 'inventory' table (Warehouse)
    console.log("\n🛠  Fixing table: inventory...");
    try {
      // Check for duplicates first
      const dupInventory = await client.query(`
        SELECT item_id, COUNT(*) 
        FROM inventory 
        GROUP BY item_id 
        HAVING COUNT(*) > 1
      `);

      if (dupInventory.rows.length > 0) {
        console.log("⚠️ Found duplicate item entries in warehouse. Merging...");
        for (const row of dupInventory.rows) {
          await client.query(`
            WITH deleted AS (
              DELETE FROM inventory WHERE item_id = $1 RETURNING quantity
            )
            INSERT INTO inventory (item_id, quantity, updated_at)
            VALUES ($1, (SELECT SUM(quantity) FROM deleted), NOW())
          `, [row.item_id]);
        }
      }

      await client.query(`
        ALTER TABLE inventory 
        ADD CONSTRAINT inventory_item_id_unique UNIQUE (item_id)
      `);
      console.log("✅ Unique constraint added to inventory(item_id)");
    } catch (err) {
      if (err.code === '42710') {
        console.log("ℹ️ inventory_item_id_unique already exists.");
      } else {
        console.error("❌ Error fixing inventory table:", err.message);
      }
    }

    // 2. Fix 'salesperson_inventory' table
    console.log("\n🛠  Fixing table: salesperson_inventory...");
    try {
      // Check for duplicates first
      const dupSalesInv = await client.query(`
        SELECT item_id, user_id, COUNT(*) 
        FROM salesperson_inventory 
        GROUP BY item_id, user_id 
        HAVING COUNT(*) > 1
      `);

      if (dupSalesInv.rows.length > 0) {
        console.log("⚠️ Found duplicate entries for salesperson stock. Merging...");
        for (const row of dupSalesInv.rows) {
          await client.query(`
            WITH deleted AS (
              DELETE FROM salesperson_inventory 
              WHERE item_id = $1 AND user_id = $2 
              RETURNING quantity
            )
            INSERT INTO salesperson_inventory (item_id, user_id, quantity, updated_at)
            VALUES ($1, $2, (SELECT SUM(quantity) FROM deleted), NOW())
          `, [row.item_id, row.user_id]);
        }
      }

      await client.query(`
        ALTER TABLE salesperson_inventory 
        ADD CONSTRAINT salesperson_item_user_unique UNIQUE (item_id, user_id)
      `);
      console.log("✅ Unique constraint added to salesperson_inventory(item_id, user_id)");
    } catch (err) {
      if (err.code === '42710') {
        console.log("ℹ️ salesperson_item_user_unique already exists.");
      } else {
        console.error("❌ Error fixing salesperson_inventory table:", err.message);
      }
    }

    console.log("\n✨ DATABASE CONSTRAINTS REPAIRED!");
  } catch (error) {
    console.error("🔴 CRITICAL REPAIR ERROR:", error);
  } finally {
    client.release();
    process.exit();
  }
}

fixConstraints();
