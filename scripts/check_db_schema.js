const pool = require('../config/database');

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log("🔍 CHECKING DATABASE SCHEMA...");

    // 1. List Tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("\n📋 Tables found:", tables.rows.map(r => r.table_name).join(', '));

    // 2. Check Constraints for inventory
    console.log("\n🧐 Checking 'inventory' constraints:");
    const invCons = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'inventory'::regclass
    `);
    console.table(invCons.rows);

    // 3. Check Constraints for salesperson_inventory
    console.log("\n🧐 Checking 'salesperson_inventory' constraints:");
    const salesCons = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'salesperson_inventory'::regclass
    `);
    console.table(salesCons.rows);

    // 4. Check Columns for inventory
    console.log("\n🧐 Checking 'inventory' columns:");
    const invCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inventory'
    `);
    console.table(invCols.rows);

    // 5. Check Columns for salesperson_inventory
    console.log("\n🧐 Checking 'salesperson_inventory' columns:");
    const salesCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'salesperson_inventory'
    `);
    console.table(salesCols.rows);

    // 6. Check Index Definitions
    console.log("\n🧐 Checking Index Definitions:");
    const indexDefs = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('inventory', 'salesperson_inventory')
    `);
    console.table(indexDefs.rows);

  } catch (err) {
    console.error("🔴 SCHEMA CHECK ERROR:", err.message);
  } finally {
    client.release();
    process.exit();
  }
}

checkSchema();
