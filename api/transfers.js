import { find, insert, update, remove, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('stock_transfers', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const { transfer_no, sku_code, from_wh, to_wh, qty, transfer_date, status } = req.body;
      return res.status(201).json(await insert('stock_transfers', {
        transfer_no, sku_code, from_wh, to_wh, qty, transfer_date, status: status || 'In Transit',
      }));
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('stock_transfers', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('stock_transfers', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
