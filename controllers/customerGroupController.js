const CustomerGroup = require('../models/CustomerGroup');

exports.getGroups = async (req, res) => {
  try {
    const groups = await CustomerGroup.findAll();
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
    const newGroup = await CustomerGroup.create({ name, description });
    res.status(201).json({ success: true, data: newGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updatedGroup = await CustomerGroup.update(id, { name, description });
    if (!updatedGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    res.json({ success: true, data: updatedGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CustomerGroup.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
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
    const updatedCustomer = await CustomerGroup.assignCustomer(customer_id, group_id || null);
    res.json({ success: true, data: updatedCustomer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
