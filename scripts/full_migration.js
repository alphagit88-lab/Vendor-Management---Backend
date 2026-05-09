
const { Pool } = require('pg');

async function migrateData() {
  const neonPool = new Pool({
    connectionString: "postgres://neondb_owner:npg_xP5CjLnyDi2K@ep-wild-star-amzoc4hj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  const awsPool = new Pool({
    host: "vendor-db.cpcy4suogmnv.us-east-2.rds.amazonaws.com",
    user: "postgres",
    password: "VtdRRY3GtqBWyFZz7ww4",
    database: "postgres",
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  const allTables = [
    'users', 
    'categories', 
    'customers', 
    'items', 
    'inventory', 
    'inventory_logs', 
    'orders', 
    'order_items', 
    'salesperson_inventory', 
    'saved_reports', 
    '_migrations'
  ];

  console.log('🚀 Starting Full Migration of 11 Tables...');

  for (const table of allTables) {
    console.log(`\n📦 Table: ${table}`);
    try {
      // 1. Fetch from Neon
      const { rows } = await neonPool.query(`SELECT * FROM ${table} LIMIT 5000`);
      console.log(`   - Found ${rows.length} rows in Neon.`);

      // 2. Drop and Recreate in AWS
      const { rows: columns } = await neonPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      const colDefs = columns.map(c => {
        let def = `"${c.column_name}" ${c.data_type}`;
        if (c.is_nullable === 'NO') def += ' NOT NULL';
        return def;
      }).join(', ');
      
      await awsPool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      await awsPool.query(`CREATE TABLE "${table}" (${colDefs})`);

      // 3. Insert and sync
      if (rows.length > 0) {
        const colNames = Object.keys(rows[0]);
        const colNamesStr = colNames.map(c => `"${c}"`).join(', ');
        const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
        const insertQuery = `INSERT INTO "${table}" (${colNamesStr}) VALUES (${placeholders})`;

        for (const row of rows) {
          await awsPool.query(insertQuery, Object.values(row));
        }
        console.log(`   - ✅ Successfully migrated ${rows.length} rows.`);
      } else {
        console.log(`   - ℹ️ Table is empty, schema created.`);
      }
    } catch (e) {
      console.error(`   - ❌ Error migrating ${table}: ${e.message}`);
    }
  }

  console.log('\n🏁 Complete Migration of 11 Tables Finished.');
  await neonPool.end();
  await awsPool.end();
}

migrateData();
