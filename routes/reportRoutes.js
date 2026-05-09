const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/sales', authenticate, verifyAdmin, reportController.getSalesSummary);
router.get('/top-customers', authenticate, verifyAdmin, reportController.getTopCustomers);
router.get('/inventory-alerts', authenticate, verifyAdmin, reportController.getInventoryAlerts);

module.exports = router;
