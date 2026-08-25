import { find, findOne, insert, update, remove, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { warehouse } = req.query;
      const q = warehouse ? { warehouse } : {};
      return res.status(200).json(await find('inventory', q, { sort: { id: 1 } }));
    }
    if (req.method === 'POST') {
      const { sku_code, name, warehouse, bin, available, reserved, on_hand } = req.body;
      return res.status(201).json(await insert('inventory', { sku_code, name, warehouse, bin, available, reserved, on_hand }));
    }
    if (req.method === 'PUT') {
      const { id, adjustment, ...fields } = req.body;
      if (adjustment !== undefined) {
        const row = await findOne('inventory', { id });
        const newAvail = (row.available || 0) + Number(adjustment);
        const newOnHand = (row.on_hand || 0) + Number(adjustment);
        const rows = await update('inventory', id, { available: newAvail, on_hand: newOnHand });
        return res.status(200).json(rows[0]);
      }
      const rows = await update('inventory', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('inventory', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
