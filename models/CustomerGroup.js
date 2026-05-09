const pool = require('../config/database');

class CustomerGroup {
  static async create({ name, description }) {
    const query = `
      INSERT INTO customer_groups (name, description, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [name, description]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM customer_groups WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT cg.*, 
        (SELECT COUNT(*) FROM customers WHERE group_id = cg.id) as customer_count
      FROM customer_groups cg 
      ORDER BY cg.name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, { name, description }) {
    const query = `
      UPDATE customer_groups 
      SET name = COALESCE($1, name), 
          description = COALESCE($2, description), 
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `DELETE FROM customer_groups WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  static async assignCustomer(customerId, groupId) {
    const query = `
      UPDATE customers 
      SET group_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [groupId, customerId]);
    return result.rows[0];
  }
}

module.exports = CustomerGroup;
