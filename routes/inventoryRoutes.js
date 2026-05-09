const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, inventoryController.getInventory);
router.post('/update', authenticate, verifyAdmin, inventoryController.updateStock);
router.get('/logs', authenticate, inventoryController.getLogs);

module.exports = router;
