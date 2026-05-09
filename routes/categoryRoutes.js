const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, categoryController.getCategories);
router.post('/', authenticate, verifyAdmin, categoryController.createCategory);
router.put('/:id', authenticate, verifyAdmin, categoryController.updateCategory);
router.delete('/:id', authenticate, verifyAdmin, categoryController.deleteCategory);

module.exports = router;
