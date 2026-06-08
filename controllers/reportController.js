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
    const { startDate, endDate } = req.query;
    const top = await Report.getTopCustomers(adminId, startDate || null, endDate || null);
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
    const { customerName, itemId, startDate, endDate } = req.query;

    const data = await Report.getCombinedReport(
      adminId,
      customerName || null,
      itemId || null,
      startDate || null,
      endDate || null
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// New: Item Sale Report
exports.getItemSaleReport = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { startDate, endDate } = req.query;
    const data = await Report.getItemSaleReport(adminId, startDate || null, endDate || null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// New: Monthly Sales by Customer
exports.getMonthlySalesByCustomer = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { year } = req.query;
    const data = await Report.getMonthlySalesByCustomer(adminId, year ? parseInt(year) : null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// New: Monthly Sales by Salesperson
exports.getMonthlySalesBySalesperson = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { year } = req.query;
    const data = await Report.getMonthlySalesBySalesperson(adminId, year ? parseInt(year) : null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// New: Sales by Time Period
exports.getSalesByTimePeriod = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { startDate, endDate } = req.query;
    const data = await Report.getSalesByTimePeriod(adminId, startDate || null, endDate || null);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// New: Top Selling Items
exports.getTopSellingItems = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { startDate, endDate, limit } = req.query;
    const data = await Report.getTopSellingItems(
      adminId,
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// New: Top Salespeople
exports.getTopSalespeople = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const { startDate, endDate, limit } = req.query;
    const data = await Report.getTopSalespeople(
      adminId,
      startDate || null,
      endDate || null,
      limit ? parseInt(limit) : 10
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
