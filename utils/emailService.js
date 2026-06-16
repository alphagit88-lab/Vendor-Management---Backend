const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * SMTP transporter (AWS SES SMTP - STABLE + supports attachments)
 */
const transporter = nodemailer.createTransport({
  host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
  port: 587,
  secure: false,
  auth: {
    user: process.env.AWS_SES_SMTP_USER,
    pass: process.env.AWS_SES_SMTP_PASS,
  },
});

/**
 * Load HTML template
 */
const renderTemplate = (templateName, replacements = {}) => {
  const templatePath = path.join(
    __dirname,
    '..',
    'templates',
    'emails',
    `${templateName}.html`
  );

  let html = fs.readFileSync(templatePath, 'utf8');

  Object.entries(replacements).forEach(([key, value]) => {
    html = html.split(`{{${key}}}`).join(value ?? '');
  });

  return html;
};

/**
 * Send Invoice Email
 */
const sendInvoiceEdiEmail = async ({
  toEmail,
  customerName,
  orderNumber,
  orderDate,
  salespersonName,
  paymentType,
  totalAmount,
  ediContent,
  ediFileName,
  shop = {},
}) => {
  const html = renderTemplate('invoiceEdi', {
    COMPANY_NAME: shop.company_name || 'Our Company',
    COMPANY_ADDRESS: shop.company_address || '',
    COMPANY_PHONE: shop.company_phone || '',
    COMPANY_EMAIL: process.env.AWS_SES_FROM_EMAIL || '',
    CUSTOMER_NAME: customerName || 'Customer',
    ORDER_NUMBER: orderNumber,
    ORDER_DATE: orderDate,
    SALESPERSON_NAME: salespersonName || 'N/A',
    PAYMENT_TYPE: paymentType || 'N/A',
    TOTAL_AMOUNT: parseFloat(totalAmount || 0).toFixed(2),
    EDI_FILE_NAME: ediFileName,
    FRONTEND_URL: process.env.FRONTEND_URL,
  });

  await transporter.sendMail({
    from: `"${shop.company_name || 'SuperVendor'}" <${process.env.AWS_SES_FROM_EMAIL}>`,
    to: `${toEmail}, chathura.itexphere@gmail.com, info@cyberdreams.net`,
    subject: `Invoice #${orderNumber} – EDI File Attached`,
    html,
    attachments: [
      {
        filename: ediFileName,
        content: Buffer.from(ediContent, 'utf8'),
        contentType: 'text/plain',
      },
    ],
  });

  console.log(`📧 Invoice EDI email sent to ${toEmail} for order ${orderNumber}`);
};

module.exports = { sendInvoiceEdiEmail };