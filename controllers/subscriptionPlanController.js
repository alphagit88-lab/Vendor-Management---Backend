const SubscriptionPlan = require('../models/SubscriptionPlan');

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { name, product_limit, sales_person_limit } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const newPlan = await SubscriptionPlan.create({
      name,
      product_limit: product_limit || 0,
      sales_person_limit: sales_person_limit || 0
    });

    res.status(201).json({ success: true, data: newPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, product_limit, sales_person_limit } = req.body;

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    const updatedPlan = await SubscriptionPlan.update(id, { name, product_limit, sales_person_limit });
    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    await SubscriptionPlan.delete(id);
    res.json({ success: true, message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
