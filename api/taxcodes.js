import { find, findOne, insert, update, cors } from './mongo.js';

const TYPES = ['GST', 'CESS', 'VAT', 'OTHERS'];
function validate(body) {
  const tax_code = String(body.tax_code || '').trim();
  if (!tax_code) return 'Please Enter Tax Code';
  if (!/^[a-z0-9]+$/i.test(tax_code)) return 'Please Enter Only AlphaNumerics';
  if (tax_code.length > 50) return 'Tax Code cannot exceed 50 characters';
  if (!TYPES.includes(body.tax_code_type)) return 'Please Select Tax Code Type';
  if (!String(body.tax_nature || '').trim()) return 'Tax Nature is mandatory';
  if (!body.start_date) return 'Please Select Start Date';
  const percentage = Number(body.percentage);
  if (body.percentage === '' || body.percentage === undefined || body.percentage === null) return 'Please Enter Percentage';
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return 'Please Enter Valid Percentage';
  if (!['Active', 'Inactive'].includes(body.is_active)) return 'Invalid status';
  return null;
}

// Tax Code master (Master > Tax Management > Tax Code)
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('tax_codes', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (b.REQ_SEARCH_FLAG) {
        const has = (value, query) => !String(query ?? '').trim() || String(value ?? '').toLowerCase().includes(String(query).trim().toLowerCase());
        const filtered = (await find('tax_codes', {}, { sort: { id: -1 } })).filter((row) => has(row.tax_code, b.extTaxCode) && has(row.tax_code_type, b.taxCodeValue) && has(row.start_date, b.displayStartDate) && has(row.percentage, b.percentage) && has(row.description, b.description) && has(row.is_active, b.displayIsActive) && has(row.tax_nature, b.taxNature));
        const size = [20, 50, 100, 200].includes(Number(b.rows)) ? Number(b.rows) : 20, page = Math.max(1, Number(b.page) || 1), records = filtered.length, total = Math.ceil(records / size), gridModel = filtered.slice((page - 1) * size, page * size);
        return res.status(200).json({ gridModel, rows: gridModel, page, records, total, sidx: String(b.sidx || 'taxCode'), sord: String(b.sord || 'desc') });
      }
      const error = validate({ ...b, is_active: b.is_active === undefined ? 'Active' : b.is_active }); if (error) return res.status(400).json({ error });
      if ((await find('tax_codes', {})).some((row) => row.tax_code?.toLowerCase() === String(b.tax_code).trim().toLowerCase())) return res.status(409).json({ error: 'Tax Code already exists' });
      const doc = await insert('tax_codes', {
        tax_code: String(b.tax_code).trim(), tax_code_type: b.tax_code_type,
        start_date: b.start_date,
        percentage: Number(b.percentage) || 0, description: b.description || '',
        is_active: b.is_active === undefined ? 'Active' : b.is_active, tax_nature: b.tax_nature,
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const current = await findOne('tax_codes', { id: Number(id) }); if (!current) return res.status(404).json({ error: 'Tax Code not found' });
      if (['VINCCNA', 'VINSCNA'].includes(String(current.tax_code).toUpperCase())) return res.status(403).json({ error: 'VINCCNA/VINSCNA are system defined taxes. You have no rights to change it.' });
      const next = { ...current, ...fields, tax_code: String(fields.tax_code || '').trim() };
      const error = validate(next); if (error) return res.status(400).json({ error });
      if ((await find('tax_codes', {})).some((row) => row.id !== current.id && row.tax_code?.toLowerCase() === next.tax_code.toLowerCase())) return res.status(409).json({ error: 'Tax Code already exists' });
      const rows = await update('tax_codes', id, { ...fields, tax_code: next.tax_code, percentage: Number(next.percentage) });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      return res.status(409).json({ error: 'Tax Codes are maintained by status; deletion is not available.' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('taxcodes error:', err); res.status(500).json({ error: err.message }); }
}
