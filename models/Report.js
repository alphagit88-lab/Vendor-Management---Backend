const pool = require('../config/database');

class Report {
  static async getSalesSummary() {
    const query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(id) as total_orders,
        SUM(total_amount) as total_revenue
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
      LIMIT 30;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTopCustomers() {
    const query = `
      SELECT 
        c.dba as customer_name,
        c.account_id,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id, c.dba, c.account_id
      ORDER BY total_spent DESC
      LIMIT 10;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getInventoryStatus() {
    const query = `
      SELECT 
        i.description_name as item_name,
        COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(quantity) FROM salesperson_inventory WHERE item_id = i.id), 0) as stock,
        inv.reorder_level
      FROM items i
      LEFT JOIN inventory inv ON i.id = inv.item_id
      WHERE (COALESCE(inv.quantity, 0) + COALESCE((SELECT SUM(quantity) FROM salesperson_inventory WHERE item_id = i.id), 0)) <= inv.reorder_level
      ORDER BY stock ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Report;
