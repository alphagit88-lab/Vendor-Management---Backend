const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const SubscriptionPlan = require('./SubscriptionPlan');

class User {
  static async create({ name, phone, username, email, role, password, inventory_location, admin_id, enable_par_levels, subscription_plan_id }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, phone, username, email, role, password_hash, inventory_location, admin_id, enable_par_levels, subscription_plan_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, name, phone, username, email, role, inventory_location, admin_id, enable_par_levels, subscription_plan_id, created_at, updated_at
    `;
    const values = [name, phone, username || null, email || null, role, hashedPassword, inventory_location || null, admin_id || null, enable_par_levels !== undefined ? enable_par_levels : true, subscription_plan_id || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.phone,
        u.username,
        u.email,
        u.role,
        u.inventory_location,
        u.admin_id,
        u.enable_par_levels,
        u.subscription_plan_id,
        p.name as admin_name,
        u.password_hash,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN users p ON u.admin_id = p.id
      WHERE u.phone = $1
    `;
    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.phone,
        u.username,
        u.email,
        u.role,
        u.inventory_location,
        u.admin_id,
        u.enable_par_levels,
        u.subscription_plan_id,
        p.name as admin_name,
        u.password_hash,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN users p ON u.admin_id = p.id
      WHERE u.username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.phone,
        u.username,
        u.email,
        u.role,
        u.inventory_location,
        u.admin_id,
        u.enable_par_levels,
        u.subscription_plan_id,
        p.name as admin_name,
        u.password_hash,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN users p ON u.admin_id = p.id
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.phone, 
        u.username,
        u.email, 
        u.role,
        u.inventory_location,
        u.admin_id,
        u.enable_par_levels,
        u.subscription_plan_id,
        p.name as admin_name,
        u.created_at, 
        u.updated_at 
      FROM users u 
      LEFT JOIN users p ON u.admin_id = p.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.phone, 
        u.username,
        u.email, 
        u.role,
        u.inventory_location,
        u.admin_id,
        u.enable_par_levels,
        u.subscription_plan_id,
        p.name as admin_name,
        u.created_at, 
        u.updated_at 
      FROM users u 
      LEFT JOIN users p ON u.admin_id = p.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, { name, username, email, role, inventory_location, admin_id, enable_par_levels, subscription_plan_id }) {
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
    if (admin_id !== undefined) {
      updates.push(`admin_id = $${paramCount++}`);
      values.push(admin_id || null);
    }
    if (enable_par_levels !== undefined) {
      updates.push(`enable_par_levels = $${paramCount++}`);
      values.push(enable_par_levels);
    }
    if (subscription_plan_id !== undefined) {
      updates.push(`subscription_plan_id = $${paramCount++}`);
      values.push(subscription_plan_id);
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
      RETURNING id, name, phone, username, email, role, inventory_location, admin_id, enable_par_levels, subscription_plan_id, created_at, updated_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get subscription plan details for a user
  static async getSubscriptionPlan(userId) {
    const query = `
      SELECT sp.*
      FROM subscription_plans sp
      JOIN users u ON u.subscription_plan_id = sp.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Count current products for an admin
  static async getProductCount(adminId) {
    const query = `
      SELECT COUNT(*) as count
      FROM items
      WHERE admin_id = $1
    `;
    const result = await pool.query(query, [adminId]);
    return parseInt(result.rows[0].count);
  }

  // Count current sales persons for an admin
  static async getSalesPersonCount(adminId) {
    const query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE admin_id = $1 AND role = 'staff'
    `;
    const result = await pool.query(query, [adminId]);
    return parseInt(result.rows[0].count);
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
