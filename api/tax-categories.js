import { find, findOne, insert, update, cors } from './mongo.js';

const MODULE = 'tax-category';
const filterRows = (rows, query) => rows.filter((row) => Object.entries(query).every(([key, value]) => !value || String(row[key] || '').toLowerCase().includes(String(value).toLowerCase())));

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json(filterRows(await find('generic_records', { module: MODULE }, { sort: { id: -1 } }), req.query));
    if (req.method === 'POST') {
      if (req.body?.REQ_SEARCH_FLAG) {
        const b = req.body, all = await find('generic_records', { module: MODULE }, { sort: { id: 1 } });
        const filtered = filterRows(all, { code: b.taxCatName, name: b.taxCatdesc, status: b.displayIsActive, created_date: b.createdDate, updated_by: b.updatedBy, updated_date: b.updatedDate });
        const size = [20, 50, 100, 200].includes(Number(b.rows)) ? Number(b.rows) : 20, page = Math.max(1, Number(b.page) || 1), records = filtered.length, total = Math.ceil(records / size), gridModel = filtered.slice((page - 1) * size, page * size);
        return res.status(200).json({ gridModel, rows: gridModel, page, records, total, sidx: String(b.sidx || ''), sord: String(b.sord || 'asc') });
      }
      const code = String(req.body.code || '').trim(), name = String(req.body.name || '').trim(), type = req.body.type || 'HSN (Goods)';
      if (!code) return res.status(400).json({ error: 'Please Enter Tax Category Name' });
      if (!name) return res.status(400).json({ error: 'Please Enter Description.' });
      const records = await find('generic_records', { module: MODULE });
      if (records.some((row) => row.code?.toLowerCase() === code.toLowerCase())) return res.status(409).json({ error: 'HSN/SAC Code already exists.' });
      if (records.some((row) => row.name?.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Description already exists.' });
      return res.status(201).json(await insert('generic_records', { module: MODULE, code, name, type, status: 'Active', created_date: new Date().toISOString().slice(0, 10) }));
    }
    if (req.method === 'PUT') {
      const { id, code, name, type, status } = req.body;
      const current = await findOne('generic_records', { id: Number(id) });
      if (!current || current.module !== MODULE) return res.status(404).json({ error: 'Tax Category not found' });
      if (!String(code || '').trim()) return res.status(400).json({ error: 'Please Enter Tax Category Name' });
      if (!String(name || '').trim()) return res.status(400).json({ error: 'Please Enter Description.' });
      if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      const records = await find('generic_records', { module: MODULE });
      if (records.some((row) => row.id !== current.id && row.code?.toLowerCase() === String(code).trim().toLowerCase())) return res.status(409).json({ error: 'HSN/SAC Code already exists.' });
      if (records.some((row) => row.id !== current.id && row.name?.toLowerCase() === String(name).trim().toLowerCase())) return res.status(409).json({ error: 'Description already exists.' });
      if (code !== current.code && (await find('skus', {})).some((sku) => sku.hsn === current.code)) return res.status(409).json({ error: 'HSN/SAC Code cannot be changed while SKUs use it.' });
      const [saved] = await update('generic_records', current.id, { code: String(code).trim(), name: String(name).trim(), type, status, updated_date: new Date().toISOString().slice(0, 10) });
      return res.status(200).json(saved);
    }
    if (req.method === 'DELETE') return res.status(409).json({ error: 'Tax Categories are maintained by status; deletion is not available.' });
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('tax categories error:', err); res.status(500).json({ error: err.message }); }
}
