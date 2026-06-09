const express = require('express');
const router = express.Router();
const subscriptionPurchaseController = require('../controllers/subscriptionPurchaseController');
const { authenticate, verifyRole } = require('../middleware/authMiddleware');

router.get(
  '/admin',
  authenticate,
  verifyRole(['super_admin']),
  subscriptionPurchaseController.getAdminPurchases
);
router.get(
  '/admin/:id',
  authenticate,
  verifyRole(['super_admin']),
  subscriptionPurchaseController.getAdminPurchaseById
);

router.get('/status', authenticate, subscriptionPurchaseController.getSubscriptionStatus);
router.post('/checkout', authenticate, subscriptionPurchaseController.requestPlanChange);
router.get('/verify', authenticate, subscriptionPurchaseController.verifyCheckoutSession);

module.exports = router;
