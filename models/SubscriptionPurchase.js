const pool = require('../config/database');

function mapPurchase(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    subscriptionPlanId: row.subscription_plan_id,
    planName: row.plan_name,
    amount: parseFloat(row.amount),
    currency: row.currency,
    status: row.status,
    purchaseType: row.purchase_type,
    stripeSessionId: row.stripe_session_id,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name || undefined,
    userEmail: row.user_email || undefined,
  };
}

class SubscriptionPurchase {
  static async create({ userId, plan, purchaseType = 'purchase' }) {
    const result = await pool.query(
      `INSERT INTO subscription_purchases
        (user_id, subscription_plan_id, plan_name, amount, currency, status, purchase_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'usd', 'pending', $5, NOW(), NOW())
       RETURNING *`,
      [userId, plan.id, plan.name, plan.price, purchaseType]
    );
    return mapPurchase(result.rows[0]);
  }

  static async updateStripeSessionId(id, stripeSessionId) {
    const result = await pool.query(
      `UPDATE subscription_purchases SET stripe_session_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, stripeSessionId]
    );
    return mapPurchase(result.rows[0]);
  }

  static async findByStripeSessionId(sessionId) {
    const result = await pool.query(
      'SELECT * FROM subscription_purchases WHERE stripe_session_id = $1',
      [sessionId]
    );
    return mapPurchase(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM subscription_purchases WHERE id = $1', [id]);
    return mapPurchase(result.rows[0]);
  }

  static async findPaidForUserAndPlan(userId, planId) {
    const result = await pool.query(
      `SELECT * FROM subscription_purchases
       WHERE user_id = $1 AND subscription_plan_id = $2 AND status = 'paid'
       ORDER BY paid_at DESC LIMIT 1`,
      [userId, planId]
    );
    return mapPurchase(result.rows[0]);
  }

  static async findPaidPlanIds(userId) {
    const result = await pool.query(
      `SELECT DISTINCT subscription_plan_id FROM subscription_purchases
       WHERE user_id = $1 AND status = 'paid'`,
      [userId]
    );
    return result.rows.map((row) => row.subscription_plan_id);
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM subscription_purchases WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(mapPurchase);
  }

  static async findAllAdmin() {
    const result = await pool.query(
      `SELECT sp.*, u.name AS user_name, u.email AS user_email
       FROM subscription_purchases sp
       JOIN users u ON u.id = sp.user_id
       ORDER BY sp.created_at DESC`
    );
    return result.rows.map(mapPurchase);
  }

  static async findByIdAdmin(id) {
    const result = await pool.query(
      `SELECT sp.*, u.name AS user_name, u.email AS user_email
       FROM subscription_purchases sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.id = $1`,
      [id]
    );
    return mapPurchase(result.rows[0]);
  }

  static async markPaid(client, purchaseId) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE subscription_purchases
       SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [purchaseId]
    );
    return mapPurchase(result.rows[0]);
  }

  static async markFailed(purchaseId, status = 'cancelled') {
    const result = await pool.query(
      `UPDATE subscription_purchases SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [purchaseId, status]
    );
    return mapPurchase(result.rows[0]);
  }
}

module.exports = SubscriptionPurchase;
