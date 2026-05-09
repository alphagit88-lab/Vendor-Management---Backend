const express = require('express');
const router = express.Router();
const customerGroupController = require('../controllers/customerGroupController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, customerGroupController.getGroups);
router.post('/', authenticate, verifyAdmin, customerGroupController.createGroup);
router.put('/:id', authenticate, verifyAdmin, customerGroupController.updateGroup);
router.delete('/:id', authenticate, verifyAdmin, customerGroupController.deleteGroup);
router.post('/assign', authenticate, verifyAdmin, customerGroupController.assignCustomerToGroup);

module.exports = router;
