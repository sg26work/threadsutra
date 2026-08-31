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
      if (String(b.REQ_SEARCH_FLAG) === 'true') {
        const has=(v,q)=>!String(q??'').trim()||String(q)==='-1'||String(v??'').toLowerCase().includes(String(q).trim().toLowerCase()),types={'1':'Line','2':'Bill'},statuses={'7':'Cancelled','4':'Confirmed','1':'Pending Confirmation'};
        const all=await find('coupons_master',{}, {sort:{id:-1}}),filtered=all.filter(r=>has(r.coupon_key,b.couponKey)&&has(r.description,b.desc)&&has(r.coupon_code,b.couponCode)&&has(r.coupon_type,types[String(b.couponType)]||'')&&has(r.status,statuses[String(b.couponStatus)]||''));
        const size=[20,50,100,200].includes(Number(b.rows))?Number(b.rows):20,page=Math.max(1,Number(b.page)||1),records=filtered.length,total=Math.ceil(records/size),gridModel=filtered.slice((page-1)*size,page*size);
        return res.status(200).json({gridModel:gridModel.length?gridModel:null,page,records,total});
      }
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
