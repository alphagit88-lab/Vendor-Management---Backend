const Inventory = require('../models/Inventory');
const Item = require('../models/Item');
const User = require('../models/User');
const { getAdminId } = require('../utils/adminHelper');

exports.getInventory = async (req, res) => {
  try {
    const { customer_id } = req.query;
    const adminId = await getAdminId(req);
    const inventory = await Inventory.findAll(customer_id, adminId);
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { item_id, quantity_changed, type, notes, unit_cost, salesperson_id, source_salesperson_id } = req.body;
    
    if (!item_id || !quantity_changed || !type) {
      return res.status(400).json({ success: false, message: 'Item ID, quantity, and type are required' });
    }

    const adminId = await getAdminId(req);

    // 1. Verify item exists and matches admin scope
    const item = await Item.findById(item_id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied to item' });
    }

    // 2. Verify target salesperson exists and matches admin scope
    if (salesperson_id) {
      const sp = await User.findById(salesperson_id);
      if (!sp) {
        return res.status(404).json({ success: false, message: 'Salesperson not found' });
      }
      if (adminId && sp.admin_id !== adminId) {
        return res.status(403).json({ success: false, message: 'Access denied to salesperson' });
      }
    }

    // 3. Verify source salesperson exists and matches admin scope
    if (source_salesperson_id) {
      const srcSp = await User.findById(source_salesperson_id);
      if (!srcSp) {
        return res.status(404).json({ success: false, message: 'Source salesperson not found' });
      }
      if (adminId && srcSp.admin_id !== adminId) {
        return res.status(403).json({ success: false, message: 'Access denied to source salesperson' });
      }
    }

    const updated = await Inventory.updateStock({
      item_id, 
      quantity: quantity_changed, 
      type, 
      notes: notes || null, 
      user_actor_id: req.user?.id || null, 
      unit_cost: unit_cost || 0, 
      salesperson_id: salesperson_id || null,
      source_salesperson_id: source_salesperson_id || null
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { item_id } = req.query;
    const adminId = await getAdminId(req);
    
    let salesperson_id = null;
    let finalAdminId = null;

    if (req.user.role === 'staff') {
      salesperson_id = req.user.id;
    } else if (req.user.role === 'admin') {
      finalAdminId = adminId;
    }

    // Double check item_id if provided
    if (item_id) {
      const item = await Item.findById(item_id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      if (adminId && item.admin_id !== adminId) {
        return res.status(403).json({ success: false, message: 'Access denied to item' });
      }
    }

    const logs = await Inventory.getLogs(item_id, salesperson_id, finalAdminId);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
