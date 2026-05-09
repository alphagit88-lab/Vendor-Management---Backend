const Inventory = require('../models/Inventory');

exports.getInventory = async (req, res) => {
  try {
    const { customer_id } = req.query;
    const inventory = await Inventory.findAll(customer_id);
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
    const salesperson_id = req.user.role === 'admin' ? null : req.user.id;
    const logs = await Inventory.getLogs(item_id, salesperson_id);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
