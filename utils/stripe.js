const Stripe = require('stripe');

let stripeClient = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

async function createCheckoutSession({ order, lineItems }) {
  const stripe = getStripe();
  const frontendUrl = getFrontendUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: order.customerEmail,
    line_items: lineItems,
    metadata: {
      type: 'hardware_shop',
      shop_order_id: String(order.id),
      order_number: order.orderNumber,
    },
    success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/checkout/cancel?order_id=${order.id}`,
  });

  return session;
}

async function createSubscriptionCheckoutSession({ purchase, plan, userEmail }) {
  const stripe = getStripe();
  const frontendUrl = getFrontendUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${plan.name} Subscription`,
            description: plan.description || 'One-time subscription plan purchase',
          },
          unit_amount: Math.round(parseFloat(plan.price) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'subscription_purchase',
      subscription_purchase_id: String(purchase.id),
      user_id: String(purchase.userId),
      subscription_plan_id: String(plan.id),
    },
    success_url: `${frontendUrl}/dashboard/payment-settings/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/dashboard/payment-settings/cancel?purchase_id=${purchase.id}`,
  });

  return session;
}

async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  });
}

function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

async function createPaymentIntent({ amount, currency = 'usd', metadata }) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    payment_method_types: ['card'],
    metadata,
  });
}

async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

module.exports = {
  getStripe,
  createCheckoutSession,
  createSubscriptionCheckoutSession,
  retrieveCheckoutSession,
  constructWebhookEvent,
  createPaymentIntent,
  retrievePaymentIntent,
};
