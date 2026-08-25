import { cors, find, findOne, update } from './mongo.js';
const text = (value) => String(value ?? '').trim();
const has = (value, query) => !text(query) || text(query) === '-1' || text(value).toLowerCase().includes(text(query).toLowerCase());
const normalize = (row) => ({
  ...row,
  sku_name: row.sku_name || row.sku_description || row.channel_sku_name || '',
  channel: row.channel || row.channel_name || row.channel_code || '',
  seller_sku: row.seller_sku || row.channel_sku_code || '',
  eretail_sku: row.eretail_sku || row.sku_code || '',
  product_id: row.product_id || row.channel_product_id || '',
  pricing: row.pricing ?? row.channel_price ?? '',
  mrp: row.mrp ?? '',
  other_info: row.other_info || [row.size, row.color].filter(Boolean).join(' / '),
  created_date: row.created_date || row.created_at || '',
  channel_status: row.channel_status || row.status || 'Active',
});
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      const query = text(req.query?.q);
      const rows = (await find('skus', {})).filter((row) => has(row.sku_code, query) || has(row.description || row.sku_description, query)).slice(0, 50);
      return res.status(200).json(rows.map((row) => ({ id: row.id, sku_code: row.sku_code, description: row.description || row.sku_description || '', image: row.image || '' })));
    }
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const body = req.body;
      let rows = (await find('sku_channel_links', {})).map(normalize).filter((row) => !text(row.eretail_sku));
      rows = rows.filter((row) => has(row.client_id ?? '0', body.clientId) && has(row.channel, body.locCode || body.channel) && has(row.sku_name, body.skuName || body.sku_name) && has(row.seller_sku, body.channelSkuCodeUnmappedSku || body.seller_sku) && has(row.pricing, body.channelPrice || body.pricing) && has(row.product_id, body.channelProductIdUnmappedSku || body.product_id) && has(row.channel_status, body.SearchChannelStatus));
      const direction = text(body.sord) === 'asc' ? 1 : -1;
      rows.sort((a, b) => text(a.created_date).localeCompare(text(b.created_date)) * direction);
      const size = [20, 50, 100, 200].includes(Number(body.rows)) ? Number(body.rows) : 20;
      const page = Math.max(1, Number(body.page) || 1), records = rows.length, total = Math.ceil(records / size), gridModel = rows.slice((page - 1) * size, page * size);
      return res.status(200).json({ gridModel, rows: gridModel, page, records, total, linkedUnlinkedFlag: '0', doFetchCount: body.doFetchCount === true });
    }
    if (req.method === 'PUT') {
      const id = Number(req.body?.id), linkedSkuCode = text(req.body?.linkedSkuCode);
      if (!id || !linkedSkuCode) return res.status(400).json({ error: 'Search SKU to link.' });
      const target = await findOne('sku_channel_links', { id });
      if (!target) return res.status(404).json({ error: 'Unmapped SKU was not found.' });
      if (!await findOne('skus', { sku_code: linkedSkuCode })) return res.status(400).json({ error: 'Selected eRetail SKU does not exist.' });
      const changed = await update('sku_channel_links', id, { sku_code: linkedSkuCode, eretail_sku: linkedSkuCode, linked_at: new Date().toISOString(), updated_by: 'super admin' });
      return res.status(200).json({ row: changed[0], message: 'Data saved successfully.' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('sku moderation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
