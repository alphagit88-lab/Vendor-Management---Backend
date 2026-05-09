const pool = require('../config/database');

class Order {
  static async create({ order_number, customer_id, user_id, total_amount, total_credits, total_deposit, status, notes, load_number, payment_type, check_number, is_checklist, client_timestamp, items }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Transactional Update - orders table (removed non-existent updated_at)
      const orderQuery = `
        INSERT INTO orders (order_number, customer_id, user_id, total_amount, total_credits, total_deposit, status, notes, load_number, payment_type, check_number, is_checklist, client_timestamp, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `;
      const orderValues = [order_number, customer_id, user_id, total_amount, total_credits || 0, total_deposit || 0, status || 'pending', notes || null, load_number || null, payment_type || null, check_number || null, is_checklist || false, client_timestamp || null];
      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      if (items && items.length > 0) {
        const Inventory = require('./Inventory');
        const Item = require('./Item');
        let calculatedTotal = 0;

        for (const item of items) {
          const itemId = item.item_id || item.itemId;
          const quantity = parseInt(item.quantity || 0);
          
          // Resolve price for this specific customer
          const resolvedItem = await Item.findByIdWithCustomerPrice(itemId, customer_id);
          const unitPrice = resolvedItem.resolved_price;
          const subtotal = parseFloat(quantity * unitPrice);
          calculatedTotal += subtotal;

          // 2. Strict Business Validation: Max 10 per item
          if (Math.abs(quantity) > 10) {
            throw new Error(`Quantity limit exceeded for item ${resolvedItem.description_name}. Maximum allowed is 10.`);
          }

          // 3. Insert Order Item
          const itemQuery = `
            INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
            VALUES ($1, $2, $3, $4, $5)
          `;
          const itemValues = [order.id, itemId, quantity, unitPrice, subtotal];
          await client.query(itemQuery, itemValues);

          // 4. Deduct from Salesperson Inventory (Sub-Inventory)
          await Inventory.updateStock({
            item_id: itemId,
            quantity: -Math.abs(quantity),
            type: 'SALE',
            notes: `Sale - Order #${order_number}`,
            salesperson_id: user_id, 
            user_actor_id: user_id
          }, client);
        }

        // Update the order with the correctly calculated total amount (just in case mobile total was based on default prices)
        await client.query(`UPDATE orders SET total_amount = $1 WHERE id = $2`, [calculatedTotal, order.id]);
        order.total_amount = calculatedTotal;
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const numericId = parseInt(id);
    const query = `
      SELECT o.*, 
             c.name as customer_name, 
             c.address as customer_address, 
             c.account_id, 
             c.phone as customer_phone, 
             c.tobacco_permit_number,
             u.name as user_name,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', oi.id,
          'item_id', oi.item_id,
          'item_number', i.item_number,
          'item_name', i.description_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'subtotal', oi.subtotal
        ))
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = o.id
      ), '[]'::json) as items
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const result = await pool.query(query, [numericId]);
    return result.rows[0];
  }

  static async findAll(userId = null, month = null, year = null) {
    let query = `
      SELECT o.*, c.name as customer_name, u.name as user_name,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', oi.id,
          'item_id', oi.item_id,
          'item_number', i.item_number,
          'item_name', i.description_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'subtotal', oi.subtotal
        ))
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = o.id
      ), '[]'::json) as items
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND o.user_id = $${paramIndex++}`;
      values.push(userId);
    }

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM o.created_at) = $${paramIndex++}`;
      values.push(month);
      query += ` AND EXTRACT(YEAR FROM o.created_at) = $${paramIndex++}`;
      values.push(year);
    }

    query += ` ORDER BY o.created_at DESC`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM orders WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Order;
