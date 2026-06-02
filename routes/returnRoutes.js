const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, returnController.getReturns);
router.get('/:id', authenticate, returnController.getReturn);
router.post('/', authenticate, returnController.createReturns);
router.delete('/:id', authenticate, verifyAdmin, returnController.deleteReturn);

module.exports = router;
