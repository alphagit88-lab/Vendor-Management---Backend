const express = require('express');
const router = express.Router();
const hardwareProductController = require('../controllers/hardwareProductController');
const { authenticate, verifyRole } = require('../middleware/authMiddleware');
const hardwareProductUpload = require('../utils/hardwareProductUpload');

router.get('/public', hardwareProductController.getPublicProducts);
router.get('/public/:slug', hardwareProductController.getPublicProductBySlug);

router.get('/', authenticate, verifyRole(['super_admin']), hardwareProductController.getAdminProducts);
router.post(
  '/upload',
  authenticate,
  verifyRole(['super_admin']),
  hardwareProductUpload.array('images', 10),
  hardwareProductController.uploadImages
);
router.post('/', authenticate, verifyRole(['super_admin']), hardwareProductController.createProduct);
router.put('/:id', authenticate, verifyRole(['super_admin']), hardwareProductController.updateProduct);
router.delete('/:id', authenticate, verifyRole(['super_admin']), hardwareProductController.deleteProduct);

module.exports = router;
