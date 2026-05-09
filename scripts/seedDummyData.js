require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seed() {
  try {
    console.log("🚀 Starting dummy data seed...");

    // 1. Create extra staff members
    const passwordHash = await bcrypt.hash('Staff123!', 10);
    const dummyUsers = [
      { name: 'Sales Person B', phone: '7700000001', username: 'salesB', email: 'salesB@example.com', role: 'staff', inventory_location: 'West Region', password_hash: passwordHash },
      { name: 'Sales Person C', phone: '7700000002', username: 'salesC', email: 'salesC@example.com', role: 'staff', inventory_location: 'East Region', password_hash: passwordHash }
    ];

    for (const u of dummyUsers) {
      const check = await pool.query("SELECT id FROM users WHERE email = $1 OR username = $2", [u.email, u.username]);
      if (check.rows.length === 0) {
        await pool.query(`
            INSERT INTO users (name, phone, username, email, role, inventory_location, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [u.name, u.phone, u.username, u.email, u.role, u.inventory_location, u.password_hash]);
        console.log(`✅ User ${u.name} created.`);
      } else {
          console.log(`⏭️ User ${u.name} already exists.`);
      }
    }

    // 2. Create extra items
    const dummyItems = [
      { description_name: 'Ceylon White Tea', item_number: 'TEA-101', description: 'Premium white tea leaves', category_id: 1, vendor_cost: 50.00, cost: 75.00, price: 90.00 },
      { description_name: 'Ceylon Black Tea', item_number: 'TEA-102', description: 'Rich black tea blend', category_id: 1, vendor_cost: 30.00, cost: 45.00, price: 55.00 },
      { description_name: 'Organic Green Tea', item_number: 'TEA-103', description: 'Natural organic green tea', category_id: 1, vendor_cost: 40.00, cost: 60.00, price: 70.00 }
    ];

    for (const i of dummyItems) {
      const check = await pool.query("SELECT id FROM items WHERE item_number = $1", [i.item_number]);
      if (check.rows.length === 0) {
        await pool.query(`
            INSERT INTO items (description_name, item_number, description, category_id, vendor_cost, cost, price, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [i.description_name, i.item_number, i.description, i.category_id, i.vendor_cost, i.cost, i.price]);
        console.log(`✅ Item ${i.description_name} created.`);
      } else {
        console.log(`⏭️ Item ${i.description_name} already exists.`);
      }
    }

    // 3. Seed main warehouse inventory
    const allItems = await pool.query("SELECT id FROM items");
    for (const item of allItems.rows) {
      await pool.query(`
        INSERT INTO inventory (item_id, quantity, updated_at)
        VALUES ($1, 500, NOW())
        ON CONFLICT (item_id) DO UPDATE SET quantity = inventory.quantity + 500
      `, [item.id]);
    }
    console.log("✅ Warehouse stock boosted.");

    // 4. Distribute stock to ALL staff members
    const staff = await pool.query("SELECT id, name FROM users WHERE role = 'staff'");
    const itemIds = allItems.rows.map(i => i.id);

    for (const member of staff.rows) {
      const selection = itemIds.sort(() => 0.5 - Math.random()).slice(0, 3);
      for (const itemId of selection) {
        const qtyToAssign = 100 + Math.floor(Math.random() * 100);
        
        await pool.query("BEGIN");
        try {
          await pool.query("UPDATE inventory SET quantity = quantity - $1 WHERE item_id = $2", [qtyToAssign, itemId]);
          
          await pool.query(`
            INSERT INTO salesperson_inventory (item_id, user_id, quantity, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (item_id, user_id) 
            DO UPDATE SET quantity = salesperson_inventory.quantity + EXCLUDED.quantity
          `, [itemId, member.id, qtyToAssign]);

          await pool.query(`
            INSERT INTO inventory_logs (item_id, user_actor_id, reference_id, quantity_changed, type, notes, created_at)
            VALUES ($1, 1, $2, $3, 'ASSIGNMENT', $4, NOW())
          `, [itemId, member.id, qtyToAssign, `Stock assignment for ${member.name}`]);

          await pool.query("COMMIT");
        } catch (e) {
          await pool.query("ROLLBACK");
          console.error(`Failed to assign to ${member.name}:`, e.message);
        }
      }
    }
    console.log("✅ Sub-inventories allocated.");

    // 5. Add dummy orders for Sales Person A (ID 3)
    const customerRes = await pool.query("SELECT id FROM customers LIMIT 1");
    if (customerRes.rows.length > 0) {
      const custId = customerRes.rows[0].id;
      const dummyOrders = [
        ['ORD-9001', custId, 3, 2500.00, 'completed'],
        ['ORD-9002', custId, 3, 1250.00, 'pending'],
        ['ORD-9003', custId, 3, 4200.00, 'completed']
      ];
      for (const ord of dummyOrders) {
        const checkOrd = await pool.query("SELECT id FROM orders WHERE order_number = $1", [ord[0]]);
        if (checkOrd.rows.length === 0) {
            await pool.query(`
                INSERT INTO orders (order_number, customer_id, user_id, total_amount, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW() - interval '1 day', NOW())
            `, ord);
        }
      }
      console.log("✅ Dummy orders created for SP A.");
    }

    console.log("✨ Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    pool.end();
  }
}

seed();
