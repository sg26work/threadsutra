import { find, findOne, insert, update, updateWhere, cors } from './mongo.js';

const toTransporter = (p) => ({ ...p, transporter_code: p.transporter_code || p.code, transporter_name: p.transporter_name || p.name, transporter_company_name: p.transporter_company_name || '', transporter_type: p.transporter_type || 'Courier', country: p.country || 'INDIA', status: p.status || 'Active', is_active: p.is_active ?? true });
const clean = (b) => ({ ...b, code: b.transporter_code, name: b.transporter_name, type: 'Transporter', transporter_type: b.transporter_type, contact: b.contact_person || b.contact || '', phone: b.phone || '', email: b.email || '', city: b.city || '', state: b.state || '', gstin: b.gstin_cin || b.gstin || '' });
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json((await find('partners', { type: 'Transporter' }, { sort: { id: -1 } })).map(toTransporter));
    if (req.method === 'POST') {
      const b = req.body; const code = String(b.transporter_code || '').trim(); const name = String(b.transporter_name || '').trim();
      if (!b.transporter_type || b.transporter_type === '--- Select ---') return res.status(400).json({ error: 'Please Select Transporter Type' });
      if (!code || !name) return res.status(400).json({ error: 'Transporter Code and Transporter Name are required' });
      if (await findOne('partners', { code })) return res.status(409).json({ error: `Transporter Code "${code}" already exists` });
      if ((await find('partners', { name })).some((p) => p.type === 'Transporter')) return res.status(409).json({ error: `Transporter Name "${name}" already exists` });
      return res.status(201).json(toTransporter(await insert('partners', { ...clean({ ...b, transporter_code: code, transporter_name: name }), status: b.is_active === false ? 'Inactive' : 'Active', is_active: b.is_active !== false, created_date: new Date().toISOString().slice(0, 10) })));
    }
    if (req.method === 'PUT') {
      const { id, ...b } = req.body; const current = await findOne('partners', { id: Number(id) }); if (!current || current.type !== 'Transporter') return res.status(404).json({ error: 'Transporter not found' });
      const currentView = toTransporter(current); const next = clean({ ...currentView, ...b, transporter_code: currentView.transporter_code }); const code = String(next.code || '').trim(); const name = String(next.name || '').trim();
      if (!code || !name) return res.status(400).json({ error: 'Transporter Code and Transporter Name are required' });
      const duplicate = (await find('partners', { code })).find((p) => p.id !== Number(id)); if (duplicate) return res.status(409).json({ error: `Transporter Code "${code}" already exists` });
      if (name !== current.name) { await updateWhere('fulfillment_orders', { courier: current.name }, { courier: name }); await updateWhere('shipments', { courier: current.name }, { courier: name }); }
      const active = b.is_active ?? currentView.is_active;
      const [saved] = await update('partners', Number(id), { ...next, code, name, type: 'Transporter', transporter_code: code, transporter_name: name, status: active ? 'Active' : 'Inactive', is_active: active }); return res.status(200).json(toTransporter(saved));
    }
    if (req.method === 'DELETE') return res.status(409).json({ error: 'Transporters cannot be deleted. Set Is Active off instead.' });
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('transporters error:', err); res.status(500).json({ error: err.message }); }
}
