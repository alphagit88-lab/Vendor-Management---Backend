const pool = require('../config/database');

class Setting {
  static async getAll() {
    const query = 'SELECT key, value FROM settings';
    const result = await pool.query(query);
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  static async get(key) {
    const query = 'SELECT value FROM settings WHERE key = $1';
    const result = await pool.query(query, [key]);
    return result.rows[0]?.value || null;
  }

  static async update(key, value) {
    const query = `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [key, value]);
    return result.rows[0];
  }
}

module.exports = Setting;
