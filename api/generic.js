import { find, insert, update, remove, cors } from './mongo.js';

// Master data store. Persists the base fields (code/name/description/status)
// PLUS any extra domain-specific fields sent in `extra` (stored inline), so
// each master screen (Vendor, Tax Code, Coupon, etc.) can keep its real fields.
const BASE = ['module', 'code', 'name', 'description', 'status', 'created_date'];

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { module } = req.query;
      const q = module ? { module } : {};
      return res.status(200).json(await find('generic_records', q, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const { module, code, name, description, status, extra } = req.body;
      const doc = {
        ...(extra && typeof extra === 'object' ? extra : {}),
        module, code, name, description,
        status: status || extra?.status || 'Active',
        created_date: new Date().toISOString().slice(0, 10),
      };
      return res.status(201).json(await insert('generic_records', doc));
    }
    if (req.method === 'PUT') {
      const { id, extra, ...fields } = req.body;
      const payload = { ...(extra && typeof extra === 'object' ? extra : {}), ...fields };
      const rows = await update('generic_records', id, payload);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('generic_records', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
