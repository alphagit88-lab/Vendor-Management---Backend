const Item = require('../models/Item');

exports.getItems = async (req, res) => {
  try {
    const items = await Item.findAll();
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

    const newItem = await Item.create({
      description_name,
      price,
      description: description || null,
      item_number,
      upc: upc || null,
      cost: cost || 0,
      quantity_size,
      vendor_cost: vendor_cost || 0,
      category_id: category_id || null
    });

    // Handle group prices if provided
    if (group_prices && Array.isArray(group_prices)) {
      for (const gp of group_prices) {
        if (gp.group_id && gp.price) {
          await Item.setGroupPrice(newItem.id, gp.group_id, gp.price);
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
    const { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id } = req.body;
    const updatedItem = await Item.update(id, { description_name, price, description, item_number, upc, cost, quantity_size, vendor_cost, category_id });
    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Item.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCustomerPrices = async (req, res) => {
  try {
    const { id } = req.params;
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
