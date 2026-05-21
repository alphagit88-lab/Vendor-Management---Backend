const pool = require('../config/database');

class Report {
  static async getSalesSummary(adminId = null) {
    const query = `
      SELECT 
        DATE_TRUNC('day', o.created_at) as date,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status != 'cancelled'
        AND ($1::integer IS NULL OR c.admin_id = $1::integer)
      GROUP BY DATE_TRUNC('day', o.created_at)
      ORDER BY date DESC
      LIMIT 30;
    `;
    const result = await pool.query(query, [adminId]);
    return result.rows;
  }

  static async getTopCustomers(adminId = null) {
    const query = `
      SELECT 
        c.dba as customer_name,
        c.account_id,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE ($1::integer IS NULL OR c.admin_id = $1::integer)
      GROUP BY c.id, c.dba, c.account_id
      ORDER BY total_spent DESC
      LIMIT 10;
    `;
    const result = await pool.query(query, [adminId]);
    return result.rows;
  }

  static async getInventoryStatus(adminId = null) {
    const query = `
      SELECT 
        i.description_name as item_name,
        COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(si.quantity) FROM salesperson_inventory si JOIN users u ON si.user_id = u.id WHERE si.item_id = i.id AND ($1::integer IS NULL OR u.admin_id = $1::integer)), 0) as stock,
        inv.reorder_level
      FROM items i
      LEFT JOIN inventory inv ON i.id = inv.item_id
      WHERE (COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(si.quantity) FROM salesperson_inventory si JOIN users u ON si.user_id = u.id WHERE si.item_id = i.id AND ($1::integer IS NULL OR u.admin_id = $1::integer)), 0)) <= COALESCE(inv.reorder_level, 10)
        AND ($1::integer IS NULL OR i.admin_id = $1::integer)
      ORDER BY stock ASC;
    `;
    const result = await pool.query(query, [adminId]);
    return result.rows;
  }
}

module.exports = Report;
