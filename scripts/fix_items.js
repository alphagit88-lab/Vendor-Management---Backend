
const { Pool } = require('pg');

async function migrate() {
  const neon = new Pool({ connectionString: "postgres://neondb_owner:npg_xP5CjLnyDi2K@ep-wild-star-amzoc4hj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require", ssl: { rejectUnauthorized: false } });
  const aws = new Pool({ host: "vendor-db.cpcy4suogmnv.us-east-2.rds.amazonaws.com", user: "postgres", password: "VtdRRY3GtqBWyFZz7ww4", database: "postgres", ssl: { rejectUnauthorized: false } });

  const tables = ['items', 'orders', 'order_items'];
  for (const t of tables) {
    try {
      const { rows } = await neon.query(`SELECT * FROM ${t}`);
      console.log(`${t}: Found ${rows.length} rows in Neon`);
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]);
        await aws.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
        
        // Get schema from Neon
        const { rows: schema } = await neon.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [t]);
        const defs = schema.map(s => `${s.column_name} ${s.data_type}`).join(', ');
        await aws.query(`CREATE TABLE ${t} (${defs})`);
        
        for (const r of rows) {
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
          await aws.query(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`, Object.values(r));
        }
        console.log(`${t}: Migrated ${rows.length} rows`);
      }
    } catch (e) {
      console.error(`${t}: Error - ${e.message}`);
    }
  }
  await neon.end(); await aws.end();
}
migrate();
