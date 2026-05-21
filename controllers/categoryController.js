const Category = require('../models/Category');
const { getAdminId } = require('../utils/adminHelper');

exports.getCategories = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const categories = await Category.findAll(adminId);
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
    const adminId = await getAdminId(req);
    const category = await Category.create({ name, description, admin_id: adminId });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (adminId && category.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

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
    const adminId = await getAdminId(req);

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (adminId && category.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Category.delete(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
