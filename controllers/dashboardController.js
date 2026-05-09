const pool = require('../config/database');

exports.getStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const queries = [
      // Total Users (Excluding Admin)
      pool.query('SELECT COUNT(*) FROM users WHERE role != $1', ['admin']),
      // Users from 30 days ago
      pool.query('SELECT COUNT(*) FROM users WHERE role != $1 AND created_at < $2', ['admin', thirtyDaysAgo]),

      // Total Customers
      pool.query('SELECT COUNT(*) FROM customers'),
      // Customers from 30 days ago
      pool.query('SELECT COUNT(*) FROM customers WHERE created_at < $1', [thirtyDaysAgo]),

      // Total Items
      pool.query('SELECT COUNT(*) FROM items'),
      // Items from 30 days ago
      pool.query('SELECT COUNT(*) FROM items WHERE created_at < $1', [thirtyDaysAgo]),

      // Total Orders
      pool.query('SELECT COUNT(*) FROM orders'),
      // Orders from 30 days ago
      pool.query('SELECT COUNT(*) FROM orders WHERE created_at < $1', [thirtyDaysAgo])
    ];

    const results = await Promise.all(queries);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    const stats = {
      users: {
        value: parseInt(results[0].rows[0].count),
        change: calculateChange(parseInt(results[0].rows[0].count), parseInt(results[1].rows[0].count))
      },
      shops: {
        value: parseInt(results[2].rows[0].count),
        change: calculateChange(parseInt(results[2].rows[0].count), parseInt(results[3].rows[0].count))
      },
      items: {
        value: parseInt(results[4].rows[0].count),
        change: calculateChange(parseInt(results[4].rows[0].count), parseInt(results[5].rows[0].count))
      },
      orders: {
        value: parseInt(results[6].rows[0].count),
        change: calculateChange(parseInt(results[6].rows[0].count), parseInt(results[7].rows[0].count))
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const queries = [
      // Recent Users
      pool.query(`
        SELECT id, name as title, 'user' as type, created_at 
        FROM users 
        WHERE role != 'admin' 
        ORDER BY created_at DESC LIMIT 5
      `),
      // Recent Customers/Shops
      pool.query(`
        SELECT id, name as title, 'customer' as type, created_at 
        FROM customers 
        ORDER BY created_at DESC LIMIT 5
      `),
      // Recent Orders
      pool.query(`
        SELECT o.id, o.order_number as title, 'order' as type, o.created_at, c.name as subtitle
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC LIMIT 5
      `)
    ];

    const [users, customers, orders] = await Promise.all(queries);

    const activities = [
      ...users.rows.map(u => ({ ...u, description: 'New staff member registered' })),
      ...customers.rows.map(c => ({ ...c, description: 'New service shop added' })),
      ...orders.rows.map(o => ({ ...o, description: `Order placed for ${o.subtitle}` }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

    res.json({
      success: true,
      data: activities
    });
  } catch (err) {
    console.error('Error fetching dashboard activities:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
