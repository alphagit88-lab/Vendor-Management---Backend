const Item = require('../models/Item');
const Category = require('../models/Category');
const CustomerGroup = require('../models/CustomerGroup');
const Customer = require('../models/Customer');
const { getAdminId } = require('../utils/adminHelper');

exports.getItems = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const items = await Item.findAll(adminId);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id, group_prices } = req.body;
    
    if (!description_name || !price) {
      return res.status(400).json({ success: false, message: 'Description name and price are required' });
    }

    const adminId = await getAdminId(req);

    if (category_id) {
      const category = await Category.findById(category_id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      if (adminId && category.admin_id !== adminId) {
        return res.status(403).json({ success: false, message: 'Access denied to category' });
      }
    }

    const newItem = await Item.create({
      description_name,
      price,
      description: description || null,
      item_number,
      upc: upc || null,
      cost: cost || 0,
      quantity_size,
      vendor_cost: vendor_cost || 0,
      category_id: category_id || null,
      admin_id: adminId
    });

    // Handle group prices if provided
    if (group_prices && Array.isArray(group_prices)) {
      for (const gp of group_prices) {
        if (gp.group_id && gp.price) {
          const group = await CustomerGroup.findById(gp.group_id);
          if (group && (!adminId || group.admin_id === adminId)) {
            await Item.setGroupPrice(newItem.id, gp.group_id, gp.price);
          }
        }
      }
    }

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id } = req.body;

    if (category_id) {
      const category = await Category.findById(category_id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      if (adminId && category.admin_id !== adminId) {
        return res.status(403).json({ success: false, message: 'Access denied to category' });
      }
    }

    const updatedItem = await Item.update(id, { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id });
    res.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Item.delete(id);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCustomerPrices = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const prices = await Item.getCustomerPrices(id);
    res.json({ success: true, data: prices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateCustomerPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, price } = req.body;
    const adminId = await getAdminId(req);

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    if (adminId && customer.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied to customer' });
    }
    
    if (price === null || price === undefined) {
      await Item.deleteCustomerPrice(id, customer_id);
      return res.json({ success: true, message: 'Customer price removed' });
    }

    const updated = await Item.setCustomerPrice(id, customer_id, price);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getGroupPrices = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const prices = await Item.getGroupPrices(id);
    res.json({ success: true, data: prices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateGroupPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { group_id, price } = req.body;
    const adminId = await getAdminId(req);

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (adminId && item.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const group = await CustomerGroup.findById(group_id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (adminId && group.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied to group' });
    }
    
    if (price === null || price === undefined) {
      await Item.deleteGroupPrice(id, group_id);
      return res.json({ success: true, message: 'Group price removed' });
    }

    const updated = await Item.setGroupPrice(id, group_id, price);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
