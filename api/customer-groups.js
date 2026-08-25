import { find, findOne, insert, update, cors } from './mongo.js';

const MODULE = 'customer-group';
const matches = (row, query) => Object.entries(query).every(([key, value]) => !value || String(row[key] || '').toLowerCase().includes(String(value).toLowerCase()));

async function groups() {
  const [records, customers] = await Promise.all([
    find('generic_records', { module: MODULE }, { sort: { id: -1 } }),
    find('partners', { type: 'Customer' }),
  ]);
  return records.map((record) => ({
    ...record,
    no_of_customer: customers.filter((customer) => customer.customer_group_code === record.code).length,
  }));
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { code, name, status } = req.query;
      return res.status(200).json((await groups()).filter((row) => matches(row, { code, name, status })));
    }
    if (req.method === 'POST') {
      if (req.body?.REQ_SEARCH_FLAG) {
        const b = req.body;
        const filtered = (await groups()).filter((row) => matches(row, { code: b.custGroupCode, name: b.custGroupName, status: b.statusText }));
        const size = [20, 50, 100, 200].includes(Number(b.rows)) ? Number(b.rows) : 20;
        const page = Math.max(1, Number(b.page) || 1), records = filtered.length, total = Math.ceil(records / size), gridModel = filtered.slice((page - 1) * size, page * size);
        return res.status(200).json({ gridModel, rows: gridModel, page, records, total, sidx: String(b.sidx || 'custGroupCode'), sord: String(b.sord || 'desc') });
      }
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Please Enter Customer Group Name.' });
      if (name.length > 50) return res.status(400).json({ error: 'Customer Group Name cannot exceed 50 characters.' });
      const duplicate = (await find('generic_records', { module: MODULE })).find((row) => row.name?.trim().toLowerCase() === name.toLowerCase());
      if (duplicate) return res.status(409).json({ error: 'Customer Group Name already exists.' });
      const created = await insert('generic_records', { module: MODULE, code: '', name, status: 'Active', created_date: new Date().toISOString().slice(0, 10) });
      const code = `CG${String(created.id).padStart(4, '0')}`;
      const [saved] = await update('generic_records', created.id, { code });
      return res.status(201).json({ ...saved, no_of_customer: 0 });
    }
    if (req.method === 'PUT') {
      const { id, name, status, customer_ids } = req.body;
      const group = await findOne('generic_records', { id: Number(id) });
      if (!group || group.module !== MODULE) return res.status(404).json({ error: 'Customer Group not found' });
      const nextName = String(name ?? group.name).trim();
      if (!nextName) return res.status(400).json({ error: 'Please Enter Customer Group Name.' });
      if (nextName.length > 50) return res.status(400).json({ error: 'Customer Group Name cannot exceed 50 characters.' });
      const duplicate = (await find('generic_records', { module: MODULE })).find((row) => row.id !== group.id && row.name?.trim().toLowerCase() === nextName.toLowerCase());
      if (duplicate) return res.status(409).json({ error: 'Customer Group Name already exists.' });
      if (status && !['Active', 'Inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      const [saved] = await update('generic_records', group.id, { name: nextName, status: status || group.status, updated_date: new Date().toISOString().slice(0, 10) });
      if (Array.isArray(customer_ids)) {
        const selected = new Set(customer_ids.map(Number));
        const customers = await find('partners', { type: 'Customer' });
        for (const customer of customers) {
          if (selected.has(customer.id)) await update('partners', customer.id, { customer_group_code: saved.code });
          else if (customer.customer_group_code === saved.code) await update('partners', customer.id, { customer_group_code: '' });
        }
      }
      return res.status(200).json((await groups()).find((row) => row.id === saved.id));
    }
    if (req.method === 'DELETE') {
      const group = await findOne('generic_records', { id: Number(req.body.id) });
      if (!group || group.module !== MODULE) return res.status(404).json({ error: 'Customer Group not found' });
      const used = (await find('partners', { type: 'Customer' })).some((customer) => customer.customer_group_code === group.code);
      return res.status(409).json({ error: used ? 'Customer Group cannot be deleted while customers are assigned. Set it Inactive instead.' : 'Customer Groups are maintained by status; deletion is not available.' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('customer groups error:', err); res.status(500).json({ error: err.message }); }
}
