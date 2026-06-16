const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Draws the actual content onto a PDF document.
 * This is separated so we can call it twice: once to measure, once to save.
 */
const drawBillContent = (doc, data) => {
  const { order, customer, items, salesperson, shop, isChecklist, paymentType, checkNumber, clientTimestamp } = data;

  doc.moveDown(2);

  // --- CHECKLIST HEADER (IF APPLICABLE) ---
  if (isChecklist) {

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('***********************************', { align: 'center' });
    doc.text('*****   NOT AN INVOICE   *****', { align: 'center' });
    doc.text('*** BILL OF LADING ONLY ***', { align: 'center' });
    doc.fontSize(8).text('***********************************', { align: 'center' });
    doc.moveDown(1);
  }

  // --- HEADER ---
  doc.fillColor('#000000');
  doc.fontSize(10).text(shop.company_name || '', { align: 'center', weight: 'bold' });
  doc.fontSize(7).text(shop.company_address || '', { align: 'center' });
  doc.text(`Phone: ${shop.company_phone || ''}`, { align: 'center' });
  doc.moveDown(0.3);

  let dateText = '';
  if (clientTimestamp) {
    dateText = clientTimestamp;
    if (clientTimestamp.includes('T') && clientTimestamp.includes('Z')) {
      dateText = new Date(clientTimestamp).toLocaleString();
    }
  } else {
    dateText = new Date(order.created_at).toLocaleString();
  }
  doc.text(dateText, { align: 'center' });
  doc.moveDown(1);

  // --- TOP SECTION (SPLIT LEFT/RIGHT) ---
  const topY = doc.y;

  // LEFT SIDE: Order Details (Moved from bottom)
  doc.fontSize(7);
  doc.text(`Invoice#: ${order.order_number}`, 10, topY, { weight: 'bold' });
  if (order.load_number && order.load_number.toString().trim().toUpperCase() !== 'POS') {
    doc.text(`Load: ${order.load_number}`);
  }
  doc.text(`Salesrep: ${salesperson.name || 'N/A'}`);

  const pType = paymentType || order.payment_type || 'N/A';
  const cNum = checkNumber || order.check_number ? ` (#${checkNumber || order.check_number})` : '';
  doc.text(`Payment: ${pType}${cNum}`);

  // RIGHT SIDE: Customer Details (Aligned to right)
  const rightAlignX = 110;
  const rightWidth = 84;
  doc.text(`Account: ${customer.account_id || 'N/A'}`, rightAlignX, topY, { align: 'right', width: rightWidth });
  doc.fontSize(8).font('Helvetica-Bold').text(customer.name, rightAlignX, doc.y, { align: 'right', width: rightWidth });
  doc.fontSize(6).font('Helvetica').text(customer.address && customer.address !== 'Address not available' ? customer.address : '', rightAlignX, doc.y, { align: 'right', width: rightWidth });
  if (customer.phone) {
    doc.text(customer.phone, rightAlignX, doc.y, { align: 'right', width: rightWidth });
  }

  doc.moveDown(0.5);

  if (customer.tobacco_permit_number) {
    doc.fontSize(7).text(`TABC Permit #: ${customer.tobacco_permit_number}`, 10);
  }
  doc.moveDown(1.5);

  // --- ITEMS TABLE HEADER ---
  const tableTop = doc.y;
  doc.fontSize(6.5).font('Helvetica-Bold');
  doc.text('ITEM#', 10, tableTop);
  doc.text('QTY', 39, tableTop);
  doc.text('DESCRIPTION', 59, tableTop);
  doc.text('AMOUNT', 160, tableTop, { align: 'right', width: 34 });
  doc.fontSize(5.5).font('Helvetica');

  doc.strokeColor('#000000');
  doc.moveTo(10, tableTop + 10).lineTo(194, tableTop + 10).stroke();
  doc.moveDown(1.5);

  // --- ITEMS ---
  items.forEach(item => {
    const startY = doc.y;
    doc.fontSize(6.2);
    doc.text(item.item_number || 'N/A', 10, startY);
    doc.text(item.quantity.toString(), 39, startY);

    // Description can span multiple lines
    doc.text(item.item_name || item.description_name, 59, startY, { width: 108 });

    const lineTotal = `$${parseFloat(item.subtotal).toFixed(2)}`;
    doc.text(lineTotal, 160, startY, { align: 'right', width: 34 });

    doc.moveDown(0.3);
  });

  doc.moveDown(1);
  doc.moveTo(10, doc.y).lineTo(194, doc.y).stroke();
  doc.moveDown(0.5);

  // --- TOTALS ---
  const totalsX = 105;
  doc.fontSize(7);

  const returnDeduction = parseFloat(data.returnAmount || 0);
  const finalTotal = parseFloat(order.total_amount || 0);
  const grossTotal = finalTotal + returnDeduction;

  let currentY = doc.y;
  doc.text('Total Sales:', totalsX, currentY);
  doc.text(`$${grossTotal.toFixed(2)}`, 160, currentY, { align: 'right', width: 34 });
  doc.moveDown(0.2);

  currentY = doc.y;
  doc.text('Total Credits:', totalsX, currentY);
  doc.text(`$${parseFloat(order.total_credits || 0).toFixed(2)}`, 160, currentY, { align: 'right', width: 34 });
  doc.moveDown(0.2);

  currentY = doc.y;
  doc.text('Total Deposit:', totalsX, currentY);
  doc.text(`$${parseFloat(order.total_deposit || 0).toFixed(2)}`, 160, currentY, { align: 'right', width: 34 });
  doc.moveDown(0.4);

  currentY = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).text(returnDeduction > 0 ? 'Subtotal:' : 'Invoice Total:', totalsX, currentY);
  doc.text(`$${grossTotal.toFixed(2)}`, 160, currentY, { align: 'right', width: 34 });
  doc.font('Helvetica');

  // --- RETURNS ---
  if (data.returns && data.returns.length > 0) {
    doc.moveDown(1.5);
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('RETURNS SUMMARY:', 10, doc.y);
    doc.moveDown(0.5);

    const returnTableTop = doc.y;
    doc.fontSize(6).font('Helvetica-Bold');
    doc.text('ITEM#', 10, returnTableTop);
    doc.text('QTY', 50, returnTableTop);
    doc.text('REASON', 80, returnTableTop);
    doc.strokeColor('#000000').moveTo(10, returnTableTop + 8).lineTo(194, returnTableTop + 8).stroke();
    doc.moveDown(1);

    doc.fontSize(6).font('Helvetica');
    data.returns.forEach(ret => {
      const startY = doc.y;
      doc.text(ret.item_id.toString(), 10, startY);
      doc.text(ret.quantity.toString(), 50, startY);
      doc.text(ret.reason || 'N/A', 80, startY, { width: 114 });
      doc.moveDown(0.3);
    });

    if (returnDeduction > 0) {
      doc.moveDown(0.5);

      // Divider before Return Deduction
      doc.moveTo(10, doc.y).lineTo(194, doc.y).stroke();
      doc.moveDown(0.5);

      let rDeductY = doc.y;
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('Return Deduction:', totalsX, rDeductY);
      // Move amount down by 3px to align with label
      doc.text(`-$${returnDeduction.toFixed(2)}`, 160, rDeductY, { align: 'right', width: 34 });

      doc.moveDown(0.5);

      let fTotalY = doc.y;
      doc.font('Helvetica-Bold').fontSize(8.5).text('Invoice Total:', totalsX, fTotalY);
      doc.text(`$${finalTotal.toFixed(2)}`, 160, fTotalY, { align: 'right', width: 34 });
      doc.font('Helvetica');
    }
  }

  doc.moveDown(1);

  // --- FOOTER / LEGAL ---
  if (!isChecklist) {
    doc.fontSize(5.5);
    const legalText = "THIS IS AN OFFER. BY SIGNING THIS OFFER, YOU AGREE THAT YOU WILL REFRAIN FROM SELLING THE PRODUCTS CONVEYED TO YOU BY THIS OFFER TO OTHER RETAILERS FOR RESALE...";
    doc.text(legalText, 10, doc.y, { align: 'justify', width: 184 });
    doc.moveDown(2);
  }

  // --- SIGNATURES ---
  const sigY = doc.y;
  doc.fontSize(7);

  // 1. Customer Signature
  doc.text('Customer Signature:', 10, sigY);
  doc.strokeColor('#000000').moveTo(10, sigY + 40).lineTo(90, sigY + 40).stroke();

  if (data.customerSignature) {
    try {
      const customerSigBuffer = Buffer.from(data.customerSignature.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      // Position slightly above the line
      doc.image(customerSigBuffer, 10, sigY + 10, { width: 80, height: 30 });
    } catch (e) {
      console.error('Error rendering customer signature:', e);
    }
  }

  // 2. Driver Signature
  doc.text('Driver Signature:', 110, sigY);
  doc.strokeColor('#000000').moveTo(110, sigY + 40).lineTo(190, sigY + 40).stroke();

  if (data.driverSignature) {
    try {
      const driverSigBuffer = Buffer.from(data.driverSignature.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      // Position slightly above the line
      doc.image(driverSigBuffer, 110, sigY + 10, { width: 80, height: 30 });
    } catch (e) {
      console.error('Error rendering driver signature:', e);
    }
  }

  doc.moveDown(6); // Space for signatures

  if (shop.site_name) {
    doc.fontSize(8).text(shop.site_name, 10, doc.y, { align: 'center', width: 184 });
  }

  // Return the final Y position
  return doc.y;
};

/**
 * Generates a thermal-style bill PDF with PERFECT auto-height.
 */
const generateBill = async (data) => {
  const { order } = data;

  const billsDir = path.join(__dirname, '..', 'uploads', 'bills');
  if (!fs.existsSync(billsDir)) fs.mkdirSync(billsDir, { recursive: true });

  const fileName = `bill_${order.order_number}.pdf`;
  const filePath = path.join(billsDir, fileName);
  const pageWidth = 204;

  // --- PASS 1: Measure exact content height ---
  // We use a dummy document with a huge height to prevent pagination
  const dummyDoc = new PDFDocument({
    size: [pageWidth, 5000],
    margins: { top: 10, bottom: 10, left: 10, right: 10 }
  });
  const finalY = drawBillContent(dummyDoc, data);
  const perfectHeight = Math.ceil(finalY + 15); // Add a tiny 15px buffer for the cut

  console.log(`[PDF] Generated ${fileName} with Height: ${perfectHeight}pt`);

  // --- PASS 2: Generate the real PDF with the exact height ---
  const doc = new PDFDocument({
    size: [pageWidth, perfectHeight],
    margins: { top: 10, bottom: 10, left: 10, right: 10 }
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  drawBillContent(doc, data);
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(fileName));
    stream.on('error', reject);
  });
};

module.exports = { generateBill };
