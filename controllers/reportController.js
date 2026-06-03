const Report = require('../models/Report');
const { getAdminId } = require('../utils/adminHelper');

exports.getSalesSummary = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const summary = await Report.getSalesSummary(adminId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const top = await Report.getTopCustomers(adminId);
    res.json({ success: true, data: top });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getInventoryAlerts = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const alerts = await Report.getInventoryStatus(adminId);
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getCombinedReport = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { customerName, startDate, endDate } = req.query;

    const data = await Report.getCombinedReport(
      adminId,
      customerName || null,
      startDate || null,
      endDate || null
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
