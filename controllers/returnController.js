const Return = require('../models/Return');
const User = require('../models/User');

exports.getReturns = async (req, res) => {
  try {
    let userId = null;
    let adminId = null;

    if (req.user.role === 'staff') {
      userId = req.user.id;
    } else if (req.user.role === 'admin') {
      adminId = req.user.id;
    } else if (req.user.role === 'super_admin') {
      // Super admin can see all returns
    }

    const returns = await Return.findAll(userId, adminId);
    res.json({ success: true, data: returns });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const returnItem = await Return.findById(id);
    
    if (!returnItem) {
      return res.status(404).json({ success: false, message: 'Return not found' });
    }

    res.json({ success: true, data: returnItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createReturns = async (req, res) => {
  try {
    const { returns } = req.body;

    if (!returns || !Array.isArray(returns) || returns.length === 0) {
      return res.status(400).json({ success: false, message: 'No returns provided' });
    }

    // Get current user's admin id
    const currentUser = await User.findById(req.user.id);
    const adminId = currentUser.admin_id || (req.user.role === 'admin' ? req.user.id : null);

    // Prepare returns data
    const returnsWithMeta = returns.map(r => ({
      ...r,
      user_id: req.user.id,
      admin_id: adminId
    }));

    const createdReturns = [];
    for (const r of returnsWithMeta) {
      const created = await Return.create(r);
      createdReturns.push(created);
    }

    res.status(201).json({
      success: true,
      data: createdReturns
    });
  } catch (error) {
    console.error('🔴 CREATE RETURNS ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      detail: error.message 
    });
  }
};

exports.deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;
    await Return.delete(id);
    res.json({ success: true, message: 'Return deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
