const Customer = require('../models/Customer');
const { getAdminId } = require('../utils/adminHelper');

exports.getCustomers = async (req, res) => {
  try {
    const adminId = await getAdminId(req);
    const customers = await Customer.findAll(adminId);
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id } = req.body;
    
    if (!address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    const adminId = await getAdminId(req);

    const newCustomer = await Customer.create({
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
      admin_id: adminId
    });

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

    const { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id } = req.body;
    const updatedCustomer = await Customer.update(id, { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id });
    
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
