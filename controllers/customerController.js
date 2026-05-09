const Customer = require('../models/Customer');

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll();
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
      group_id
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
    const { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id } = req.body;
    const updatedCustomer = await Customer.update(id, { address, phone, account_id, permit_numbers, registered_company_name, dba, email, sales_tax_id, has_cigarette_permit, tobacco_permit_number, tobacco_expire_date, payment_type, latitude, longitude, group_id });
    if (!updatedCustomer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
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
    const deleted = await Customer.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
