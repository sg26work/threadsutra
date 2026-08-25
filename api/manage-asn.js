import { find, findOne, insert, update, cors } from './mongo.js';

const TYPE_TEXT = { '1': 'Vendor', '2': 'Customer', '3': 'Other', '4': 'PO', '5': 'Marketplace' };
const STATUS_TEXT = { '1': 'Pending Confirmation', '4': 'Confirmed', '7': 'Cancelled', '15': 'Closed', '17': 'Part received', '20': 'Short Closed' };

function validate(body) {
  const type = String(body.asn_type || '');
  if (!TYPE_TEXT[type]) return 'ASN Type is mandatory';
  if (type === '1' && !String(body.vendor_code || '').trim()) return 'Vendor is mandatory';
  if (type === '2' && !String(body.customer_code || '').trim()) return 'Please Select Customer First';
  if (type === '4' && !String(body.po_no || '').trim()) return 'PO No is Mandatory.';
  if (!Array.isArray(body.lines) || !body.lines.length) return 'No Data Found In The Grid';
  if (body.lines.some((line) => !String(line.sku_code || '').trim() || !Number.isFinite(Number(line.exp_qty)) || Number(line.exp_qty) <= 0)) return 'Expected quantity must be greater than zero.';
  if (String(body.operation || '1') !== '20' && body.lines.some((line) => Number.isFinite(Number(line.pending_qty)) && Number(line.exp_qty) > Number(line.pending_qty))) return 'Exp Qty can not be greater than pending ASN.';
  if (String(body.operation || '') === '20' && !body.lines.some((line) => Number(line.closed_qty || 0) > 0 && String(line.close_reason || '').trim())) return 'Please select atleast one row to Close';
  if (Array.isArray(body.udf) && body.udf.some((value) => String(value ?? '').length > 50)) return 'Each PO UDF value must be 50 characters or fewer.';
  return '';
}

function payload(body, current = {}) {
  const type = String(body.asn_type ?? current.asn_type ?? '');
  const operation = String(body.operation || '1');
  const now = new Date().toISOString();
  return {
    asn_no: current.asn_no || body.asn_no || `ASN${Date.now().toString().slice(-8)}`,
    grn_no: current.grn_no || body.grn_no || '', asn_date: current.asn_date || body.asn_date || now.slice(0, 10),
    asn_type: type, asn_type_text: TYPE_TEXT[type], client_id: body.client_id ?? current.client_id ?? '0',
    vendor_code: body.vendor_code ?? current.vendor_code ?? '', vendor: body.vendor_name ?? current.vendor ?? '',
    customer_code: body.customer_code ?? current.customer_code ?? '', customer_name: body.customer_name ?? current.customer_name ?? '',
    po_no: body.po_no ?? current.po_no ?? '', document_no: body.party_code ?? body.po_no ?? current.document_no ?? '',
    warehouse: body.delivery_location ?? current.warehouse ?? '', ext_asn_no: body.ext_asn_no ?? current.ext_asn_no ?? '',
    remarks: body.remarks ?? current.remarks ?? '', expected_date: body.expected_date ?? current.expected_date ?? '',
    gross_weight: Number(body.gross_weight ?? current.gross_weight ?? 0), tracking_no: body.tracking_no ?? current.tracking_no ?? '',
    challan_no: body.challan_no ?? current.challan_no ?? '', material_received_date: body.material_received_date ?? current.material_received_date ?? '',
    no_of_boxes: Number(body.no_of_boxes ?? current.no_of_boxes ?? 0), invoice_no: body.invoice_no ?? current.invoice_no ?? '',
    invoice_amount: Number(body.invoice_amount ?? current.invoice_amount ?? 0), transporter: body.transporter ?? current.transporter ?? '',
    receipt_validation: body.receipt_validation ?? current.receipt_validation ?? '', reference_no: body.reference_no ?? current.reference_no ?? '',
    lines: body.lines ?? current.lines ?? [], expected_qty: (body.lines ?? current.lines ?? []).reduce((sum, line) => sum + Number(line.exp_qty || 0), 0),
    received_qty: (body.lines ?? current.lines ?? []).reduce((sum, line) => sum + Number(line.rcvd_qty || 0), 0),
    udf: Array.from({ length: 10 }, (_, index) => String((body.udf ?? current.udf ?? [])[index] ?? '').trim()),
    documents: body.documents ?? current.documents ?? [], asn_tags: body.asn_tags ?? current.asn_tags ?? [],
    asn_tag: (body.asn_tags ?? current.asn_tags ?? []).join(','), status_code: operation,
    status: STATUS_TEXT[operation] || current.status || 'Pending Confirmation', row_version: Number(current.row_version || 0) + 1, updated_at: now,
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const row = req.query.id ? await findOne('grn', { id: Number(req.query.id) }) : await findOne('grn', { asn_no: String(req.query.asnNo || '') });
      if (!row) return res.status(404).json({ error: 'ASN not found.' });
      return res.status(200).json(row);
    }
    if (req.method === 'POST') {
      const error = validate(req.body); if (error) return res.status(400).json({ error });
      if (req.body.asn_no && await findOne('grn', { asn_no: req.body.asn_no })) return res.status(409).json({ error: 'ASN No. already exists.' });
      return res.status(201).json(await insert('grn', payload(req.body)));
    }
    if (req.method === 'PUT') {
      const current = await findOne('grn', { id: Number(req.body.id) }); if (!current) return res.status(404).json({ error: 'ASN not found.' });
      if (Number(req.body.row_version || 0) !== Number(current.row_version || 0)) return res.status(409).json({ error: 'ASN was changed by another user. Reload and try again.' });
      const merged = { ...current, ...req.body }; const error = validate(merged); if (error) return res.status(400).json({ error });
      const operation = String(req.body.operation || current.status_code || '1');
      if (operation === '4' && !['1', '4'].includes(String(current.status_code || '1'))) return res.status(409).json({ error: `Cannot confirm ASN in ${current.status} status.` });
      const [saved] = await update('grn', current.id, payload({ ...merged, operation }, current));
      return res.status(200).json(saved);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('Manage ASN API error:', error); return res.status(500).json({ error: error.message || 'Unable to process ASN' }); }
}
