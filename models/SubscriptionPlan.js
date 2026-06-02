const pool = require('../config/database');

class SubscriptionPlan {
  static async create({ name, product_limit, sales_person_limit, price }) {
    const query = `
      INSERT INTO subscription_plans (name, product_limit, sales_person_limit, price, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, name, product_limit, sales_person_limit, price, created_at, updated_at
    `;
    const values = [name, product_limit, sales_person_limit, price || 0.00];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT id, name, product_limit, sales_person_limit, price, created_at, updated_at
      FROM subscription_plans
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT id, name, product_limit, sales_person_limit, price, created_at, updated_at
      FROM subscription_plans
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, { name, product_limit, sales_person_limit, price }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (product_limit !== undefined) {
      updates.push(`product_limit = $${paramCount++}`);
      values.push(product_limit);
    }
    if (sales_person_limit !== undefined) {
      updates.push(`sales_person_limit = $${paramCount++}`);
      values.push(sales_person_limit);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE subscription_plans
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, product_limit, sales_person_limit, price, created_at, updated_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM subscription_plans WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = SubscriptionPlan;
