const pool = require('../config/database');

class Setting {
  static async getAll(adminId = null) {
    let query = `
      SELECT key, value, admin_id 
      FROM settings 
      WHERE admin_id IS NULL
    `;
    const params = [];
    if (adminId) {
      query += ` OR admin_id = $1`;
      params.push(adminId);
    }
    const result = await pool.query(query, params);
    
    const settings = {};
    
    // Sort rows so that rows with admin_id !== null are processed LAST
    const sortedRows = result.rows.sort((a, b) => {
      if (a.admin_id === null && b.admin_id !== null) return -1;
      if (a.admin_id !== null && b.admin_id === null) return 1;
      return 0;
    });

    sortedRows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  static async get(key, adminId = null) {
    let query;
    let params;
    if (adminId) {
      query = `
        SELECT value 
        FROM settings 
        WHERE key = $1 AND (admin_id = $2 OR admin_id IS NULL)
        ORDER BY admin_id DESC NULLS LAST
        LIMIT 1
      `;
      params = [key, adminId];
    } else {
      query = `
        SELECT value 
        FROM settings 
        WHERE key = $1 AND admin_id IS NULL
      `;
      params = [key];
    }
    const result = await pool.query(query, params);
    return result.rows[0]?.value || null;
  }

  static async update(key, value, adminId = null) {
    const checkQuery = `
      SELECT id FROM settings 
      WHERE key = $1 AND (admin_id = $2 OR (admin_id IS NULL AND $2 IS NULL))
    `;
    const checkResult = await pool.query(checkQuery, [key, adminId]);
    if (checkResult.rows.length > 0) {
      const updateQuery = `
        UPDATE settings 
        SET value = $1, updated_at = NOW() 
        WHERE key = $2 AND (admin_id = $3 OR (admin_id IS NULL AND $3 IS NULL))
        RETURNING *
      `;
      const res = await pool.query(updateQuery, [value, key, adminId]);
      return res.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO settings (key, value, admin_id, updated_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const res = await pool.query(insertQuery, [key, value, adminId]);
      return res.rows[0];
    }
  }
}

module.exports = Setting;
