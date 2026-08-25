import { find, findOne, insert, update, cors } from './mongo.js';

const clean = (value) => String(value ?? '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const statusText = (row) => row.active === false ? 'Inactive' : 'Active';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const row = await findOne('procurement_buyers', { buyer_code: clean(req.query.buyerCode) });
      if (!row) return res.status(404).json({ error: 'Category Buyer not found.' });
      return res.status(200).json(row);
    }
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const body = req.body; const has = (value, query) => !clean(query) || clean(value).toLowerCase().includes(clean(query).toLowerCase());
      const filtered = (await find('procurement_buyers')).filter((row) => has(row.buyer_code, body.buyerCode)
        && has(row.buyer_name, body.buyerName) && has(row.description, body.buyerDesc) && has(row.phone, body.phone)
        && has(row.alternate_phone, body.altPhone) && has(row.email, body.email)
        && (clean(body.displayIsActive) === '-1' || !clean(body.displayIsActive) || String(row.active === false ? 0 : 1) === clean(body.displayIsActive))
        && has(row.udf?.[0], body.udf1) && has(row.udf?.[1], body.udf2) && has(row.udf?.[2], body.udf3)
        && has(row.udf?.[3], body.udf4) && has(row.udf?.[4], body.udf5)
        && has(row.created_date, body.createdDate) && has(row.updated_by, body.updatedBy) && has(row.updated_date, body.updatedDate)
        && (!clean(body.linkToCategory) || (row.categories || []).includes(clean(body.linkToCategory))));
      const size = [20, 50, 100, 200].includes(Number(body.rows)) ? Number(body.rows) : 20;
      const page = Math.max(1, Number(body.page) || 1); const records = filtered.length; const total = Math.ceil(records / size);
      const gridModel = filtered.sort((a, b) => Number(a.buyer_code) - Number(b.buyer_code)).slice((page - 1) * size, page * size)
        .map((row) => ({ ...row, displayIsActive: statusText(row), linkToCategory: (row.categories || []).join(', ') }));
      return res.status(200).json({ gridModel, rows: gridModel, page, records, total });
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      if (!clean(body.buyer_name)) return res.status(400).json({ error: 'Buyer Name is required.' });
      if (body.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) return res.status(400).json({ error: 'Enter a valid Email.' });
      const all = await find('procurement_buyers');
      const current = clean(body.buyer_code) ? await findOne('procurement_buyers', { buyer_code: clean(body.buyer_code) }) : null;
      if (all.some((row) => row.id !== current?.id && clean(row.buyer_name).toLowerCase() === clean(body.buyer_name).toLowerCase())) return res.status(409).json({ error: 'Buyer Name already exists.' });
      const data = { buyer_code: current?.buyer_code || String(Math.max(0, ...all.map((row) => Number(row.buyer_code) || 0)) + 1), buyer_name: clean(body.buyer_name), description: clean(body.description), email: clean(body.email), phone: clean(body.phone), alternate_phone: clean(body.alternate_phone), active: body.active !== false, categories: Array.isArray(body.categories) ? body.categories : [], udf: Array.from({ length: 5 }, (_, index) => clean(body.udf?.[index])), location: current?.location || 'UPSL Warehouse', created_by: current?.created_by || 'Local User', created_date: current?.created_date || today(), updated_by: 'Local User', updated_date: today() };
      const saved = current ? (await update('procurement_buyers', current.id, data))[0] : await insert('procurement_buyers', data);
      return res.status(current ? 200 : 201).json(saved);
    }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) { console.error('Category Buyers API error:', error); return res.status(500).json({ error: error.message || 'Unable to process Category Buyer.' }); }
}
