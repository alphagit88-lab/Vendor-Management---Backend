require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedItems() {
  try {
    const dummyItems = [
      { description_name: 'Ceylon White Tea', item_number: 'TEA-001', description: 'Premium white tea leaves', category_id: 1, vendor_cost: 50.00, cost: 75.00, price: 90.00 },
      { description_name: 'Ceylon Black Tea', item_number: 'TEA-002', description: 'Rich black tea blend', category_id: 1, vendor_cost: 30.00, cost: 45.00, price: 55.00 },
      { description_name: 'Organic Green Tea', item_number: 'TEA-003', description: 'Natural organic green tea', category_id: 1, vendor_cost: 40.00, cost: 60.00, price: 70.00 }
    ];

    for (const i of dummyItems) {
      console.log(`Trying to insert ${i.description_name}...`);
      await pool.query(`
        INSERT INTO items (description_name, item_number, description, category_id, vendor_cost, cost, price, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (item_number) DO NOTHING
      `, [i.description_name, i.item_number, i.description, i.category_id, i.vendor_cost, i.cost, i.price]);
    }
    console.log("Done seeding items.");
  } catch (err) {
    console.error("Error seeding items:", err.message);
  } finally {
    pool.end();
  }
}
seedItems();
