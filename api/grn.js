import { find, findOne, insert, update, remove, updateWhere, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('grn', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST') {
      const { grn_no, po_no, vendor, warehouse, grn_date, received_qty, status, asn_no, ext_asn_no, asn_date, asn_type, document_no, invoice_no, asn_tag } = req.body;
      const reference = asn_no || grn_no;
      const asnDate = asn_date || grn_date;
      if (!reference && !asnDate) return res.status(400).json({ error: 'Either ASN No. or ASN Date is mandatory.' });
      if (!asn_type) return res.status(400).json({ error: 'Please select ASN Type.' });
      if (reference && await findOne('grn', { asn_no: reference })) return res.status(409).json({ error: 'ASN No. already exists.' });
      const doc = await insert('grn', {
        grn_no: grn_no || reference, po_no, vendor, warehouse, grn_date: grn_date || asnDate, received_qty,
        asn_no: reference, ext_asn_no: ext_asn_no || '', asn_date: asnDate, asn_type, document_no: document_no || po_no || '',
        invoice_no: invoice_no || '', asn_tag: asn_tag || '', status: status || 'Pending Confirmation',
      });
      if (po_no && doc.status === 'Received') await updateWhere('purchase_orders', { po_no }, { status: 'Received' });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const current = await findOne('grn', { id: Number(id) });
      if (!current) return res.status(404).json({ error: 'ASN not found.' });
      const rows = await update('grn', id, fields);
      if (fields.status === 'Received' && current.po_no) await updateWhere('purchase_orders', { po_no: current.po_no }, { status: 'Received' });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('grn', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
