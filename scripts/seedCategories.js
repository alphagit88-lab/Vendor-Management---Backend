const pool = require('../config/database');

async function seed() {
  try {
    console.log('🌱 Seeding initial categories...');
    const categories = [
      { name: 'Beverages', description: 'Soda, mineral water, energy drinks, and fruit juices.' },
      { name: 'Snacks & Confectionery', description: 'Chips, chocolate bars, biscuits, and assorted munchies.' },
      { name: 'Cigarettes & Tobacco', description: 'Assorted tobacco products and smoking accessories.' },
      { name: 'Dairy & Provisions', description: 'Fresh milk, cheese, eggs, and refrigerated goods.' },
      { name: 'Cleaning & Hygiene', description: 'Detergents, soaps, and sanitary products.' },
      { name: 'Paper & Packaging', description: 'Napkins, toilet rolls, and food containers.' },
      { name: 'Miscellaneous', description: 'Uncategorized items and store supplies.' }
    ];

    for (const cat of categories) {
      await pool.query(`
        INSERT INTO categories (name, description, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      `, [cat.name, cat.description]);
    }

    console.log('✅ Seeding complete!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();
