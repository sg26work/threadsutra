import { find, insert, update, remove, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { type } = req.query;
      const q = type ? { type } : {};
      return res.status(200).json(await find('partners', q, { sort: { id: 1 } }));
    }
    if (req.method === 'POST') {
      const { code, name, type, contact, phone, email, city, state, gstin } = req.body;
      return res.status(201).json(await insert('partners', { code, name, type, contact, phone, email, city, state, gstin }));
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('partners', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('partners', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
