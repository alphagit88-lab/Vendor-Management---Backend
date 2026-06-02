const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

exports.login = async (req, res) => {
  try {
    const { email, username, phone, password } = req.body;
    const identifier = email || username || phone;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide credentials' });
    }

    let user;
    if (email) user = await User.findByEmail(email);
    if (!user && username) user = await User.findByUsername(username);
    if (!user && phone) user = await User.findByPhone(phone);
    if (!user && !email && !username && !phone) return res.status(400).json({ success: false, message: 'Missing login credentials' });

    if (!user || (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'super_admin')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'Your account is not activated yet' });
    }

    const isMatch = await User.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, admin_id: user.admin_id, enable_par_levels: user.enable_par_levels },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        enable_par_levels: user.enable_par_levels
      }
    });

  } catch (error) {
    console.error('🔴 LOGIN ERROR:', error.message, error.code, error.detail);
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, subscription_plan_id } = req.body;

    if (!name || !email || !phone || !password || !subscription_plan_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, phone, password, and subscription plan are required' 
      });
    }

    // Check if phone already exists
    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    // Check if subscription plan exists
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
    }

    // Create new admin user (inactive by default)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      enable_par_levels: true,
      subscription_plan_id,
      is_active: false
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account will be activated soon'
    });

  } catch (error) {
    console.error('🔴 REGISTER ERROR:', error.message, error.code, error.detail);
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message });
  }
};
