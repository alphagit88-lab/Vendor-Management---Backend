const Setting = require('../models/Setting');
const { getAdminId } = require('../utils/adminHelper');

exports.getSettings = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const settings = await Setting.getAll(adminId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await Setting.update(key, value, adminId);
    }
    const updatedSettings = await Setting.getAll(adminId);
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
