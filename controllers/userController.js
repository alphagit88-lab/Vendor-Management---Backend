const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    let filteredUsers = users.filter(u => u.role !== 'super_admin');
    
    // If standard admin, only show salespeople (staff) assigned to this admin
    if (req.user.role === 'admin') {
      filteredUsers = filteredUsers.filter(u => u.role === 'staff' && u.admin_id === req.user.id);
    }
    
    res.json({ success: true, data: filteredUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    console.log('--- createUser called ---');
    console.log('req.body:', req.body);
    const { name, phone, username, email, password, role, inventory_location, admin_id } = req.body;
    
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied: cannot create super admin' });
    }

    if (phone) {
        const existingUser = await User.findByPhone(phone);
        if (existingUser) {
          return res.status(400).json({ success: false, message: 'Phone already registered' });
        }
    }

    if (email) {
        const existingByEmail = await User.findByEmail(email);
        if (existingByEmail) {
          return res.status(400).json({ success: false, message: 'Email already registered' });
        }
    }

    const finalRole = role || 'staff';
    const finalUsername = finalRole === 'admin' ? null : username;

    if (finalUsername) {
        const existingByUsername = await User.findByUsername(finalUsername);
        if (existingByUsername) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }
    }

    // Determine parent admin_id based on role and creator
    let targetAdminId = null;
    if (req.user.role === 'admin') {
      // Standard admin can only create their own staff
      targetAdminId = req.user.id;
    } else if (req.user.role === 'super_admin') {
      // Super admin can specify admin_id for staff
      targetAdminId = finalRole === 'staff' ? admin_id : null;
    }

    const newUser = await User.create({
      name,
      phone,
      username: finalUsername,
      email,
      role: finalRole,
      password,
      inventory_location: finalRole === 'admin' ? null : inventory_location,
      admin_id: targetAdminId
    });

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, inventory_location, password, admin_id } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied: cannot modify super admin' });
    }

    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied: cannot assign super admin role' });
    }

    // If standard admin, target user must belong to them
    if (req.user.role === 'admin' && targetUser.admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: cannot modify user' });
    }

    if (email && email !== targetUser.email) {
        const existingByEmail = await User.findByEmail(email);
        if (existingByEmail) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
    }

    const finalRole = role || targetUser.role;
    const finalUsername = finalRole === 'admin' ? null : username;

    if (finalUsername && finalUsername !== targetUser.username) {
        const existingByUsername = await User.findByUsername(finalUsername);
        if (existingByUsername) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }
    }

    if (password) {
        const hashedPassword = await User.hashPassword(password);
        await User.updatePassword(id, hashedPassword);
    }

    // Determine target admin_id based on role and creator
    let targetAdminId = targetUser.admin_id;
    if (req.user.role === 'admin') {
      targetAdminId = req.user.id; // Force own ID
    } else if (req.user.role === 'super_admin') {
      // Allow modifying parent administrator or resetting it
      targetAdminId = finalRole === 'staff' ? admin_id : null;
    }

    const updatedUser = await User.update(id, { 
      name, 
      username: finalUsername, 
      email, 
      role: finalRole, 
      inventory_location: finalRole === 'admin' ? null : inventory_location,
      admin_id: targetAdminId
    });
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied: cannot delete super admin' });
    }

    // If standard admin, target user must belong to them
    if (req.user.role === 'admin' && targetUser.admin_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: cannot delete user' });
    }

    const deleted = await User.delete(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
