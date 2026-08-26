import { find, findOne, insert, update, cors } from './mongo.js';
const text = (value) => String(value ?? '').trim();
const has = (value, query) => !text(query) || text(value).toLowerCase().includes(text(query).toLowerCase());
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await find('sku_channel_links', {}, { sort: { id: -1 } }));
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const b = req.body;
      if (!text(b.channelCode) && !text(b.skuCode) && !text(b.channelSkuCode) && !text(b.channelProductId) && !text(b.clientId) && !text(b.channelType)) return res.status(400).json({ error: 'Please select any one filter.' });
      const filtered = (await find('sku_channel_links', {}, { sort: { id: 1 } })).filter((row) => has(row.sku_code, b.skuCode) && has(row.sku_description, b.skuDescription) && has(row.channel_sku_code, b.channelSkuCode) && has(row.channel_code, b.channelCode) && has(row.channel_product_id, b.channelProductId) && has(row.channel_type, b.channelType) && (!text(b.status) || row.status === b.status));
      const size = [20,50,100,200].includes(Number(b.rows)) ? Number(b.rows) : 20; const page = Math.max(1, Number(b.page) || 1); const records = filtered.length; const total = Math.ceil(records / size); const gridModel = filtered.slice((page - 1) * size, page * size);
      return res.status(200).json({ gridModel, rows: gridModel, page, records, total, sidx: text(b.sidx), sord: text(b.sord || 'asc') });
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!text(b.channel_code)) return res.status(400).json({ error: 'Channel is Mandatory.' });
      if (!text(b.sku_code)) return res.status(400).json({ error: 'ERetail Sku is Mandatory.' });
      if (!text(b.channel_sku_code)) return res.status(400).json({ error: 'channelSkuCode is Mandatory.' });
      if (!text(b.status)) return res.status(400).json({ error: 'Status is Mandatory.' });
      if (!await findOne('skus', { sku_code: text(b.sku_code) })) return res.status(400).json({ error: 'Eretail SKU does not exist in SKU Master.' });
      if ((await find('sku_channel_links')).some((row) => row.channel_code === b.channel_code && row.channel_sku_code === b.channel_sku_code)) return res.status(409).json({ error: 'Channel SKU is already linked for this channel.' });
      return res.status(201).json(await insert('sku_channel_links', { ...b, client_id: b.client_id ?? '0', channel_price: Number(b.channel_price || 0), back_order_qty: Number(b.back_order_qty || 0), maximum_sku_qty: Number(b.maximum_sku_qty || 0), status: b.status, updated_by: 'super admin', updated_date: new Date().toISOString() }));
    }
    if (req.method === 'PUT') { const { id, ...fields } = req.body; const changed = await update('sku_channel_links', Number(id), { ...fields, updated_by: 'super admin', updated_date: new Date().toISOString() }); return res.status(200).json(changed[0]); }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) { console.error('SKU channel links error:', error); return res.status(500).json({ error: error.message }); }
}
