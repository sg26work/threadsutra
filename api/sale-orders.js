import { find, insert, update, remove, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { status } = req.query;
      const q = status ? { status } : {};
      return res.status(200).json(await find('sale_orders', q, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const { order_no, channel, customer, city, order_date, items, qty, amount, status, payment_mode } = req.body;
      return res.status(201).json(await insert('sale_orders', {
        order_no, channel, customer, city, order_date, items, qty, amount, status: status || 'Confirmed', payment_mode,
      }));
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('sale_orders', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('sale_orders', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
