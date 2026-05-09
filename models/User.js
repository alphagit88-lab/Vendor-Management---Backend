const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, phone, username, email, role, password, inventory_location }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, phone, username, email, role, password_hash, inventory_location, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, name, phone, username, email, role, inventory_location, created_at, updated_at
    `;
    const values = [name, phone, username || null, email || null, role, hashedPassword, inventory_location || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const query = `
      SELECT
        id,
        name,
        phone,
        username,
        email,
        role,
        inventory_location,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE phone = $1
    `;
    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = `
      SELECT
        id,
        name,
        phone,
        username,
        email,
        role,
        inventory_location,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT
        id,
        name,
        phone,
        username,
        email,
        role,
        inventory_location,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        username,
        email, 
        role,
        inventory_location,
        created_at, 
        updated_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        username,
        email, 
        role,
        inventory_location,
        created_at, 
        updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, { name, username, email, role, inventory_location }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username || null);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email || null);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (inventory_location !== undefined) {
      updates.push(`inventory_location = $${paramCount++}`);
      values.push(inventory_location || null);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, phone, username, email, role, inventory_location, created_at, updated_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  static async updatePassword(id, hashedPassword) {
    const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
    await pool.query(query, [hashedPassword, id]);
  }
}

module.exports = User;
