const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, verifyAdmin, itemController.getItems);
router.post('/', authenticate, verifyAdmin, itemController.createItem);
router.put('/:id', authenticate, verifyAdmin, itemController.updateItem);
router.delete('/:id', authenticate, verifyAdmin, itemController.deleteItem);
router.get('/:id/customer-prices', authenticate, verifyAdmin, itemController.getCustomerPrices);
router.post('/:id/customer-prices', authenticate, verifyAdmin, itemController.updateCustomerPrice);
router.get('/:id/group-prices', authenticate, verifyAdmin, itemController.getGroupPrices);
router.post('/:id/group-prices', authenticate, verifyAdmin, itemController.updateGroupPrice);

module.exports = router;
