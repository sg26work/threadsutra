import { find, insert, update, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('shipments', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const { courier, warehouse, orderIds } = req.body;
      const manifest_no = 'MF' + Date.now().toString().slice(-6);
      const doc = await insert('shipments', {
        manifest_no, courier, warehouse, shipment_count: (orderIds || []).length,
        status: 'Pending Handover', handover_date: new Date().toISOString().slice(0, 10),
      });
      if (orderIds && orderIds.length) {
        await update('fulfillment_orders', orderIds, { status: 'Manifested' });
      }
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('shipments', id, fields);
      return res.status(200).json(rows[0]);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
