const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, settingController.getSettings);
router.post('/', authenticate, verifyAdmin, settingController.updateSettings);

module.exports = router;
