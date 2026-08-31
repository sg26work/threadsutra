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
      if (b.REQ_SEARCH_FLAG) {
        const vendorType = { '4': 'B2S2', '3': 'JIT', '2': 'Marketplace', '1': 'Outright purchase' }[String(b.vendorType)] || b.vendorType;
        const paymentTerm = { '1':'30 Days','2':'45 Days','3':'60 Days','4':'90 Days','5':'Advance','6':'120 days from the date of receipt of goods','7':'7 days','8':'50 Days','9':'75 DAYS','10':'35 Days','11':'120','13':'Letter of Credit','15':'7 Days','16':'1' }[String(b.paymentTerm)] || b.paymentTerm;
        const status = { '1':'Confirmed','2':'Deactivated','0':'Pending Confirmation' }[String(b.status)] || b.status;
        const matches = (await find('vendors', {}, { sort: { id: -1 } })).map(normalizeVendor).filter((vendor) => {
          const tests = [[vendor.vendor_code,b.vendorCode],[vendor.vendor_name,b.vendorName],[vendor.vendor_type,vendorType],[vendor.vendor_short_name,b.vendorShortName],[vendor.credit_days,paymentTerm],[vendor.status,status],[vendor.country,b.country],[vendor.state,b.state],[vendor.city,b.city]];
          return tests.every(([actual, expected]) => !String(expected || '').trim() || String(actual || '').toLowerCase().includes(String(expected).trim().toLowerCase()));
        });
        return res.status(200).json(matches);
      }
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
