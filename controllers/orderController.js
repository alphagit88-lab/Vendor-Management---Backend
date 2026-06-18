const Order = require('../models/Order');
const Setting = require('../models/Setting');
const { getAdminId } = require('../utils/adminHelper');
const { generateEdiText } = require('../utils/ediGenerator');
const { sendInvoiceEdiEmail } = require('../utils/emailService');

exports.getOrders = async (req, res) => {
  try {
    const { month, year } = req.query;
    let userId = null;
    let adminId = null;

    if (req.user.role === 'staff') {
      userId = req.user.id;
    } else if (req.user.role === 'admin') {
      adminId = req.user.id;
    }

    const orders = await Order.findAll(userId, month, year, adminId);
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

    if (req.user.role === 'staff' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'admin' && order.user_id !== req.user.id && order.salesperson_admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
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
      client_timestamp,
      returns,
      returnAmount,
      isUpcRequired,
      is_upc_required
    } = req.body;
    
    // Simple order number generation (e.g., ORD-timestamp)
    const order_number = `ORD-${Date.now().toString().slice(-8)}`;

    let total_amount = items.reduce((acc, item) => acc + parseFloat(item.subtotal || 0), 0);
    const parsedReturnAmount = parseFloat(returnAmount) || 0;
    total_amount = total_amount - parsedReturnAmount;

    // Process Returns if any
    let savedReturns = [];
    if (returns && Array.isArray(returns) && returns.length > 0) {
      const ReturnModel = require('../models/Return');
      const returnsToSave = returns.map(r => ({
        ...r,
        user_id: user_id || req.user.id,
        admin_id: req.user.role === 'admin' ? req.user.id : null,
      }));
      try {
        savedReturns = await ReturnModel.createBatch(returnsToSave);
      } catch (err) {
        console.error('⚠️ Failed to save returns:', err.message);
      }
    }

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
      is_upc_required: isUpcRequired || is_upc_required || false,
      items
    });

    // --- Generate Bill PDF ---
    let billUrl = null;
    try {
      const { generateBill } = require('../utils/billGenerator');
      
      // Fetch full order with customer details for the bill
      const fullOrder = await Order.findById(newOrder.id);
      const orderAdminId = await getAdminId(req);
      const settings = await Setting.getAll(orderAdminId);
      
      const Item = require('../models/Item');
      let enhancedReturns = [];
      if (returns && Array.isArray(returns) && returns.length > 0) {
        for (const ret of returns) {
          try {
            const itemId = ret.item_id || ret.itemId;
            const resolvedItem = await Item.findByIdWithCustomerPrice(itemId, customer_id || customerId);
            const retUnitPrice = ret.unit_price !== undefined ? ret.unit_price : ret.unitPrice;
            const unitPrice = (retUnitPrice !== undefined && retUnitPrice !== null)
              ? parseFloat(retUnitPrice)
              : (resolvedItem ? resolvedItem.resolved_price : 0);
            const subtotal = unitPrice * parseFloat(ret.quantity || 0);
            
            enhancedReturns.push({
              item_id: itemId,
              item_number: resolvedItem ? resolvedItem.item_number : itemId,
              item_name: resolvedItem ? resolvedItem.description_name : (ret.description || ''),
              quantity: ret.quantity,
              unit_price: unitPrice,
              subtotal: subtotal,
              amount: subtotal // keeping amount for compatibility if needed
            });
          } catch (err) {
            console.error('⚠️ Failed to fetch return item details:', err.message);
            enhancedReturns.push(ret);
          }
        }
      }

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
        clientTimestamp: clientTimestamp || client_timestamp,
        returns: enhancedReturns,
        returnAmount: parsedReturnAmount
      });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      billUrl = `${baseUrl}/uploads/bills/${fileName}`;
      console.log(`📄 BILL GENERATED: ${billUrl}`);

      // --- Send EDI email to customer (fire-and-forget) ---
      const customerEmail = fullOrder.customer_email;
      if (customerEmail) {
        const ediContent = generateEdiText(fullOrder);
        const ediFileName = `invoice_${order_number}.txt`;
        const orderDate = clientTimestamp || client_timestamp
          ? new Date(clientTimestamp || client_timestamp).toLocaleString()
          : new Date(fullOrder.created_at).toLocaleString();

        sendInvoiceEdiEmail({
          toEmail: customerEmail,
          customerName: fullOrder.customer_name,
          orderNumber: order_number,
          orderDate,
          salespersonName: fullOrder.user_name,
          paymentType: payment_type || 'N/A',
          totalAmount: fullOrder.total_amount,
          ediContent,
          ediFileName,
          shop: settings || {},
        }).catch(emailErr => {
          console.error('⚠️ Invoice EDI email failed:', emailErr.message);
        });
      } else {
        console.warn(`⚠️ No customer email found for order ${order_number}, skipping EDI email.`);
      }
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
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role === 'staff' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'admin' && order.user_id !== req.user.id && order.salesperson_admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedOrder = await Order.updateStatus(id, status);
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

    if (req.user.role === 'staff' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'admin' && order.user_id !== req.user.id && order.salesperson_admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { generateBill } = require('../utils/billGenerator');
    const { customerSignature, driverSignature, clientTimestamp, client_timestamp } = req.body || {};
    const checklistAdminId = await getAdminId(req);
    const settings = await Setting.getAll(checklistAdminId);
    
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
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role === 'staff' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'admin' && order.user_id !== req.user.id && order.salesperson_admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Order.delete(id);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Generate EDI-style TXT file for an order
exports.getOrderTXT = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role === 'staff' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'admin' && order.user_id !== req.user.id && order.salesperson_admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const txt = generateEdiText(order);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${order.order_number}.txt"`);
    res.send(txt);
  } catch (error) {
    console.error('🔴 GET ORDER TXT ERROR:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
