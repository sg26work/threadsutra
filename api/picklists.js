import { find, insert, update, remove, updateWhere, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('picklists', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const { warehouse, orderIds, pick_mode } = req.body;
      const picklist_no = 'PL' + Date.now().toString().slice(-6);
      const orders = await find('fulfillment_orders', {});
      const chosen = orders.filter((o) => (orderIds || []).includes(o.id));
      const total_qty = chosen.reduce((s, o) => s + Number(o.qty || 0), 0);
      const sku_count = new Set(chosen.map((o) => o.sku_code)).size;
      const doc = await insert('picklists', {
        picklist_no, warehouse, order_count: chosen.length, sku_count, total_qty,
        pick_mode: pick_mode || 'Pick by Order', status: 'Open',
        created_date: new Date().toISOString().slice(0, 10), picker: 'Unassigned',
      });
      if (orderIds && orderIds.length) {
        await update('fulfillment_orders', orderIds, { status: 'Picklist Generated', picklist_no });
      }
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('picklists', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('picklists', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
