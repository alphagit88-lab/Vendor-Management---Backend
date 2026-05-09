const User = require('../models/User');
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

    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or you are not a staff member' });
    }

    const isMatch = await User.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
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
        role: user.role
      }
    });

  } catch (error) {
    console.error('🔴 LOGIN ERROR:', error.message, error.code, error.detail);
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message });
  }
};
