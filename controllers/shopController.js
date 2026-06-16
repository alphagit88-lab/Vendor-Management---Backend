const pool = require('../config/database');
const HardwareProduct = require('../models/HardwareProduct');
const ShopOrder = require('../models/ShopOrder');
const {
  createPaymentIntent,
  retrieveCheckoutSession,
  retrievePaymentIntent,
} = require('../utils/stripe');

function validateCustomer(customer) {
  if (!customer?.name?.trim()) return 'Customer name is required';
  if (!customer?.email?.trim()) return 'Customer email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) return 'Valid email is required';
  
  if (customer && customer.shippingAddressLine1 !== undefined) {
    if (!customer.shippingAddressLine1.trim()) return 'Street address is required';
    if (!customer.shippingCity?.trim()) return 'City is required';
    if (!customer.shippingZip?.trim()) return 'ZIP/Postal code is required';
    if (!customer.shippingCountry?.trim()) return 'Country is required';
  } else {
    if (!customer?.shippingAddress?.trim()) return 'Shipping address is required';
  }
  return null;
}

function normalizeCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty');
  }

  const normalized = [];
  const seen = new Set();

  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    if (!productId || quantity < 1 || !Number.isInteger(quantity)) {
      throw new Error('Invalid cart item');
    }
    if (seen.has(productId)) {
      throw new Error('Duplicate products in cart');
    }
    seen.add(productId);
    normalized.push({ productId, quantity });
  }

  return normalized;
}

async function buildValidatedLineItems(client, cartItems) {
  const productIds = cartItems.map((item) => item.productId);
  const products = await HardwareProduct.findByIdsForCheckout(productIds, client);

  if (products.length !== cartItems.length) {
    throw new Error('One or more products are unavailable');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const orderItems = [];
  const stripeLineItems = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.productId);
    if (!product || !product.isActive) {
      throw new Error(`Product "${product?.name || cartItem.productId}" is unavailable`);
    }
    if (product.stock < cartItem.quantity) {
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
    }

    const unitPrice = product.price;
    const lineTotal = Number((unitPrice * cartItem.quantity).toFixed(2));
    subtotal += lineTotal;

    orderItems.push({
      productId: product.id,
      name: product.name,
      quantity: cartItem.quantity,
      unitPrice,
      lineTotal,
    });

    stripeLineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: product.name,
          description: product.description || undefined,
          images: product.image
            ? [`${product.image.startsWith('/uploads/')
                ? (process.env.API_PUBLIC_URL || process.env.FRONTEND_URL?.replace(':3000', ':5000') || 'http://localhost:5000')
                : (process.env.FRONTEND_URL || 'http://localhost:3000')}${product.image}`]
            : undefined,
        },
        unit_amount: Math.round(unitPrice * 100),
      },
      quantity: cartItem.quantity,
    });
  }

  return {
    orderItems,
    stripeLineItems,
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(subtotal.toFixed(2)),
  };
}

async function fulfillPaidOrder(orderId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRow = await client.query(
      'SELECT * FROM shop_orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRow.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    if (orderRow.rows[0].status === 'paid') {
      await client.query('COMMIT');
      return await ShopOrder.findById(orderId);
    }

    const items = await ShopOrder.getOrderItemsForUpdate(client, orderId);
    for (const item of items) {
      const updated = await HardwareProduct.decrementStock(
        client,
        item.hardware_product_id,
        item.quantity
      );
      if (!updated) {
        await client.query('ROLLBACK');
        await ShopOrder.markFailed(orderId, 'failed');
        throw new Error('Insufficient stock to fulfill order');
      }
    }

    await ShopOrder.markPaid(client, orderId);
    await client.query('COMMIT');
    return await ShopOrder.findById(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

exports.createCheckout = async (req, res) => {
  const client = await pool.connect();
  try {
    const customerError = validateCustomer(req.body.customer);
    if (customerError) {
      return res.status(400).json({ success: false, message: customerError });
    }

    const cartItems = normalizeCartItems(req.body.items);
    await client.query('BEGIN');

    const { orderItems, stripeLineItems, subtotal, total } = await buildValidatedLineItems(client, cartItems);

    let shippingAddress = req.body.customer.shippingAddress;
    if (req.body.customer.shippingAddressLine1 !== undefined) {
      shippingAddress = JSON.stringify([
        { key: 'shippingAddressLine1', value: req.body.customer.shippingAddressLine1.trim() },
        { key: 'shippingAddressLine2', value: req.body.customer.shippingAddressLine2?.trim() || '' },
        { key: 'shippingCity', value: req.body.customer.shippingCity.trim() },
        { key: 'shippingZip', value: req.body.customer.shippingZip.trim() },
        { key: 'shippingCountry', value: req.body.customer.shippingCountry.trim() }
      ]);
    }

    const order = await ShopOrder.createWithItems(client, {
      customer: {
        name: req.body.customer.name.trim(),
        email: req.body.customer.email.trim().toLowerCase(),
        phone: req.body.customer.phone?.trim() || null,
        shippingAddress: shippingAddress.trim(),
      },
      totals: { subtotal, total },
      items: orderItems,
    });

    const paymentIntent = await createPaymentIntent({
      amount: total,
      currency: 'usd',
      metadata: {
        type: 'hardware_shop',
        shop_order_id: String(order.id),
        order_number: order.orderNumber,
      },
    });

    await client.query(
      'UPDATE shop_orders SET stripe_session_id = $2, updated_at = NOW() WHERE id = $1',
      [order.id, paymentIntent.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientSecret: paymentIntent.client_secret,
        sessionId: paymentIntent.id,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message || 'Unable to create checkout session',
    });
  } finally {
    client.release();
  }
};

exports.verifyCheckoutSession = async (req, res) => {
  try {
    const { session_id: sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }

    let orderId;
    let paymentStatus;
    let order;

    if (sessionId.startsWith('pi_')) {
      const paymentIntent = await retrievePaymentIntent(sessionId);
      orderId = Number(paymentIntent.metadata?.shop_order_id);
      paymentStatus = paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status;

      if (!orderId) {
        return res.status(404).json({ success: false, message: 'Order not found for this payment' });
      }

      order = await ShopOrder.findByStripeSessionId(sessionId);

      if (paymentIntent.status === 'succeeded' && order?.status === 'pending') {
        order = await fulfillPaidOrder(orderId);
      } else if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing' && order?.status === 'pending') {
        await ShopOrder.markFailed(orderId, 'cancelled');
        order = await ShopOrder.findById(orderId);
      }
    } else {
      const session = await retrieveCheckoutSession(sessionId);
      orderId = Number(session.metadata?.shop_order_id);
      paymentStatus = session.payment_status;

      if (!orderId) {
        return res.status(404).json({ success: false, message: 'Order not found for this session' });
      }

      order = await ShopOrder.findByStripeSessionId(sessionId);

      if (session.payment_status === 'paid' && order?.status === 'pending') {
        order = await fulfillPaidOrder(orderId);
      } else if (session.payment_status !== 'paid' && order?.status === 'pending') {
        await ShopOrder.markFailed(orderId, 'cancelled');
        order = await ShopOrder.findById(orderId);
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      data: {
        order,
        paymentStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to verify payment' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.findAll();
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAdminOrderById = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const existing = await ShopOrder.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = await ShopOrder.updateStatus(id, status);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Unable to update order' });
  }
};

exports.validateCart = async (req, res) => {
  const client = await pool.connect();
  try {
    const cartItems = normalizeCartItems(req.body.items);
    await client.query('BEGIN');
    const validated = await buildValidatedLineItems(client, cartItems);
    await client.query('ROLLBACK');

    res.json({
      success: true,
      data: {
        items: validated.orderItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        subtotal: validated.subtotal,
        total: validated.total,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: error.message || 'Cart validation failed' });
  } finally {
    client.release();
  }
};

exports.fulfillPaidOrder = fulfillPaidOrder;
