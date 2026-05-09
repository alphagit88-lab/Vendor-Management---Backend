const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, verifyAdmin, userController.getUsers);
router.post('/', authenticate, verifyAdmin, userController.createUser);
router.put('/:id', authenticate, verifyAdmin, userController.updateUser);
router.delete('/:id', authenticate, verifyAdmin, userController.deleteUser);

module.exports = router;
