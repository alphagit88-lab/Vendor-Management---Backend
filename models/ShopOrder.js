const pool = require('../config/database');

function mapOrder(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address,
    status: row.status,
    stripeSessionId: row.stripe_session_id,
    subtotal: parseFloat(row.subtotal),
    totalAmount: parseFloat(row.total_amount),
    currency: row.currency,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((item) => ({
      id: item.id,
      hardwareProductId: item.hardware_product_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      lineTotal: parseFloat(item.line_total),
    })),
  };
}

async function generateOrderNumber(client) {
  const prefix = `HW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM shop_orders WHERE order_number LIKE $1`,
    [`${prefix}%`]
  );
  const seq = String((result.rows[0]?.count || 0) + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
}

class ShopOrder {
  static async createWithItems(client, { customer, totals, items, stripeSessionId }) {
    const orderNumber = await generateOrderNumber(client);
    const orderResult = await client.query(
      `INSERT INTO shop_orders
        (order_number, customer_name, customer_email, customer_phone, shipping_address,
         status, stripe_session_id, subtotal, total_amount, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, 'usd', NOW(), NOW())
       RETURNING *`,
      [
        orderNumber,
        customer.name,
        customer.email,
        customer.phone || null,
        customer.shippingAddress,
        stripeSessionId || null,
        totals.subtotal,
        totals.total,
      ]
    );
    const order = orderResult.rows[0];

    const insertedItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO shop_order_items
          (shop_order_id, hardware_product_id, product_name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [order.id, item.productId, item.name, item.quantity, item.unitPrice, item.lineTotal]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    return mapOrder(order, insertedItems);
  }

  static async updateStripeSessionId(id, stripeSessionId) {
    const result = await pool.query(
      `UPDATE shop_orders SET stripe_session_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, stripeSessionId]
    );
    return result.rows[0];
  }

  static async findByStripeSessionId(sessionId) {
    const orderResult = await pool.query(
      'SELECT * FROM shop_orders WHERE stripe_session_id = $1',
      [sessionId]
    );
    if (!orderResult.rows[0]) return null;
    const itemsResult = await pool.query(
      'SELECT * FROM shop_order_items WHERE shop_order_id = $1 ORDER BY id',
      [orderResult.rows[0].id]
    );
    return mapOrder(orderResult.rows[0], itemsResult.rows);
  }

  static async findById(id) {
    const orderResult = await pool.query('SELECT * FROM shop_orders WHERE id = $1', [id]);
    if (!orderResult.rows[0]) return null;
    const itemsResult = await pool.query(
      'SELECT * FROM shop_order_items WHERE shop_order_id = $1 ORDER BY id',
      [id]
    );
    return mapOrder(orderResult.rows[0], itemsResult.rows);
  }

  static async markPaid(client, orderId) {
    const result = await client.query(
      `UPDATE shop_orders
       SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [orderId]
    );
    return result.rows[0];
  }

  static async markFailed(orderId, status = 'failed') {
    const result = await pool.query(
      `UPDATE shop_orders SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [orderId, status]
    );
    return result.rows[0];
  }

  static async getOrderItemsForUpdate(client, orderId) {
    const result = await client.query(
      'SELECT * FROM shop_order_items WHERE shop_order_id = $1',
      [orderId]
    );
    return result.rows;
  }

  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM shop_orders ORDER BY created_at DESC'
    );
    return result.rows.map((row) => mapOrder(row));
  }

  static async updateStatus(id, status) {
    const allowed = ['pending', 'paid', 'cancelled', 'failed', 'processing', 'shipped', 'delivered'];
    if (!allowed.includes(status)) {
      throw new Error('Invalid order status');
    }

    const paidAtClause = status === 'paid' ? ', paid_at = COALESCE(paid_at, NOW())' : '';
    const result = await pool.query(
      `UPDATE shop_orders SET status = $2, updated_at = NOW()${paidAtClause} WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return result.rows[0] ? mapOrder(result.rows[0]) : null;
  }
}

module.exports = ShopOrder;
