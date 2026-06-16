const generateEdiText = (order) => {
  const invoiceNum = (order.order_number || '').replace(/\D/g, '');
  const totalCents = Math.round(parseFloat(order.total_amount || 0) * 100);

  // Header: ATXJASM + 10-char invoice number (space-padded) + 16-char total in cents (zero-padded)
  const header = `ATXJASM${invoiceNum.padStart(10, ' ')}${totalCents.toString().padStart(16, '0')}`;

  const items = Array.isArray(order.items) ? order.items : [];
  const lines = items.map((it) => {
    const itemNum = String(it.item_number || it.item_id || '').padStart(11, '0');
    const desc = (it.item_name || '').substring(0, 25).padEnd(25, ' ');
    const sku = String(it.item_id || '').padStart(6, '0');
    const priceCents = Math.round(parseFloat(it.unit_price || 0) * 100).toString().padStart(6, '0');
    const qty = String(Math.abs(it.quantity || 0)).padStart(6, '0');
    const subtotalCents = Math.round(parseFloat(it.subtotal || 0) * 100).toString().padStart(10, '0');
    return `B${itemNum}${desc}${sku}${priceCents}  ${qty}${subtotalCents}001`;
  });

  return [header, ...lines, ''].join('\r\n');
};

module.exports = { generateEdiText };
