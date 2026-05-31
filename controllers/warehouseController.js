const Warehouse = require('../models/Warehouse');

exports.getWarehouses = async (req, res) => {
  try {
    // Super admin sees all, regular admin only sees their own
    const adminId = req.user.role === 'super_admin' ? null : req.user.id;
    const warehouses = await Warehouse.findAll(adminId);
    res.json({ success: true, data: warehouses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    // Use the logged-in admin's ID (super admin can use null, but let's use their id too)
    const adminId = req.user.id;
    const warehouse = await Warehouse.create({ name, location, admin_id: adminId });
    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const updated = await Warehouse.update(id, { name, location });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    await Warehouse.delete(id);
    res.json({ success: true, message: 'Warehouse deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
