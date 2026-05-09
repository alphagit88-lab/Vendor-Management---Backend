const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
require('dotenv').config();

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && /^\d+/.test(file))
    .sort();

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already applied migrations
  const applied = await pool.query('SELECT name FROM _migrations');
  const appliedSet = new Set(applied.rows.map(r => r.name));

  console.log('🔄 Starting migrations...\n');

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  Skipping (already applied): ${file}`);
      continue;
    }

    try {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📄 Running migration: ${file}`);
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`✅ Completed: ${file}\n`);
      count++;
    } catch (error) {
      console.error(`❌ Error running migration ${file}:`, error.message);
      process.exit(1);
    }
  }

  if (count === 0) {
    console.log('\n✨ Database is up to date! No new migrations to apply.');
  } else {
    console.log(`\n✨ Applied ${count} new migration(s) successfully!`);
  }
  await pool.end();
}

runMigrations();
