const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const category = await Category.create({ name, description });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const updated = await Category.update(id, { name, description });
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };
  
  exports.deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;
      await Category.delete(id);
      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };
