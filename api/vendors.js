import { find, findOne, insert, update, updateWhere, cors } from './mongo.js';

// Earlier local seeds used simplified names. Present them using the observed
// Vendor Master vocabulary while retaining backward-compatible records.
const normalizeVendor = (vendor) => ({
  ...vendor,
  vendor_type: vendor.vendor_type === 'Domestic' || vendor.vendor_type === 'Import' ? 'Outright purchase' : vendor.vendor_type,
  country: vendor.country === 'India' ? 'INDIA' : vendor.country,
  status: vendor.status === 'Active' ? 'Confirmed' : vendor.status === 'Inactive' ? 'Deactivated' : vendor.status,
});

// Vendor Master (Master > Trading Partner > Vendor Enquiry)
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json((await find('vendors', {}, { sort: { id: -1 } })).map(normalizeVendor));
    }
    if (req.method === 'POST') {
      const b = req.body;
      const code = String(b.vendor_code || '').trim();
      const name = String(b.vendor_name || '').trim();
      if (!code || !name) return res.status(400).json({ error: 'Vendor Code and Vendor Name are required' });
      if (await findOne('vendors', { vendor_code: code })) return res.status(409).json({ error: `Vendor Code "${code}" already exists` });
      const doc = await insert('vendors', {
        ...b, vendor_code: code, vendor_name: name,
        vendor_type: b.vendor_type || 'Outright purchase', credit_days: b.credit_days ?? '',
        country: b.country || 'INDIA', state: b.state || '', city: b.city || '',
        status: b.status || 'Pending Confirmation',
        // Local audit data is server-owned so the client cannot fabricate history.
        audit: [{ at: new Date().toISOString(), action: 'Created', by: 'demo-admin' }],
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const current = await findOne('vendors', { id: Number(id) });
      if (!current) return res.status(404).json({ error: 'Vendor not found' });
      // The reference locks Vendor Code after the first save.
      const code = String(current.vendor_code).trim();
      const name = String(fields.vendor_name ?? current.vendor_name).trim();
      if (!code || !name) return res.status(400).json({ error: 'Vendor Code and Vendor Name are required' });
      const duplicate = (await find('vendors', { vendor_code: code })).find((v) => v.id !== Number(id));
      if (duplicate) return res.status(409).json({ error: `Vendor Code "${code}" already exists` });
      // Transaction records store the display name. Keep them linked after a rename.
      if (name !== current.vendor_name) {
        await updateWhere('purchase_orders', { vendor: current.vendor_name }, { vendor: name });
        await updateWhere('grn', { vendor: current.vendor_name }, { vendor: name });
      }
      const changedStatus = fields.status && fields.status !== current.status;
      const audit = [
        ...(Array.isArray(current.audit) ? current.audit : []),
        { at: new Date().toISOString(), action: changedStatus ? `Status changed to ${fields.status}` : 'Updated', by: 'demo-admin' },
      ];
      const rows = await update('vendors', Number(id), { ...fields, vendor_code: code, vendor_name: name, audit });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      // A vendor may be referenced by POs/GRNs; deleting it would break history.
      return res.status(409).json({ error: 'Vendor records cannot be deleted from Vendor Master. Deactivate the vendor instead.' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('vendors error:', err); res.status(500).json({ error: err.message }); }
}
