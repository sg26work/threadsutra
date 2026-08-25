import { find, findOne, insert, update, remove, cors } from './mongo.js';

const MODULE = 'tax-group';
async function listGroups() {
  const [groups, mappings, codes] = await Promise.all([find('generic_records', { module: MODULE }, { sort: { id: -1 } }), find('tax_group_codes', {}), find('tax_codes', {})]);
  return groups.map((group) => {
    const components = mappings.filter((mapping) => mapping.group_id === group.id).sort((a, b) => a.sequence - b.sequence).map((mapping) => ({ ...mapping, tax_code: codes.find((code) => code.id === mapping.tax_code_id) })).filter((mapping) => mapping.tax_code);
    return { ...group, components, no_of_tax_codes: components.length, total_rate: components.reduce((sum, item) => sum + Number(item.tax_code.percentage || 0), 0) };
  });
}
function validBase(body) { if (!String(body.code || '').trim()) return 'Tax Group Code is required'; if (!body.applied_on) return 'Applied On is required'; if (!body.start_date) return 'Please Select Start Date'; if (!['Active', 'Inactive'].includes(body.status)) return 'Invalid status'; return null; }

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await listGroups(); const { code, name, status } = req.query;
      return res.status(200).json(rows.filter((row) => (!code || row.code.toLowerCase().includes(String(code).toLowerCase())) && (!name || row.name.toLowerCase().includes(String(name).toLowerCase())) && (!status || row.status === status)));
    }
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const b = req.body, has = (value, query) => !String(query ?? '').trim() || String(value ?? '').toLowerCase().includes(String(query).trim().toLowerCase());
      const filtered = (await listGroups()).filter((row) => has(row.code, b.extTaxGroupCode) && has(row.applied_on, b.appliedOn) && has(row.start_date, b.displayStartDate) && has(row.status === 'Active' ? 'Yes' : 'No', b.displayIsActive));
      const size = [20, 50, 100, 200].includes(Number(b.rows)) ? Number(b.rows) : 20, page = Math.max(1, Number(b.page) || 1), records = filtered.length, total = Math.ceil(records / size), gridModel = filtered.slice((page - 1) * size, page * size);
      return res.status(200).json({ gridModel, rows: gridModel, page, records, total, sidx: String(b.sidx || ''), sord: String(b.sord || 'asc') });
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body, error = validBase(body); if (error) return res.status(400).json({ error });
      const componentIds = Array.isArray(body.tax_code_ids) ? body.tax_code_ids.map(Number) : [];
      if (!componentIds.length) return res.status(400).json({ error: 'Add at least one Tax Code.' });
      if (new Set(componentIds).size !== componentIds.length) return res.status(400).json({ error: 'A Tax Code can only be added once.' });
      const codes = await find('tax_codes', {}); if (componentIds.some((id) => !codes.some((code) => code.id === id))) return res.status(400).json({ error: 'One or more Tax Codes are invalid.' });
      const groups = await find('generic_records', { module: MODULE });
      if (req.method === 'POST') {
        if (groups.some((group) => group.code?.toLowerCase() === body.code.trim().toLowerCase())) return res.status(409).json({ error: 'Tax Group Code already exists.' });
        if (groups.some((group) => group.name?.toLowerCase() === body.name.trim().toLowerCase())) return res.status(409).json({ error: 'Tax Group Name already exists.' });
        const group = await insert('generic_records', { module: MODULE, code: body.code.trim(), name: body.name.trim(), applied_on: body.applied_on, start_date: body.start_date, status: body.status, created_date: new Date().toISOString().slice(0, 10) });
        await Promise.all(componentIds.map((tax_code_id, index) => insert('tax_group_codes', { group_id: group.id, tax_code_id, sequence: index + 1 })));
        return res.status(201).json((await listGroups()).find((row) => row.id === group.id));
      }
      const group = await findOne('generic_records', { id: Number(body.id) }); if (!group || group.module !== MODULE) return res.status(404).json({ error: 'Tax Group not found' });
      if (groups.some((item) => item.id !== group.id && item.code?.toLowerCase() === body.code.trim().toLowerCase())) return res.status(409).json({ error: 'Tax Group Code already exists.' });
      if (groups.some((item) => item.id !== group.id && item.name?.toLowerCase() === body.name.trim().toLowerCase())) return res.status(409).json({ error: 'Tax Group Name already exists.' });
      await update('generic_records', group.id, { code: body.code.trim(), name: body.name.trim(), status: body.status, updated_date: new Date().toISOString().slice(0, 10) });
      for (const old of await find('tax_group_codes', { group_id: group.id })) await remove('tax_group_codes', old.id);
      await Promise.all(componentIds.map((tax_code_id, index) => insert('tax_group_codes', { group_id: group.id, tax_code_id, sequence: index + 1 })));
      return res.status(200).json((await listGroups()).find((row) => row.id === group.id));
    }
    if (req.method === 'DELETE') return res.status(409).json({ error: 'Tax Groups are maintained by status; deletion is not available.' });
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('tax groups error:', err); res.status(500).json({ error: err.message }); }
}
