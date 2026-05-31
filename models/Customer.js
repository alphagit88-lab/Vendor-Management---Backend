const pool = require('../config/database');

class Customer {
  static async getNextAccountId() {
    // Corrected to use 'customers' table
    const query = `SELECT account_id FROM customers WHERE account_id ~ '^[0-9]+$' ORDER BY account_id DESC LIMIT 1`;
    const result = await pool.query(query);
    if (result.rows.length === 0) return '0300';
    
    const lastId = parseInt(result.rows[0].account_id);
    const nextId = lastId + 1;
    return nextId.toString().padStart(4, '0');
  }

  static async create({ address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id, admin_id, par_levels }) {
    const final_account_id = account_id || await this.getNextAccountId();
    
    // Updated INSERT to customers table
    const query = `
      INSERT INTO customers (name, address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id, admin_id, par_levels, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *
    `;
    // Sanitize values: convert empty strings to null for database compatibility
    const values = [
      dba || final_account_id, // name
      address, 
      phone, 
      final_account_id, 
      permit_numbers || null, 
      registered_company_name || null, 
      dba || null, 
      email || null, 
      sales_tax_id || null, 
      has_cigarette_permit || false, 
      tobacco_permit_number || null, 
      (tobacco_expire_date && tobacco_expire_date !== "") ? tobacco_expire_date : null, 
      payment_type || null, 
      latitude || null, 
      longitude || null,
      group_id || null,
      admin_id || null,
      par_levels || '{}'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM customers WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(adminId = null) {
    let query = `SELECT * FROM customers`;
    const values = [];
    if (adminId) {
      query += ` WHERE admin_id = $1`;
      values.push(adminId);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id, par_levels }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fieldMap = {
      address, phone, account_id, permit_numbers, 
      registered_company_name, dba, email, sales_tax_id, 
      has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type,
      latitude, longitude, group_id, par_levels
    };

    // Keep internal name in sync
    if (dba !== undefined) {
      fieldMap.name = dba;
    }

    // Filter out undefined values to only update provided fields
    for (const [key, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        // Convert empty strings to null for database compatibility
        values.push((value === "" && key !== 'address') ? null : value);
      }
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE customers 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM customers WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Customer;
