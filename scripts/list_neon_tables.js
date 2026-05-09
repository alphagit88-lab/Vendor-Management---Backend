
const { Pool } = require('pg');

async function listNeonTables() {
  const neonPool = new Pool({
    connectionString: "postgres://neondb_owner:npg_xP5CjLnyDi2K@ep-wild-star-amzoc4hj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  const { rows } = await neonPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  console.log('Tables in Neon:', rows.map(r => r.table_name).join(', '));

  await neonPool.end();
}

listNeonTables();
