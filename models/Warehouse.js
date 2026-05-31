const pool = require('../config/database');

class Warehouse {
  static async create({ name, location, admin_id }) {
    const query = `
      INSERT INTO warehouses (name, location, admin_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [name, location, admin_id]);
    return result.rows[0];
  }

  static async findAll(adminId = null) {
    let query = `SELECT * FROM warehouses`;
    const params = [];
    if (adminId) {
      params.push(adminId);
      query += ` WHERE admin_id = $1`;
    }
    query += ` ORDER BY name ASC`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id, adminId = null) {
    let query = `SELECT * FROM warehouses WHERE id = $1`;
    const params = [id];
    if (adminId) {
      params.push(adminId);
      query += ` AND admin_id = $2`;
    }
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async update(id, { name, location }) {
    const query = `
      UPDATE warehouses 
      SET name = $1, location = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, location, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM warehouses WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Warehouse;
