const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlanController');
const { authenticate, verifyRole } = require('../middleware/authMiddleware');

// Public endpoint to get subscription plans (for registration)
router.get('/public', subscriptionPlanController.getSubscriptionPlans);

// Only super admin can manage subscription plans
router.get('/', authenticate, verifyRole(['super_admin']), subscriptionPlanController.getSubscriptionPlans);
router.post('/', authenticate, verifyRole(['super_admin']), subscriptionPlanController.createSubscriptionPlan);
router.put('/:id', authenticate, verifyRole(['super_admin']), subscriptionPlanController.updateSubscriptionPlan);
router.delete('/:id', authenticate, verifyRole(['super_admin']), subscriptionPlanController.deleteSubscriptionPlan);

module.exports = router;
