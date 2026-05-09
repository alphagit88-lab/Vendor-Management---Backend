const pool = require('../config/database');

async function fixSequences() {
  const tables = [
    { name: 'users', id_col: 'id' },
    { name: 'customers', id_col: 'id' },
    { name: 'items', id_col: 'id' },
    { name: 'categories', id_col: 'id' },
    { name: 'orders', id_col: 'id' },
    { name: 'order_items', id_col: 'id' },
    { name: 'inventory', id_col: 'id' },
    { name: 'salesperson_inventory', id_col: 'id' },
    { name: 'inventory_logs', id_col: 'id' }
  ];

  const client = await pool.connect();
  try {
    console.log("🚀 STARTING DATABASE ID REPAIR...");

    for (const table of tables) {
      console.log(`\n🛠  Fixing table: ${table.name}...`);
      
      const seqName = `${table.name}_${table.id_col}_seq`;

      try {
        // 1. Create sequence if it doesn't exist
        await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName}`);
        
        // 2. Attach sequence to column
        await client.query(`ALTER TABLE ${table.name} ALTER COLUMN ${table.id_col} SET DEFAULT nextval('${seqName}')`);
        
        // 3. Sync the sequence with current data
        const maxIdResult = await client.query(`SELECT MAX(${table.id_col}) FROM ${table.name}`);
        const maxId = maxIdResult.rows[0].max || 0;
        await client.query(`SELECT setval('${seqName}', ${maxId})`);
        
        // 4. Set ownership
        await client.query(`ALTER SEQUENCE ${seqName} OWNED BY ${table.name}.${table.id_col}`);
        
        console.log(`✅ Table ${table.name} fixed successfully (Next ID will be ${maxId + 1})`);
      } catch (err) {
        console.error(`❌ Error fixing table ${table.name}:`, err.message);
      }
    }

    console.log("\n✨ DATABASE REPAIR COMPLETE!");
  } catch (error) {
    console.error("🔴 CRITICAL REPAIR ERROR:", error);
  } finally {
    client.release();
    process.exit();
  }
}

fixSequences();
