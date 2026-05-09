const Order = require('../models/Order');
const Setting = require('../models/Setting');

exports.getOrders = async (req, res) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const orders = await Order.findAll(userId, month, year);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 FETCHING ORDER DETAIL: ${id}`);
    const order = await Order.findById(id);
    if (!order) {
      console.warn(`⚠️ ORDER NOT FOUND: ${id}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    console.log(`✅ ORDER RETRIEVED: ${id}`);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('🔴 GET ORDER ERROR details:', {
      message: error.message,
      stack: error.stack,
      id: req.params.id
    });
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message, stack: error.stack });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { 
      customerId, 
      customer_id, 
      user_id, 
      items, 
      notes, 
      load_number, 
      total_credits, 
      total_deposit,
      customerSignature,
      driverSignature,
      payment_type,
      check_number,
      is_checklist,
      clientTimestamp,
      client_timestamp
    } = req.body;
    
    // Simple order number generation (e.g., ORD-timestamp)
    const order_number = `ORD-${Date.now().toString().slice(-8)}`;

    const total_amount = items.reduce((acc, item) => acc + parseFloat(item.subtotal || 0), 0);

    const newOrder = await Order.create({
      order_number,
      customer_id: customer_id || customerId,
      user_id: user_id || req.user.id,
      total_amount,
      total_credits: total_credits || 0,
      total_deposit: total_deposit || 0,
      status: 'pending',
      notes,
      load_number,
      payment_type, // Capture payment type
      check_number,  // Capture check number
      is_checklist,  // Capture if it was generated as checklist
      client_timestamp: clientTimestamp || client_timestamp,
      items
    });

    // --- Generate Bill PDF ---
    let billUrl = null;
    try {
      const { generateBill } = require('../utils/billGenerator');
      
      // Fetch full order with customer details for the bill
      const fullOrder = await Order.findById(newOrder.id);
      const settings = await Setting.getAll();
      
      const fileName = await generateBill({
        order: fullOrder,
        customer: {
          name: fullOrder.customer_name,
          address: fullOrder.customer_address || 'Address not available',
          phone: fullOrder.customer_phone || '',
          account_id: fullOrder.account_id,
          tobacco_permit_number: fullOrder.tobacco_permit_number
        },
        items: fullOrder.items,
        salesperson: { name: fullOrder.user_name },
        shop: settings || {},
        customerSignature,
        driverSignature,
        paymentType: payment_type,
        checkNumber: check_number,
        clientTimestamp: clientTimestamp || client_timestamp
      });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      billUrl = `${baseUrl}/uploads/bills/${fileName}`;
      console.log(`📄 BILL GENERATED: ${billUrl}`);
    } catch (billError) {
      console.error('⚠️ Bill Generation failed:', billError.message);
    }

    res.status(201).json({ 
      success: true, 
      data: newOrder,
      bill: billUrl ? {
        url: billUrl,
        file_name: `bill_${order_number}.pdf`
      } : null,
      bill_generation_error: billUrl ? null : 'Failed to generate receipt'
    });
  } catch (error) {
    console.error('🔴 CREATE ORDER ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      detail: error.message,
      stack: error.stack 
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedOrder = await Order.updateStatus(id, status);
    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getOrderChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { generateBill } = require('../utils/billGenerator');
    const { customerSignature, driverSignature, clientTimestamp, client_timestamp } = req.body || {};
    const settings = await Setting.getAll();
    
    const fileName = await generateBill({
      order: order,
      customer: {
        name: order.customer_name,
        address: order.customer_address || 'Address not available',
        phone: order.customer_phone || '',
        account_id: order.account_id,
        tobacco_permit_number: order.tobacco_permit_number
      },
      items: order.items,
      salesperson: { name: order.user_name },
      shop: settings || {},
      customerSignature: customerSignature || order.customer_signature,
      driverSignature: driverSignature || order.driver_signature,
      isChecklist: true, // SET CHECKLIST MODE
      clientTimestamp: clientTimestamp || client_timestamp
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/bills/${fileName}`;
    
    res.json({ success: true, data: { url, file_name: fileName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Order.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
