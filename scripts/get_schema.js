
const { Pool } = require('pg');

async function getCreateStatement() {
  const neonPool = new Pool({
    connectionString: "postgres://neondb_owner:npg_xP5CjLnyDi2K@ep-wild-star-amzoc4hj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  const { rows } = await neonPool.query(`
    SELECT 'CREATE TABLE ' || table_name || ' (' || 
           string_agg(column_name || ' ' || data_type, ', ') || 
           ');' as sql
    FROM information_schema.columns
    WHERE table_name = 'customers'
    GROUP BY table_name
  `);
  console.log(rows[0].sql);

  await neonPool.end();
}

getCreateStatement();
