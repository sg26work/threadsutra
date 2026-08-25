import { find, findOne, insert, update, cors } from './mongo.js';

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const split = (value) => String(value || '').split(/[|,]/).map(x => x.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await find('back_orders', {}, { sort: { id: -1 } }));
    if (req.method === 'POST' && req.query.action === 'search') {
      const rows = await find('back_orders'); const q = req.body || {};
      const match = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).toLowerCase());
      const orderTypes = split(q.orderTypes); const tags = split(q.orderTags);
      const filtered = rows.filter(row => match(row.siteLocation, q.siteLocation) && match(row.skuCode, q.skuCode) && match(row.vendorCode, q.vendorCode) && match(row.merchCodes, q.merchCodes) && match(row.brandCode, q.brandCode) && match(row.priorityCode, q.priorityCode) && match(row.channelCode, q.channelCode) && match(row.refNo, q.refVal) && (!orderTypes.length || orderTypes.includes(row.orderType)) && (!tags.length || tags.some(tag => (row.orderTags || []).includes(tag))) && (!q.backOrder || Boolean(row.backOrder)) && (!q.pendingConfirm || Boolean(row.pendingConfirm)));
      const page = Math.max(1, number(q.page) || 1), rowsPerPage = [20,50,100,200].includes(number(q.rows)) ? number(q.rows) : 20;
      return res.status(200).json({ page, total: Math.max(1, Math.ceil(filtered.length / rowsPerPage)), records: filtered.length, rows: filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage) });
    }
    if (req.method === 'POST' && req.query.action === 'create-po') {
      const selected = Array.isArray(req.body?.poMainGridData) ? req.body.poMainGridData : [];
      if (!selected.length) return res.status(400).json({ error: 'Please Select SKU To Create PO.' });
      for (const row of selected) {
        if (!row.vendorCode || number(row.unitCost) < 0 || number(row.toOrderQty) <= 0) return res.status(400).json({ error: 'Vendor, Unit Cost and To Order Qty must be valid.' });
      }
      const created = [];
      for (const row of selected) {
        const po = await insert('purchase_orders', { po_no: `BO-${Date.now()}-${row.id}`, vendor: row.vendorDesc || row.vendorCode, vendor_code: row.vendorCode, warehouse: row.siteLocation || 'UWH', po_date: new Date().toISOString().slice(0,10), expected_date: new Date(Date.now()+86400000).toISOString().slice(0,10), items: 1, qty: number(row.toOrderQty), amount: number(row.unitCost) * number(row.toOrderQty), status: 'Pending Confirmation', buyer_name: 'System Buyer', po_type: row.orderType || 'Outright', recv_validation_code: 'No Excess Receiving', line_items: [{ sku_code: row.skuCode, description: row.skuDesc || '', po_qty: number(row.toOrderQty), mrp: number(row.mrp), unit_cost: number(row.unitCost) }] });
        created.push(po); await update('back_orders', row.id, { isProcessed: true });
      }
      return res.status(201).json({ createPOBackOrderDatas: created });
    }
    if (req.method === 'POST') return res.status(201).json(await insert('back_orders', req.body));
    if (req.method === 'PUT') { const row = await findOne('back_orders', { id: Number(req.body.id) }); if (!row) return res.status(404).json({ error: 'Back Order not found' }); return res.status(200).json((await update('back_orders', row.id, req.body))[0]); }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
