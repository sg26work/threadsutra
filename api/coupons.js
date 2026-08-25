import { find, insert, update, remove, cors } from './mongo.js';

// Manage Coupons (Master > Coupon Management > Coupon Enquiry)
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('coupons_master', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const b = req.body;
      const doc = await insert('coupons_master', {
        coupon_key: b.coupon_key, description: b.description || '',
        coupon_type: b.coupon_type || 'Percentage', status: b.status || 'Active',
        coupon_code: b.coupon_code, start_date: b.start_date || '',
        end_date: b.end_date || '', active_date: b.active_date || '',
        created_by: b.created_by || 'demo-admin',
        discount_value: Number(b.discount_value) || 0, min_order: Number(b.min_order) || 0,
        usage_limit: Number(b.usage_limit) || 0,
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('coupons_master', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('coupons_master', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('coupons error:', err); res.status(500).json({ error: err.message }); }
}
