import { find, findOne, insert, update, cors } from './mongo.js';

const stamp = () => new Date().toISOString();

function awbPrefix(transporter) {
  return String(transporter?.transporter_code || transporter?.code || transporter?.transporter_name || transporter?.name || 'AWB')
    .replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'AWB';
}

async function nextAwb(transporter) {
  const prefix = awbPrefix(transporter);
  const existing = new Set((await find('fulfillment_orders')).map((row) => row.awb).filter(Boolean));
  let candidate = '';
  do {
    candidate = `${prefix}${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 100)}`;
  } while (existing.has(candidate));
  return candidate;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { status, warehouse } = req.query;
      const q = {};
      if (status) q.status = status;
      if (warehouse) q.warehouse = warehouse;
      return res.status(200).json(await find('fulfillment_orders', q, { sort: { id: 1 } }));
    }
    if (req.method === 'PUT') {
      const { ids, id, action, ...fields } = req.body;
      const targetIds = ids || (id != null ? [id] : []);
      if (targetIds.length === 0) return res.status(400).json({ error: 'No ids provided' });
      if (action === 'generate-shipping-label') {
        const courier = String(req.body.courier || '').trim();
        if (!courier) return res.status(400).json({ error: 'Courier Partner is required.' });
        const transporter = (await find('partners', { type: 'Transporter' })).find((row) => (row.transporter_name || row.name) === courier && row.is_active !== false && row.status !== 'Inactive');
        if (!transporter) return res.status(400).json({ error: 'Select an active Courier Partner.' });
        const selected = (await find('fulfillment_orders')).filter((row) => targetIds.includes(row.id));
        if (selected.length !== targetIds.length) return res.status(404).json({ error: 'One or more selected orders no longer exist.' });
        if (selected.some((row) => row.status !== 'Packed')) return res.status(409).json({ error: 'Only Packed orders can be assigned a courier and shipping label.' });
        const results = [];
        for (const row of selected) {
          const awb = await nextAwb(transporter);
          const fields = { status: 'Ready to Ship', courier, awb, shipping_label_status: 'Generated', shipping_label_generated_at: stamp() };
          const [saved] = await update('fulfillment_orders', row.id, fields);
          await insert('delivery_shipping_audit', { order_id: row.id, order_no: row.order_no, action: 'shipping-label-generated', from_status: row.status, to_status: 'Ready to Ship', courier, awb, created_at: stamp() });
          results.push(saved);
        }
        return res.status(200).json({ action, message: `Shipping label generated for ${results.length} order(s).`, rows: results });
      }
      if (action === 'allocate' || action === 'unallocate') {
        const targetRows = await find('fulfillment_orders');
        const selected = targetRows.filter((row) => targetIds.includes(row.id));
        const eligible = action === 'allocate' ? ['Confirmed', 'Part Allocated', 'Pending'] : ['Allocated', 'Part Allocated'];
        if (selected.some((row) => !eligible.includes(row.status))) return res.status(409).json({ error: `Only eligible orders can be ${action === 'allocate' ? 'allocated' : 'unallocated'}.` });
        for (const row of selected) {
          const stock = await findOne('inventory', { sku_code: row.sku_code, warehouse: row.warehouse });
          const qty = Number(row.qty || row.order_qty || 0);
          if (action === 'allocate' && (!stock || Number(stock.available || 0) < qty)) return res.status(409).json({ error: `Insufficient inventory for ${row.order_no}.` });
          if (stock) await update('inventory', stock.id, action === 'allocate' ? { available: Number(stock.available) - qty, reserved: Number(stock.reserved || 0) + qty } : { available: Number(stock.available) + qty, reserved: Math.max(0, Number(stock.reserved || 0) - qty) });
          await update('fulfillment_orders', row.id, action === 'allocate' ? { status: 'Allocated', allocated_qty: qty, allocation_status: 'Allocated' } : { status: 'Confirmed', allocated_qty: 0, allocation_status: 'Unallocated' });
          await insert('fulfillment_audit', { order_id: row.id, order_no: row.order_no, action, quantity: qty, from_status: row.status, to_status: action === 'allocate' ? 'Allocated' : 'Confirmed', created_at: new Date().toISOString() });
        }
        return res.status(200).json({ ids: targetIds, action, message: `${selected.length} order(s) ${action === 'allocate' ? 'allocated' : 'unallocated'} successfully.` });
      }
      return res.status(200).json(await update('fulfillment_orders', targetIds, fields));
    }
    if (req.method === 'POST') {
      return res.status(201).json(await insert('fulfillment_orders', req.body));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
