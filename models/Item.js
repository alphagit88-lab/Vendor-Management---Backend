const pool = require('../config/database');

class Item {
  static async create({ description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id, admin_id }) {
    const query = `
      INSERT INTO items (description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id, admin_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    const values = [description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id || null, admin_id || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM items WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(adminId = null) {
    let query = `
      SELECT i.*, c.name as category_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
    `;
    const values = [];
    if (adminId) {
      query += ` WHERE i.admin_id = $1`;
      values.push(adminId);
    }
    query += ` ORDER BY i.created_at DESC`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push((value === '' || value === null) ? null : value);
      }
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE items 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM items WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getGroupPrices(itemId) {
    const query = `
      SELECT DISTINCT ON (cip.group_id) cip.*, cg.name as group_name
      FROM customer_item_prices cip
      JOIN customer_groups cg ON cip.group_id = cg.id
      WHERE cip.item_id = $1
      ORDER BY cip.group_id, cip.updated_at DESC
    `;
    const result = await pool.query(query, [itemId]);
    return result.rows;
  }

  static async setGroupPrice(itemId, groupId, price) {
    const query = `
      INSERT INTO customer_item_prices (item_id, group_id, price, customer_id)
      VALUES ($1, $2, $3, NULL)
      ON CONFLICT (item_id, group_id) WHERE group_id IS NOT NULL DO UPDATE
      SET price = EXCLUDED.price, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [itemId, groupId, price]);
    return result.rows[0];
  }

  static async deleteGroupPrice(itemId, groupId) {
    const query = `DELETE FROM customer_item_prices WHERE item_id = $1 AND group_id = $2`;
    await pool.query(query, [itemId, groupId]);
  }

  static async getCustomerPrices(itemId) {
    const query = `
      SELECT cip.*, c.name as customer_name, c.email as customer_email
      FROM customer_item_prices cip
      JOIN customers c ON cip.customer_id = c.id
      WHERE cip.item_id = $1
    `;
    const result = await pool.query(query, [itemId]);
    return result.rows;
  }

  static async setCustomerPrice(itemId, customerId, price) {
    const query = `
      INSERT INTO customer_item_prices (item_id, customer_id, price, group_id)
      VALUES ($1, $2, $3, NULL)
      ON CONFLICT (item_id, customer_id) WHERE customer_id IS NOT NULL DO UPDATE
      SET price = EXCLUDED.price, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [itemId, customerId, price]);
    return result.rows[0];
  }

  static async deleteCustomerPrice(itemId, customerId) {
    const query = `DELETE FROM customer_item_prices WHERE item_id = $1 AND customer_id = $2`;
    await pool.query(query, [itemId, customerId]);
  }

  static async findByIdWithCustomerPrice(itemId, customerId) {
    const query = `
      SELECT i.*, COALESCE(cip_cust.price, cip_group.price, i.price) as resolved_price,
             CASE WHEN cip_cust.price IS NOT NULL OR cip_group.price IS NOT NULL THEN true ELSE false END as is_custom_price
      FROM items i
      LEFT JOIN customers cust ON cust.id = $2
      LEFT JOIN customer_item_prices cip_cust ON i.id = cip_cust.item_id AND cip_cust.customer_id = $2
      LEFT JOIN customer_item_prices cip_group ON i.id = cip_group.item_id AND cip_group.group_id = cust.group_id
      WHERE i.id = $1
    `;
    const result = await pool.query(query, [itemId, customerId]);
    return result.rows[0];
  }
}

module.exports = Item;
