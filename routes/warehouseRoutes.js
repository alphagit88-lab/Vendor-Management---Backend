const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, warehouseController.getWarehouses);
router.post('/', authenticate, verifyAdmin, warehouseController.createWarehouse);
router.put('/:id', authenticate, verifyAdmin, warehouseController.updateWarehouse);
router.delete('/:id', authenticate, verifyAdmin, warehouseController.deleteWarehouse);

module.exports = router;
