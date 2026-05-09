const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, customerController.getCustomers);
router.post('/', authenticate, customerController.createCustomer);
router.put('/:id', authenticate, verifyAdmin, customerController.updateCustomer);
router.delete('/:id', authenticate, verifyAdmin, customerController.deleteCustomer);

module.exports = router;
