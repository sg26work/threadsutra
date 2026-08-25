import { find, insert, cors } from './mongo.js';

const MODULE = 'manage-attribute';
const text = (value) => String(value ?? '').trim();
const contains = (value, query) => !text(query) || text(query) === '-1' || text(value).toLowerCase().includes(text(query).toLowerCase());
const yesNo = (value) => value === true || value === 1 || value === '1' ? 'true' : 'false';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const records = await find('generic_records', { module: MODULE });
    if (req.method === 'GET') return res.status(200).json({ rows: records });
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const body = req.body;
      let rows = records.filter((row) => contains(row.code, body.pick_sku) && contains(row.description || row.name, body.attributeDescription) && contains(yesNo(row.extra?.mandatory), body.mandatory1) && contains(yesNo(row.extra?.visible), body.visible1) && contains(row.extra?.scope, body.scope1) && contains(yesNo(row.extra?.searchable), body.searchable1) && contains(yesNo(row.status === 'Active'), body.active));
      rows.sort((a, b) => text(a.code).localeCompare(text(b.code)) * (text(body.sord) === 'asc' ? 1 : -1));
      const size = [20, 50, 100, 200].includes(Number(body.rows)) ? Number(body.rows) : 20;
      const page = Math.max(1, Number(body.page) || 1), recordsCount = rows.length, total = Math.ceil(recordsCount / size);
      const gridModel = rows.slice((page - 1) * size, page * size);
      return res.status(200).json({ gridModel, rows: gridModel, page, records: recordsCount, total });
    }
    if (req.method === 'POST') {
      const body = req.body, code = text(body.code).toUpperCase(), description = text(body.description);
      if (!code || !description) return res.status(400).json({ error: 'Attribute Code and Description are mandatory.' });
      if (records.some((row) => text(row.code).toUpperCase() === code)) return res.status(409).json({ error: 'Attribute Code already exists.' });
      return res.status(201).json(await insert('generic_records', { module: MODULE, code, name: description, description, status: body.isActive === false ? 'Inactive' : 'Active', extra: { mandatory: Boolean(body.mandatory), visible: body.visible !== false, scope: text(body.scope), searchable: Boolean(body.searchable), input_type: text(body.inputType) || 'Text' } }));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('manage attributes error:', error); return res.status(500).json({ error: error.message }); }
}
