const pool = require('../config/database');

exports.getStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isSuperAdmin = req.user.role === 'super_admin';

    let queries;
    if (isSuperAdmin) {
      queries = [
        // Total Admins
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']),
        // Admins from 30 days ago
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND created_at < $2', ['admin', thirtyDaysAgo]),

        // Total Staff
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['staff']),
        // Staff from 30 days ago
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND created_at < $2', ['staff', thirtyDaysAgo]),

        // Total Customers/Shops
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
    } else {
      const adminId = req.user.id;
      queries = [
        // Total sales people belonging to this admin
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND admin_id = $2', ['staff', adminId]),
        // Sales people from 30 days ago belonging to this admin
        pool.query('SELECT COUNT(*) FROM users WHERE role = $1 AND admin_id = $2 AND created_at < $3', ['staff', adminId, thirtyDaysAgo]),

        // Total Customers scoped to this admin
        pool.query('SELECT COUNT(*) FROM customers WHERE admin_id = $1', [adminId]),
        // Customers from 30 days ago scoped to this admin
        pool.query('SELECT COUNT(*) FROM customers WHERE admin_id = $1 AND created_at < $2', [adminId, thirtyDaysAgo]),

        // Total Items scoped to this admin
        pool.query('SELECT COUNT(*) FROM items WHERE admin_id = $1', [adminId]),
        // Items from 30 days ago scoped to this admin
        pool.query('SELECT COUNT(*) FROM items WHERE admin_id = $1 AND created_at < $2', [adminId, thirtyDaysAgo]),

        // Total Orders belonging to this admin or their staff
        pool.query('SELECT COUNT(*) FROM orders WHERE user_id = $1 OR user_id IN (SELECT id FROM users WHERE admin_id = $1)', [adminId]),
        // Orders from 30 days ago belonging to this admin or their staff
        pool.query('SELECT COUNT(*) FROM orders WHERE (user_id = $1 OR user_id IN (SELECT id FROM users WHERE admin_id = $1)) AND created_at < $2', [adminId, thirtyDaysAgo])
      ];
    }

    const results = await Promise.all(queries);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    let stats;
    if (isSuperAdmin) {
      stats = {
        admins: {
          value: parseInt(results[0].rows[0].count),
          change: calculateChange(parseInt(results[0].rows[0].count), parseInt(results[1].rows[0].count))
        },
        staff: {
          value: parseInt(results[2].rows[0].count),
          change: calculateChange(parseInt(results[2].rows[0].count), parseInt(results[3].rows[0].count))
        },
        shops: {
          value: parseInt(results[4].rows[0].count),
          change: calculateChange(parseInt(results[4].rows[0].count), parseInt(results[5].rows[0].count))
        },
        items: {
          value: parseInt(results[6].rows[0].count),
          change: calculateChange(parseInt(results[6].rows[0].count), parseInt(results[7].rows[0].count))
        },
        orders: {
          value: parseInt(results[8].rows[0].count),
          change: calculateChange(parseInt(results[8].rows[0].count), parseInt(results[9].rows[0].count))
        }
      };
    } else {
      stats = {
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
    }

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
    const isSuperAdmin = req.user.role === 'super_admin';

    let usersQuery, usersParams;
    let ordersQuery, ordersParams;
    let customersQuery, customersParams;

    if (isSuperAdmin) {
      usersQuery = `
        SELECT id, name as title, role, 'user' as type, created_at 
        FROM users 
        WHERE role != 'super_admin' 
        ORDER BY created_at DESC LIMIT 5
      `;
      usersParams = [];

      ordersQuery = `
        SELECT o.id, o.order_number as title, 'order' as type, o.created_at, c.name as subtitle
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC LIMIT 5
      `;
      ordersParams = [];

      customersQuery = `
        SELECT id, name as title, 'customer' as type, created_at 
        FROM customers 
        ORDER BY created_at DESC LIMIT 5
      `;
      customersParams = [];
    } else {
      const adminId = req.user.id;

      usersQuery = `
        SELECT id, name as title, role, 'user' as type, created_at 
        FROM users 
        WHERE role = 'staff' AND admin_id = $1
        ORDER BY created_at DESC LIMIT 5
      `;
      usersParams = [adminId];

      ordersQuery = `
        SELECT o.id, o.order_number as title, 'order' as type, o.created_at, c.name as subtitle
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE c.admin_id = $1
        ORDER BY o.created_at DESC LIMIT 5
      `;
      ordersParams = [adminId];

      customersQuery = `
        SELECT id, name as title, 'customer' as type, created_at 
        FROM customers 
        WHERE admin_id = $1
        ORDER BY created_at DESC LIMIT 5
      `;
      customersParams = [adminId];
    }

    const queries = [
      pool.query(usersQuery, usersParams),
      pool.query(customersQuery, customersParams),
      pool.query(ordersQuery, ordersParams)
    ];

    const [users, customers, orders] = await Promise.all(queries);

    const activities = [
      ...users.rows.map(u => ({ 
        ...u, 
        description: u.role === 'admin' ? 'New admin registered' : 'New staff member registered' 
      })),
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

