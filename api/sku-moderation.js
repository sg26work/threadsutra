import ExcelJS from 'exceljs';
import { cors, find, findOne, insert, update } from './mongo.js';
import { SKU_MODERATION_CHANNELS } from './sku-moderation-channels.js';

const text = (value) => String(value ?? '').trim();
const has = (value, query) => !text(query) || text(value).toLowerCase().includes(text(query).toLowerCase());
const normalize = (row) => ({
  ...row,
  image: row.image || 'images/no_image.png',
  skuName: row.sku_name || row.sku_description || row.channel_sku_name || '',
  locCode: row.channel || row.channel_name || row.channel_code || '',
  channelCode: row.channel_code || '',
  channelImage: row.channel_image || '',
  channelSkuCode: row.seller_sku || row.channel_sku_code || '',
  eRetailSku: row.eretail_sku || row.sku_code || '',
  channelProductId: row.product_id || row.channel_product_id || '',
  channelPrice: row.pricing ?? row.channel_price ?? '',
  mrp: row.mrp ?? '', size: row.size || '', color: row.color || '',
  actionCode: Number(row.action_code ?? 0),
});
const page = (rows, body) => {
  const size = [50, 100, 200].includes(Number(body.rows)) ? Number(body.rows) : 50;
  const current = Math.max(1, Number(body.page) || 1), records = rows.length;
  return { gridModel: rows.slice((current - 1) * size, current * size), rows: rows.slice((current - 1) * size, current * size), page: current, records, total: Math.ceil(records / size) };
};

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET' && req.query?.template === '1') {
      const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('SKU Moderation Link');
      sheet.addRow(['SKU Code', 'Channel SKU Code', 'Product ID', 'Channel']);
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Sku_Mod_Link_Import.xlsx"');
      return res.status(200).send(Buffer.from(buffer));
    }
    if (req.method === 'GET' && req.query?.meta === '1') {
      return res.status(200).json({ channels: SKU_MODERATION_CHANNELS, pageSizes: [50, 100, 200], maxImportRows: 5000 });
    }
    if (req.method === 'GET') {
      const query = text(req.query?.q);
      if (query.length <= 2) return res.status(200).json([]);
      const rows = (await find('skus')).filter((row) => has(row.sku_code, query) || has(row.description || row.sku_description || row.name, query)).slice(0, 50);
      return res.status(200).json(rows.map((row) => ({ id: row.id, sku_code: row.sku_code, description: row.description || row.sku_description || row.name || '', image: row.image || 'images/no_image.png' })));
    }
    if (req.method === 'POST' && req.body?.action === 'import') {
      const body = req.body, imported = Array.isArray(body.rows) ? body.rows : [];
      if (!text(body.fileName)) return res.status(400).json({ error: 'No file chosen to import.' });
      if (imported.length > 5000) return res.status(400).json({ error: 'Max 5000 lines are allowed at a time.' });
      const links = await find('sku_channel_links'), skus = await find('skus');
      const results = [];
      for (let index = 0; index < imported.length; index++) {
        const raw = imported[index], skuCode = text(raw['SKU Code'] || raw.skuCode), channelSkuCode = text(raw['Channel SKU Code'] || raw.channelSkuCode), productId = text(raw['Product ID'] || raw.productId), channel = text(raw.Channel || raw.channel);
        let remarks = '';
        if (!skuCode || !skus.some((row) => text(row.sku_code) === skuCode)) remarks = 'Invalid SKU Code';
        else if (!channelSkuCode) remarks = 'Channel SKU Code is mandatory';
        else if (!channel || !SKU_MODERATION_CHANNELS.some((row) => [row.value, row.label].includes(channel))) remarks = 'Invalid Channel';
        const target = links.find((row) => text(row.seller_sku || row.channel_sku_code) === channelSkuCode && (!productId || text(row.product_id || row.channel_product_id) === productId));
        if (!remarks && !target) remarks = 'Unmapped SKU was not found.';
        if (!remarks) await update('sku_channel_links', target.id, { sku_code: skuCode, eretail_sku: skuCode, action_code: 0, linked_at: new Date().toISOString(), updated_by: 'super admin' });
        results.push({ sq: index + 1, skuCode, channelSkuCode, channelProductId: productId, locCode: channel, remarks, gridSts: remarks ? 1 : 0 });
      }
      const batchId = `SKUMOD${Date.now()}`;
      await insert('generic_records', { module: 'sku-moderation-import', code: batchId, name: text(body.fileName), batch_id: batchId, results, created_date: new Date().toISOString() });
      return res.status(200).json({ batchIdImport: batchId, importDTO: { dtoList: results, totalItems: results.length, successItems: results.filter((row) => !row.remarks).length, failedItems: results.filter((row) => row.remarks).length, inProcessItems: 0 } });
    }
    if (req.method === 'POST' && Object.prototype.hasOwnProperty.call(req.body || {}, 'REQ_SEARCH_FLAG')) {
      const body = req.body, linked = String(body.linkedUnlinkedFlag) === '1';
      let rows = (await find('sku_channel_links')).map(normalize).filter((row) => linked ? !!text(row.eRetailSku) : !text(row.eRetailSku));
      rows = rows.filter((row) => has(row.locCode, body.locCode) && has(row.skuName, body.skuName) && has(row.channelSkuCode, body.channelSkuCode) && has(row.channelProductId, body.channelProductId));
      rows.sort((a, b) => text(a.skuName).localeCompare(text(b.skuName)) * (text(body.sord) === 'asc' ? 1 : -1));
      return res.status(200).json({ ...page(rows, body), linkedUnlinkedFlag: linked ? 1 : 0, doFetchCount: body.doFetchCount === true });
    }
    if (req.method === 'PUT') {
      const body = req.body || {}, linkedSkuCode = text(body.linkedSkuCode);
      if (!linkedSkuCode) return res.status(400).json({ error: 'Search SKU to link.' });
      if (!await findOne('skus', { sku_code: linkedSkuCode })) return res.status(400).json({ error: 'Selected eRetail SKU does not exist.' });
      const links = await find('sku_channel_links');
      const target = body.id ? links.find((row) => row.id === Number(body.id)) : links.find((row) => text(row.seller_sku || row.channel_sku_code) === text(body.chnlSkuCode) && text(row.product_id || row.channel_product_id) === text(body.channelProductId));
      if (!target) return res.status(404).json({ error: 'Unmapped SKU was not found.' });
      const changed = await update('sku_channel_links', target.id, { sku_code: linkedSkuCode, eretail_sku: linkedSkuCode, action_code: Number(body.actionCode || 0), linked_at: new Date().toISOString(), updated_by: 'super admin' });
      return res.status(200).json({ row: normalize(changed[0]), jsonMessage: null, message: 'Data saved successfully.' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('sku moderation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
