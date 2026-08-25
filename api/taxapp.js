import { find, findOne, insert, update, remove, cors } from './mongo.js';

async function validateTaxCategory(code, currentCode = '') {
  const category = await findOne('generic_records', { module: 'tax-category', code });
  if (!category) return 'Tax Category does not exist';
  if (category.status !== 'Active' && code !== currentCode) return 'Inactive Tax Category cannot be assigned';
  return null;
}
async function validateTaxGroup(code, currentCode = '') {
  const group = await findOne('generic_records', { module: 'tax-group', code });
  if (!group) return code === currentCode ? null : 'Tax Group does not exist';
  if (group.status !== 'Active' && code !== currentCode) return 'Inactive Tax Group cannot be assigned';
  return null;
}
async function validateTaxZone(code, currentCode = '') {
  if (!code) return 'Please Select Tax Zone';
  const zone = await findOne('generic_records', { module: 'tax-zone', code });
  if (!zone) return code === currentCode ? null : 'Tax Zone does not exist';
  if (zone.status !== 'Active' && code !== currentCode) return 'Inactive Tax Zone cannot be assigned';
  return null;
}
function validateRule(body) {
  if (!['Sales', 'Purchase'].includes(body.tax_type)) return 'Please Select Tax Type';
  if (!['ALL', 'IN', 'OUT', 'With In'].includes(body.goods_direction)) return 'Please Select Goods Direction';
  if (!body.start_date) return 'Please Select Start Date';
  if (!['Active', 'Inactive'].includes(body.is_active)) return 'Invalid status';
  if (body.from_mrp === '' || body.from_mrp === undefined || body.from_mrp === null) return 'Please Enter From MRP';
  if (body.to_mrp === '' || body.to_mrp === undefined || body.to_mrp === null) return 'Please Enter To MRP';
  const from = Number(body.from_mrp), to = Number(body.to_mrp);
  if (!Number.isFinite(from) || from < 0) return 'Please Enter From MRP';
  if (!Number.isFinite(to) || to < 0) return 'Please Enter To MRP';
  if (to > 0 && from > to) return 'From MRP cant greater than To MRP';
  return null;
}
function sameRule(a, b) { return a.tax_category === b.tax_category && a.tax_type === b.tax_type && a.tax_group_code === b.tax_group_code && a.goods_direction === b.goods_direction && a.tax_zone === b.tax_zone && a.start_date === b.start_date && Number(a.from_mrp) === Number(b.from_mrp) && Number(a.to_mrp) === Number(b.to_mrp); }

// Tax Application (Masters > Master > Tax Application)
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await find('tax_application', {}, { sort: { id: -1 } });
      if (req.query.resolve === 'true') {
        const candidates = rows.filter((row) => row.is_active === 'Active' && row.tax_category === req.query.tax_category && row.tax_type === req.query.tax_type && (!row.tax_zone || row.tax_zone === req.query.tax_zone) && (!req.query.goods_direction || row.goods_direction === 'ALL' || row.goods_direction === req.query.goods_direction)).filter((row) => { const amount = Number(req.query.mrp || 0), from = Number(row.from_mrp || 0), to = Number(row.to_mrp || 0); return amount >= from && (!to || amount <= to); });
        return res.status(200).json({ match: candidates[0] || null, candidates });
      }
      return res.status(200).json(rows);
    }
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const b = req.body;
      const has = (value, query) => !String(query ?? '').trim() || String(query) === '-1' || String(value ?? '').toLowerCase().includes(String(query).trim().toLowerCase());
      const yesNo = (value) => value === true || value === 1 || value === '1' || value === 'Yes' ? '1' : '0';
      const active = (value) => value === 'Active' || value === true || value === 1 || value === '1' ? '1' : '0';
      let filtered = (await find('tax_application', {})).filter((row) =>
        has(row.tax_group_code, b.taxGroupCode) && has(row.tax_zone, b.taxZone) && has(row.tax_category, b.taxCategory) &&
        has(row.start_date, b.startDate) && has(row.tax_type, b.taxType) && has(row.goods_direction, b.goodsDirection) &&
        has(row.tax_authority, b.taxAuthority) && (String(b.IsFormCTax ?? '-1') === '-1' || yesNo(row.is_form_c_tax) === String(b.IsFormCTax)) &&
        (String(b.IsFormHTax ?? '-1') === '-1' || yesNo(row.is_form_h_tax) === String(b.IsFormHTax)) &&
        (String(b.isActive ?? '-1') === '-1' || active(row.is_active) === String(b.isActive))
      );
      const sortMap = { taxCategory: 'tax_category', taxType: 'tax_type', taxGroup: 'tax_group_code', goodsDirection: 'goods_direction', taxZone: 'tax_zone', startDate: 'start_date' };
      const sortKey = sortMap[b.sidx] || 'tax_category', direction = String(b.sord || 'desc') === 'asc' ? 1 : -1;
      filtered = filtered.sort((a, c) => String(a[sortKey] ?? '').localeCompare(String(c[sortKey] ?? '')) * direction);
      const size = [20, 50, 100, 200].includes(Number(b.rows)) ? Number(b.rows) : 20, page = Math.max(1, Number(b.page) || 1), records = filtered.length, total = Math.ceil(records / size), gridModel = filtered.slice((page - 1) * size, page * size);
      return res.status(200).json({ gridModel, rows: gridModel, page, records, total, sidx: String(b.sidx || 'taxCategory'), sord: String(b.sord || 'desc') });
    }
    if (req.method === 'POST') {
      const b = req.body;
      const taxError = await validateTaxCategory(b.tax_category); if (taxError) return res.status(400).json({ error: taxError });
      const groupError = await validateTaxGroup(b.tax_group_code); if (groupError) return res.status(400).json({ error: groupError });
      const zoneError = await validateTaxZone(b.tax_zone); if (zoneError) return res.status(400).json({ error: zoneError });
      const normalized = { ...b, tax_type: b.tax_type || '', goods_direction: b.goods_direction || '', start_date: b.start_date || '', is_active: b.is_active || 'Active', from_mrp: Number(b.from_mrp), to_mrp: Number(b.to_mrp) };
      const ruleError = validateRule(normalized); if (ruleError) return res.status(400).json({ error: ruleError });
      if ((await find('tax_application', {})).some((row) => sameRule(row, normalized))) return res.status(409).json({ error: 'An identical Tax Application rule already exists.' });
      const doc = await insert('tax_application', {
        tax_category: b.tax_category, tax_type: normalized.tax_type,
        tax_group_code: b.tax_group_code || '', goods_direction: normalized.goods_direction,
        tax_zone: b.tax_zone || '', start_date: normalized.start_date,
        tax_authority: b.tax_authority || '', is_form_c_tax: Boolean(b.is_form_c_tax), is_form_h_tax: Boolean(b.is_form_h_tax),
        is_active: normalized.is_active, from_mrp: normalized.from_mrp, to_mrp: normalized.to_mrp,
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const current = (await find('tax_application', {})).find((row) => row.id === Number(id)); if (!current) return res.status(404).json({ error: 'Tax Application not found' });
      const taxError = await validateTaxCategory(fields.tax_category, current.tax_category); if (taxError) return res.status(400).json({ error: taxError });
      const groupError = await validateTaxGroup(fields.tax_group_code, current.tax_group_code); if (groupError) return res.status(400).json({ error: groupError });
      const zoneError = await validateTaxZone(fields.tax_zone, current.tax_zone); if (zoneError) return res.status(400).json({ error: zoneError });
      const next = { ...current, ...fields, from_mrp: Number(fields.from_mrp), to_mrp: Number(fields.to_mrp) };
      const ruleError = validateRule(next); if (ruleError) return res.status(400).json({ error: ruleError });
      if ((await find('tax_application', {})).some((row) => row.id !== current.id && sameRule(row, next))) return res.status(409).json({ error: 'An identical Tax Application rule already exists.' });
      const rows = await update('tax_application', id, next);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      return res.status(409).json({ error: 'Tax Applications are maintained by status; deletion is not available.' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('taxapp error:', err); res.status(500).json({ error: err.message }); }
}
