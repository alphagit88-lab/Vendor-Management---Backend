const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { authenticate, verifyRole } = require('../middleware/authMiddleware');

router.post('/cart/validate', shopController.validateCart);
router.post('/checkout', shopController.createCheckout);
router.get('/orders/verify', shopController.verifyCheckoutSession);

router.get(
  '/orders',
  authenticate,
  verifyRole(['super_admin']),
  shopController.getAdminOrders
);
router.get(
  '/orders/admin/:id',
  authenticate,
  verifyRole(['super_admin']),
  shopController.getAdminOrderById
);
router.put(
  '/orders/:id/status',
  authenticate,
  verifyRole(['super_admin']),
  shopController.updateOrderStatus
);

router.get('/orders/:id', shopController.getOrderById);

module.exports = router;
