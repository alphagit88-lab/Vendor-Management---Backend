const CustomerGroup = require('../models/CustomerGroup');
const Customer = require('../models/Customer');
const { getAdminId } = require('../utils/adminHelper');

exports.getGroups = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const groups = await CustomerGroup.findAll(adminId);
    res.json({ success: true, data: groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }
    const adminId = await getAdminId(req);
    const newGroup = await CustomerGroup.create({ name, description, admin_id: adminId });
    res.status(201).json({ success: true, data: newGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const group = await CustomerGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (adminId && group.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { name, description } = req.body;
    const updatedGroup = await CustomerGroup.update(id, { name, description });
    res.json({ success: true, data: updatedGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const group = await CustomerGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (adminId && group.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await CustomerGroup.delete(id);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.assignCustomerToGroup = async (req, res) => {
  try {
    const { customer_id, group_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }
    const adminId = await getAdminId(req);

    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    if (adminId && customer.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (group_id) {
      const group = await CustomerGroup.findById(group_id);
      if (!group) {
        return res.status(404).json({ success: false, message: 'Group not found' });
      }
      if (adminId && group.admin_id !== adminId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const updatedCustomer = await CustomerGroup.assignCustomer(customer_id, group_id || null);
    res.json({ success: true, data: updatedCustomer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
