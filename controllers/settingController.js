const Setting = require('../models/Setting');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await Setting.update(key, value);
    }
    const updatedSettings = await Setting.getAll();
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
