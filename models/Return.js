const pool = require('../config/database');

class Return {
  
  /**
   * Create a single return record.
   * The amount is derived from `unit_price * quantity` and is not stored in the table.
   */
  static async create({ item_id, customer_id, user_id, admin_id, quantity, reason, unit_price, order_id }) {
    const query = `
      INSERT INTO returns (item_id, customer_id, user_id, admin_id, quantity, reason, unit_price, order_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    const values = [
      item_id,
      customer_id,
      user_id,
      admin_id,
      quantity,
      reason || null,
      unit_price !== undefined ? unit_price : null,
      order_id || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Bulk‑insert multiple returns. Used after order creation to associate the order_id.
   */
  static async createBatch(returns, client) {
    const dbClient = client || pool;
    const createdReturns = [];
    for (const returnItem of returns) {
      const query = `
        INSERT INTO returns (item_id, customer_id, user_id, admin_id, quantity, reason, unit_price, order_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;
      const values = [
        returnItem.item_id,
        returnItem.customer_id,
        returnItem.user_id,
        returnItem.admin_id,
        returnItem.quantity,
        returnItem.reason || null,
        returnItem.unit_price !== undefined ? returnItem.unit_price : null,
        returnItem.order_id || null
      ];
      const result = await dbClient.query(query, values);
      createdReturns.push(result.rows[0]);
    }
    return createdReturns;
  }

  static async findAll(userId = null, adminId = null) {
    let query = `
      SELECT r.*,
             i.description_name as item_name,
             i.item_number,
             c.name as customer_name,
             u.name as user_name
      FROM returns r
      JOIN items i ON r.item_id = i.id
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND r.user_id = $${paramIndex++}`;
      values.push(userId);
    } else if (adminId) {
      query += ` AND (r.user_id = $${paramIndex} OR r.admin_id = $${paramIndex})`;
      paramIndex++;
      values.push(adminId);
    }

    query += ` ORDER BY r.created_at DESC`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const numericId = parseInt(id);
    const query = `
      SELECT r.*,
             i.description_name as item_name,
             i.item_number,
             c.name as customer_name,
             u.name as user_name
      FROM returns r
      JOIN items i ON r.item_id = i.id
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [numericId]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM returns WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Return;
