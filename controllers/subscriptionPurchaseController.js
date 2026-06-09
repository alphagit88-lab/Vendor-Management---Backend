const pool = require('../config/database');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionPurchase = require('../models/SubscriptionPurchase');
const {
  createSubscriptionCheckoutSession,
  retrieveCheckoutSession,
} = require('../utils/stripe');

async function fulfillPaidSubscription(purchaseId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const purchaseRow = await client.query(
      'SELECT * FROM subscription_purchases WHERE id = $1 FOR UPDATE',
      [purchaseId]
    );
    if (!purchaseRow.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    if (purchaseRow.rows[0].status === 'paid') {
      await client.query('COMMIT');
      return SubscriptionPurchase.findById(purchaseId);
    }

    await SubscriptionPurchase.markPaid(client, purchaseId);

    await client.query(
      `UPDATE users
       SET subscription_plan_id = $2, is_active = true, updated_at = NOW()
       WHERE id = $1`,
      [purchaseRow.rows[0].user_id, purchaseRow.rows[0].subscription_plan_id]
    );

    await client.query('COMMIT');
    return SubscriptionPurchase.findById(purchaseId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

exports.fulfillPaidSubscription = fulfillPaidSubscription;

exports.getAdminPurchases = async (req, res) => {
  try {
    const purchases = await SubscriptionPurchase.findAllAdmin();
    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAdminPurchaseById = async (req, res) => {
  try {
    const purchase = await SubscriptionPurchase.findByIdAdmin(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Subscription payment not found' });
    }
    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const user = await User.findById(req.user.id);
    const subscriptionPlan = await User.getSubscriptionPlan(req.user.id);
    const paidPlanIds = await SubscriptionPurchase.findPaidPlanIds(req.user.id);
    const purchases = await SubscriptionPurchase.findByUserId(req.user.id);

    res.json({
      success: true,
      data: {
        currentPlanId: user.subscription_plan_id,
        subscriptionPlan,
        paidPlanIds,
        purchases,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.requestPlanChange = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const planId = Number(req.body.planId);
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    const user = await User.findById(req.user.id);

    if (user.subscription_plan_id === planId) {
      return res.json({
        success: true,
        data: { action: 'already_assigned', message: 'You are already on this plan.' },
      });
    }

    const planPrice = parseFloat(plan.price) || 0;

    if (planPrice <= 0) {
      await User.update(req.user.id, { subscription_plan_id: planId, is_active: true });
      return res.json({
        success: true,
        data: { action: 'assigned', planId, message: 'Free plan assigned successfully.' },
      });
    }

    const existingPaid = await SubscriptionPurchase.findPaidForUserAndPlan(req.user.id, planId);
    if (existingPaid) {
      await User.update(req.user.id, { subscription_plan_id: planId });
      return res.json({
        success: true,
        data: {
          action: 'assigned',
          planId,
          message: 'Plan already paid for. Subscription updated.',
        },
      });
    }

    const purchase = await SubscriptionPurchase.create({
      userId: req.user.id,
      plan,
      purchaseType: user.subscription_plan_id ? 'upgrade' : 'initial',
    });

    const session = await createSubscriptionCheckoutSession({
      purchase,
      plan,
      userEmail: user.email,
    });

    await SubscriptionPurchase.updateStripeSessionId(purchase.id, session.id);

    res.status(201).json({
      success: true,
      data: {
        action: 'checkout',
        purchaseId: purchase.id,
        checkoutUrl: session.url,
        sessionId: session.id,
        amount: planPrice,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message || 'Unable to process plan change',
    });
  }
};

exports.verifyCheckoutSession = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { session_id: sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }

    const session = await retrieveCheckoutSession(sessionId);
    const purchaseId = Number(session.metadata?.subscription_purchase_id);

    if (!purchaseId || session.metadata?.type !== 'subscription_purchase') {
      return res.status(404).json({ success: false, message: 'Subscription purchase not found' });
    }

    let purchase = await SubscriptionPurchase.findByStripeSessionId(sessionId);

    if (Number(session.metadata?.user_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (session.payment_status === 'paid' && purchase?.status === 'pending') {
      purchase = await fulfillPaidSubscription(purchaseId);
    } else if (session.payment_status !== 'paid' && purchase?.status === 'pending') {
      await SubscriptionPurchase.markFailed(purchaseId, 'cancelled');
      purchase = await SubscriptionPurchase.findById(purchaseId);
    }

    const subscriptionPlan = await User.getSubscriptionPlan(req.user.id);

    res.json({
      success: true,
      data: {
        purchase,
        subscriptionPlan,
        paymentStatus: session.payment_status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to verify payment' });
  }
};
