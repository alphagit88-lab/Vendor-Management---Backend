const pool = require('../config/database');

class Category {
  static async create({ name, description, admin_id }) {
    const query = `
      INSERT INTO categories (name, description, admin_id, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, admin_id || null]);
    return result.rows[0];
  }

  static async findAll(adminId = null) {
    let query = `SELECT * FROM categories`;
    const values = [];
    if (adminId) {
      query += ` WHERE admin_id = $1`;
      values.push(adminId);
    }
    query += ` ORDER BY name ASC`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `SELECT * FROM categories WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, { name, description }) {
    const query = `
      UPDATE categories 
      SET name = $1, description = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM categories WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Category;
