const Customer = require('../models/Customer');
const User = require('../models/User');
const { getAdminId } = require('../utils/adminHelper');

exports.getCustomers = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    let customers = await Customer.findAll(adminId);
    
    // If par levels are disabled for this user, remove par_levels from all customers
    if (req.user.role !== 'super_admin') {
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.enable_par_levels === false) {
        customers = customers.map(customer => {
          const { par_levels, ...customerWithoutParLevels } = customer;
          return customerWithoutParLevels;
        });
      }
    }
    
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id, par_levels } = req.body;
    
    if (!address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    const adminId = await getAdminId(req);

    // Check if trying to set par_levels but enable_par_levels is false (check DB, not just token)
    if (par_levels !== undefined && req.user.role !== 'super_admin') {
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.enable_par_levels === false) {
        return res.status(403).json({ success: false, message: 'Par level management is disabled for this admin' });
      }
    }

    let newCustomer = await Customer.create({
      address,
      phone: phone || null,
      account_id: account_id || null,
      permit_numbers: permit_numbers || null,
      registered_company_name,
      dba,
      email,
      sales_tax_id,
      has_cigarette_permit,
      tobacco_permit_number,
      tobacco_expire_date,
      payment_type,
      latitude,
      longitude,
      group_id,
      admin_id: adminId,
      par_levels
    });
    
    // If par levels are disabled for this user, remove par_levels from the response
    if (req.user.role !== 'super_admin') {
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.enable_par_levels === false) {
        const { par_levels: _, ...customerWithoutParLevels } = newCustomer;
        newCustomer = customerWithoutParLevels;
      }
    }

    res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    if (adminId && customer.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id, par_levels } = req.body;
    
    // Check if trying to update par_levels but enable_par_levels is false (check DB, not just token)
    if (par_levels !== undefined && req.user.role !== 'super_admin') {
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.enable_par_levels === false) {
        return res.status(403).json({ success: false, message: 'Par level management is disabled for this admin' });
      }
    }
    
    let updatedCustomer = await Customer.update(id, { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id, par_levels });
    
    // If par levels are disabled for this user, remove par_levels from the response
    if (req.user.role !== 'super_admin') {
      const currentUser = await User.findById(req.user.id);
      if (currentUser && currentUser.enable_par_levels === false) {
        const { par_levels: _, ...customerWithoutParLevels } = updatedCustomer;
        updatedCustomer = customerWithoutParLevels;
      }
    }
    
    res.json({ success: true, data: updatedCustomer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = await getAdminId(req);

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    if (adminId && customer.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Customer.delete(id);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
