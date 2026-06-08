const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

// Existing routes
router.get('/sales', authenticate, verifyAdmin, reportController.getSalesSummary);
router.get('/top-customers', authenticate, verifyAdmin, reportController.getTopCustomers);
router.get('/inventory-alerts', authenticate, verifyAdmin, reportController.getInventoryAlerts);
router.get('/combined', authenticate, verifyAdmin, reportController.getCombinedReport);

// New report routes
router.get('/item-sale', authenticate, verifyAdmin, reportController.getItemSaleReport);
router.get('/monthly-customers', authenticate, verifyAdmin, reportController.getMonthlySalesByCustomer);
router.get('/monthly-salespeople', authenticate, verifyAdmin, reportController.getMonthlySalesBySalesperson);
router.get('/time-period', authenticate, verifyAdmin, reportController.getSalesByTimePeriod);
router.get('/top-items', authenticate, verifyAdmin, reportController.getTopSellingItems);
router.get('/top-salespeople', authenticate, verifyAdmin, reportController.getTopSalespeople);

module.exports = router;
