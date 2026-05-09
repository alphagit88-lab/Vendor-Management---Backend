const pool = require('../config/database');

async function migrate() {
  try {
    console.log('📦 Creating Categories table and linking items...');

    // 1. Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Add category_id to items table
    await pool.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
    `);

    // 3. Move existing string categories to the new table
    // Fetch unique categories currently in items
    const res = await pool.query('SELECT DISTINCT category FROM items WHERE category IS NOT NULL');
    for (const row of res.rows) {
      const catName = row.category;
      await pool.query(`
        INSERT INTO categories (name) 
        VALUES ($1) 
        ON CONFLICT (name) DO NOTHING
      `, [catName]);
      
      // Link items to the new category id
      await pool.query(`
        UPDATE items i
        SET category_id = (SELECT id FROM categories WHERE name = $1)
        WHERE i.category = $1
      `, [catName]);
    }

    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
