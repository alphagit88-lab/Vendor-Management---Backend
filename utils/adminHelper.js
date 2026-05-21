const User = require('../models/User');

const getAdminId = async (req) => {
  if (!req.user) return null;
  if (req.user.role === 'admin') {
    return req.user.id;
  }
  if (req.user.role === 'staff') {
    if (req.user.admin_id !== undefined && req.user.admin_id !== null) {
      return req.user.admin_id;
    }
    // Fallback: database lookup for safety
    const u = await User.findById(req.user.id);
    return u?.admin_id || null;
  }
  return null; // super_admin has null (global scope)
};

module.exports = { getAdminId };
