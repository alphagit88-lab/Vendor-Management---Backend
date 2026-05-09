const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, orderController.getOrders);
router.get('/:id', authenticate, orderController.getOrder);
router.post('/', authenticate, orderController.createOrder);
router.post('/:id/checklist', authenticate, orderController.getOrderChecklist);
router.put('/:id/status', authenticate, verifyAdmin, orderController.updateStatus);
router.delete('/:id', authenticate, verifyAdmin, orderController.deleteOrder);

module.exports = router;
