import { cors, find, findOne, insert, update } from './mongo.js';
import { COD_TRANSPORTERS } from './cod-reconciliation-transporters.js';

const text = (value) => String(value ?? '').trim();
const money = (value) => Number(value || 0).toFixed(2);
const has = (value, query) => !text(query) || text(value).toLowerCase().includes(text(query).toLowerCase());
const transporterName = (code) => {
  const label = COD_TRANSPORTERS.find((item) => item.value === text(code))?.label || text(code);
  return label.replace(/\s*-\s*[^-]+$/, '').trim();
};
const normalize = (row) => ({
  ...row,
  orderNo: row.ext_order_no || row.order_no || '',
  delNo: row.delivery_no || row.shipment_no || `DEL-${row.id}`,
  shipDate: row.ship_date || row.order_date || '',
  trackingNo: row.tracking_no || row.awb_no || '',
  transporterName: row.transporter_name || row.transporter || 'Delhivery',
  collectableAmount: money(row.collectable_amount ?? row.cod_amount ?? row.order_amount ?? row.amount),
  isReconcile: row.payment_reconciled === true || row.payment_reconciled === 'Yes' ? 'Yes' : 'No',
  collectedAmount: money(row.collected_amount),
  settledamtCash: money(row.cash),
  settledamtCC: money(row.credit_card),
  settledamtCoupon: money(row.coupon),
  recievedAmount: money(row.received_amount),
  status: row.status || '',
  orderSource: row.source || row.order_source || '',
});
const page = (rows, body) => {
  const size = [20, 50, 100, 200].includes(Number(body.rows)) ? Number(body.rows) : 20;
  const current = Math.max(1, Number(body.page) || 1), records = rows.length, total = Math.ceil(records / size);
  const gridModel = rows.slice((current - 1) * size, current * size);
  return { gridModel, rows: gridModel, page: current, records, total };
};

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json({ transporters: COD_TRANSPORTERS, reconciliation: [{ value: '-1', label: '--- Select ---' }, { value: '0', label: 'No' }, { value: '1', label: 'Yes' }], pageSizes: [20, 50, 100, 200], maxImportLines: 500 });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    if (body.action === 'export') {
      if (!Number(body.gridDataLen || body.rows?.length)) return res.status(400).json({ error: 'No Data In Grid To Export' });
      const reportId = `COD-${Date.now()}`;
      await insert('generic_records', { module: 'pending-report', code: reportId, name: 'COD Reconciliation', status: 'Pending', search_data: body.filters || {}, created_date: new Date().toISOString() });
      return res.status(200).json({ jsonMessage: null, reportId });
    }
    if (body.action === 'import') {
      const lines = text(body.cODReconciliationImport).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return res.status(400).json({ error: 'Nothing To Import' });
      if (lines.length > 500) return res.status(400).json({ error: 'Maximum 500 records can be imported at a time' });
      const orders = await find('sale_orders', {}), successFailList = [];
      for (const line of lines) {
        const [trackingNo, cash, cc, coupon] = line.split(',').map((item) => item.trim());
        const source = orders.find((row) => text(row.tracking_no || row.awb_no).toLowerCase() === text(trackingNo).toLowerCase());
        if (!source || (!Number(cash) && !Number(cc) && !Number(coupon))) { successFailList.push({ trackingNo, fail: true, importStatus: 'Invalid Data' }); continue; }
        const received = Number(cash || 0) + Number(cc || 0) + Number(coupon || 0);
        await update('sale_orders', source.id, { cash: Number(cash || 0), credit_card: Number(cc || 0), coupon: Number(coupon || 0), collected_amount: received, received_amount: received });
        successFailList.push({ ...normalize({ ...source, cash, credit_card: cc, coupon, collected_amount: received, received_amount: received }), fail: false });
      }
      return res.status(200).json({ jsonMessage: null, successFailList });
    }
    if (body.action === 'reconcile' || body.action === 'force-reconcile') {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ error: 'Please Select Record For Process.' });
      const successFailList = [];
      for (const item of items) {
        const source = await findOne('sale_orders', { id: Number(item.id) });
        if (!source) continue;
        const cash = Number(item.settledamtCash || 0), cc = Number(item.settledamtCC || 0), coupon = Number(item.settledamtCoupon || 0), received = cash + cc + coupon;
        const forced = body.action === 'force-reconcile', reconciled = forced || received >= Number(normalize(source).collectableAmount);
        await update('sale_orders', source.id, { cash, credit_card: cc, coupon, collected_amount: received, received_amount: received, payment_reconciled: reconciled, reconciliation_type: forced ? 'ForceReconcile' : 'Reconcile', reconciled_at: reconciled ? new Date().toISOString() : null });
        successFailList.push({ ...normalize({ ...source, cash, credit_card: cc, coupon, collected_amount: received, received_amount: received, payment_reconciled: reconciled }), flag: forced ? 'ForceReconcile' : 'Reconcile' });
      }
      return res.status(200).json({ jsonMessage: null, successFailList });
    }
    if (!body.REQ_SEARCH_FLAG) return res.status(400).json({ error: 'REQ_SEARCH_FLAG is required' });
    if (!text(body.transporterName) || text(body.transporterName) === '-1') return res.status(400).json({ error: 'Please select transporter' });
    const selectedTransporter = transporterName(body.transporterName);
    let rows = (await find('sale_orders', {})).map(normalize).filter((row) => has(row.orderNo, body.orderNo) && has(row.trackingNo, body.trackingNo) && has(row.transporterName, selectedTransporter));
    if (text(body.isReconcile) === '0') rows = rows.filter((row) => row.isReconcile === 'No');
    if (text(body.isReconcile) === '1') rows = rows.filter((row) => row.isReconcile === 'Yes');
    rows.sort((a, b) => text(a.orderNo).localeCompare(text(b.orderNo)) * (text(body.sord) === 'desc' ? -1 : 1));
    return res.status(200).json(page(rows, body));
  } catch (error) { console.error('cod reconciliation error:', error); return res.status(500).json({ error: error.message }); }
}
