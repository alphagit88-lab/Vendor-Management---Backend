const pool = require('../config/database');

class Order {
  static async create({ order_number, customer_id, user_id, total_amount, total_credits, total_deposit, total_return, status, notes, load_number, payment_type, check_number, is_checklist, client_timestamp, is_upc_required, items }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Transactional Update - orders table (removed non-existent updated_at)
      const orderQuery = `
        INSERT INTO orders (order_number, customer_id, user_id, total_amount, total_credits, total_deposit, total_return, status, notes, load_number, payment_type, check_number, is_checklist, client_timestamp, is_upc_required, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING *
      `;
      const orderValues = [order_number, customer_id, user_id, total_amount, total_credits || 0, total_deposit || 0, total_return || 0, status || 'pending', notes || null, load_number || null, payment_type || null, check_number || null, is_checklist || false, client_timestamp || null, is_upc_required || false];
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

      static async update(orderId, { customer_id, user_id, total_amount, total_credits, total_deposit, total_return, status, notes, load_number, payment_type, check_number, is_checklist, client_timestamp, is_upc_required, items }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingOrderRes = await client.query('SELECT order_number, user_id FROM orders WHERE id = $1', [orderId]);
      if (existingOrderRes.rowCount === 0) throw new Error('Order not found');
      const order = existingOrderRes.rows[0];
      const order_number = order.order_number;
      const original_user_id = order.user_id;

      // 1. Restore inventory for old items
      const oldItemsRes = await client.query('SELECT item_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
      const oldItems = oldItemsRes.rows;
      for (const old of oldItems) {
        await client.query('UPDATE salesperson_inventory SET quantity = quantity + $1 WHERE item_id = $2 AND user_id = $3', [old.quantity, old.item_id, original_user_id]);
      }

      // 2. Delete old order_items and returns
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      await client.query('DELETE FROM returns WHERE order_id = $1', [orderId]);

      // 3. Update orders table
      const orderQuery = `
        UPDATE orders 
        SET customer_id = $1, user_id = $2, total_amount = $3, total_credits = $4, total_deposit = $5, total_return = $6, status = $7, notes = $8, load_number = $9, payment_type = $10, check_number = $11, is_checklist = $12, client_timestamp = $13, is_upc_required = $14
        WHERE id = $15
        RETURNING *
      `;
      const orderValues = [customer_id, user_id, total_amount, total_credits || 0, total_deposit || 0, total_return || 0, status || 'pending', notes || null, load_number || null, payment_type || null, check_number || null, is_checklist || false, client_timestamp || null, is_upc_required || false, orderId];
      const orderResult = await client.query(orderQuery, orderValues);
      const updatedOrder = orderResult.rows[0];

      if (items && items.length > 0) {
        const Inventory = require('./Inventory');
        const Item = require('./Item');
        let calculatedTotal = 0;

        for (const item of items) {
          const itemId = item.item_id || item.itemId;
          const quantity = parseInt(item.quantity || 0);
          
          const resolvedItem = await Item.findByIdWithCustomerPrice(itemId, customer_id);
          const unitPrice = resolvedItem.resolved_price;
          const subtotal = parseFloat(quantity * unitPrice);
          calculatedTotal += subtotal;

          if (Math.abs(quantity) > 10) {
            throw new Error(`Quantity limit exceeded for item ${resolvedItem.description_name}. Maximum allowed is 10.`);
          }

          const itemQuery = `
            INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
            VALUES ($1, $2, $3, $4, $5)
          `;
          const itemValues = [orderId, itemId, quantity, unitPrice, subtotal];
          await client.query(itemQuery, itemValues);

          await Inventory.updateStock({
            item_id: itemId,
            quantity: -Math.abs(quantity),
            type: 'SALE',
            notes: `Sale - Order #${order_number} (Updated)`,
            salesperson_id: user_id, 
            user_actor_id: user_id
          }, client);
        }

        await client.query(`UPDATE orders SET total_amount = $1 WHERE id = $2`, [calculatedTotal, orderId]);
        updatedOrder.total_amount = calculatedTotal;
      }

      await client.query('COMMIT');
      return updatedOrder;
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
             c.email as customer_email,
             c.tobacco_permit_number,
             u.name as user_name,
             u.admin_id as salesperson_admin_id,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', oi.id,
          'item_id', oi.item_id,
          'item_number', i.item_number,
          'item_name', i.description_name,
          'upc', i.upc,
          'quantity_size', i.quantity_size,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'srp', i.price,
          'subtotal', oi.subtotal
        ))
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = o.id
      ), '[]'::json) as items,
      COALESCE((
          SELECT json_agg(json_build_object(
            'id', r.id,
            'item_id', r.item_id,
            'item_number', i.item_number,
            'item_name', i.description_name,
            'quantity_size', i.quantity_size,
            'quantity', r.quantity,
            'unit_price', r.unit_price,
            'subtotal', (r.unit_price * r.quantity),
            'amount', (r.unit_price * r.quantity)
          ))
          FROM returns r
          JOIN items i ON r.item_id = i.id
          WHERE r.order_id = o.id
        ), '[]'::json) as returns
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const result = await pool.query(query, [numericId]);
    return result.rows[0];
  }

  static async findAll(userId = null, month = null, year = null, adminId = null) {
    let query = `
      SELECT o.*, c.name as customer_name, u.name as user_name,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', oi.id,
          'item_id', oi.item_id,
          'item_number', i.item_number,
          'item_name', i.description_name,
          'upc', i.upc,
          'quantity_size', i.quantity_size,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'srp', i.price,
          'subtotal', oi.subtotal
        ))
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = o.id
      ), '[]'::json) as items,
      COALESCE((SELECT SUM(r.unit_price * r.quantity) FROM returns r WHERE r.order_id = o.id), 0) as total_return
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
    } else if (adminId) {
      query += ` AND (o.user_id = $${paramIndex} OR o.user_id IN (SELECT id FROM users WHERE admin_id = $${paramIndex}))`;
      paramIndex++;
      values.push(adminId);
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const orderRes = await client.query('SELECT user_id FROM orders WHERE id = ', [id]);
      if (orderRes.rowCount > 0) {
        const order = orderRes.rows[0];
        // Restore inventory
        const oldItemsRes = await client.query('SELECT item_id, quantity FROM order_items WHERE order_id = ', [id]);
        const oldItems = oldItemsRes.rows;
        for (const old of oldItems) {
          await client.query('UPDATE salesperson_inventory SET quantity = quantity +  WHERE item_id =  AND user_id = ', [old.quantity, old.item_id, order.user_id]);
        }
      }

      const query = 'DELETE FROM orders WHERE id =  RETURNING id';
      const result = await client.query(query, [id]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Order;



