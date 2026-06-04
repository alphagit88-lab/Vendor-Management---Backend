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

  static async getCombinedReport(adminId = null, customerName = null, itemId = null, startDate = null, endDate = null) {
    // Build the orders part
    let ordersJoin = '';
    let ordersExtraWhere = '';
    let returnsExtraWhere = '';
    let paramCount = 2; // adminId is $1

    const values = [adminId];

    if (itemId) {
      ordersJoin = 'JOIN order_items oi ON o.id = oi.order_id';
      ordersExtraWhere = `AND oi.item_id = $${paramCount}`;
      returnsExtraWhere = `AND r.item_id = $${paramCount}`;
      values.push(parseInt(itemId));
      paramCount++;
    }

    let whereParts = [];

    if (customerName) {
      whereParts.push(`customer_name ILIKE $${paramCount} || '%'`);
      values.push(customerName);
      paramCount++;
    }

    if (startDate) {
      whereParts.push(`created_at >= $${paramCount}`);
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereParts.push(`created_at <= $${paramCount}`);
      values.push(endDate);
      paramCount++;
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : 'WHERE 1=1';

    const query = `
      WITH combined_data AS (
        SELECT 
          o.id as id,
          'order' as type,
          o.order_number as number,
          o.load_number,
          c.name as customer_name,
          u.name as user_name,
          o.total_credits,
          o.total_deposit,
          o.total_amount,
          o.status,
          o.created_at
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.user_id = u.id
        ${ordersJoin}
        WHERE ($1::integer IS NULL OR o.user_id = $1::integer OR o.user_id IN (SELECT id FROM users WHERE admin_id = $1::integer))
        ${ordersExtraWhere}
        
        UNION ALL
        
        SELECT 
          r.id as id,
          'return' as type,
          CAST(r.id as text) as number,
          null as load_number,
          c.name as customer_name,
          u.name as user_name,
          0 as total_credits,
          0 as total_deposit,
          -1 * (i.price * r.quantity) as total_amount,
          'returned' as status,
          r.created_at
        FROM returns r
        JOIN items i ON r.item_id = i.id
        JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE ($1::integer IS NULL OR r.user_id = $1::integer OR r.admin_id = $1::integer)
        ${returnsExtraWhere}
      )
      SELECT DISTINCT * FROM combined_data
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Report;
