
const { Pool } = require('pg');

async function checkMigration() {
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

  const tables = ['users', 'customers', 'items', 'orders', 'inventory', 'categories'];

  console.log('--- Database Comparison ---');
  for (const table of tables) {
    let neonCount = 'N/A';
    let awsCount = 'N/A';

    try {
      const res = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);
      neonCount = res.rows[0].count;
    } catch (e) {
      neonCount = `Error: ${e.message}`;
    }

    try {
      const res = await awsPool.query(`SELECT COUNT(*) FROM ${table}`);
      awsCount = res.rows[0].count;
    } catch (e) {
      awsCount = `Error: ${e.message}`;
    }


    console.log(`CHECK:${table}:${neonCount}:${awsCount}`);
  }

  await neonPool.end();
  await awsPool.end();
}

checkMigration();
