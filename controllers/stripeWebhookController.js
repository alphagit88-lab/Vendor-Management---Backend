const { constructWebhookEvent } = require('../utils/stripe');
const { fulfillPaidOrder } = require('./shopController');
const { fulfillPaidSubscription } = require('./subscriptionPurchaseController');

exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = constructWebhookEvent(req.body, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        const metadataType = session.metadata?.type;

        if (metadataType === 'subscription_purchase') {
          const purchaseId = Number(session.metadata?.subscription_purchase_id);
          if (purchaseId) {
            await fulfillPaidSubscription(purchaseId);
          }
        } else {
          const orderId = Number(session.metadata?.shop_order_id);
          if (orderId) {
            await fulfillPaidOrder(orderId);
          }
        }
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadataType = paymentIntent.metadata?.type;

      if (metadataType === 'subscription_purchase') {
        const purchaseId = Number(paymentIntent.metadata?.subscription_purchase_id);
        if (purchaseId) {
          await fulfillPaidSubscription(purchaseId);
        }
      } else if (metadataType === 'hardware_shop') {
        const orderId = Number(paymentIntent.metadata?.shop_order_id);
        if (orderId) {
          await fulfillPaidOrder(orderId);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    res.status(400).json({ success: false, message: `Webhook Error: ${error.message}` });
  }
};
