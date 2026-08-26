import { find, findOne, insert, update, remove, cors } from './mongo.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      if (String(req.query?.meta) === 'true') {
        const [products, partners] = await Promise.all([find('products'), find('partners')]);
        return res.status(200).json({
          pageSizes: [20, 50, 100, 200],
          buckets: [['10', 'Good'], ['20', 'Damaged'], ['30', 'Hold']],
          zones: [['-1', '--- Select ---'], ['PICK', 'PICK'], ['STORAGE', 'STORAGE']],
          locations: [['UWH', 'UWH-JX Karawaci']],
          imeiStatuses: [['-1', '--- Select ---'], ['1', 'In Stock'], ['2', 'Out']],
          usnStatuses: [['-1', '--- Select ---'], ['1', 'Available'], ['2', 'Consumed']],
          channels: [['-1', '--- Select ---'], ['AMAZON_IN', 'Amazon IN'], ['FLIPKART', 'Flipkart']],
          inventoryTypes: [['-1', '--- Select ---'], ['FG', 'Finished Good'], ['RM', 'Raw Material']],
          products: products.map(x => ({ id: x.id, code: x.sku_code, name: x.product_name || x.sku_name, barcode: x.barcode || x.primary_upc || '', hierarchy: x.category || x.department || '', brand: x.brand || '' })),
          vendors: partners.filter(x => x.partner_type === 'Vendor').map(x => ({ id: x.id, code: x.vendor_code || String(x.id), name: x.name })),
        });
      }
      const { warehouse } = req.query;
      const q = warehouse ? { warehouse } : {};
      return res.status(200).json(await find('inventory', q, { sort: { id: 1 } }));
    }
    if (req.method === 'POST') {
      if (req.body?.action === 'search' || req.body?.REQ_SEARCH_FLAG) {
        const b = req.body || {}, tab = b.tab || 'sku', term = v => String(v ?? '').trim().toLowerCase();
        const has = (v, q) => !term(q) || term(v).includes(term(q));
        const source = await find('inventory');
        let items = source.filter(x => has(x.sku_code, b.skuCode) && has(x.name, b.skuDesc) && has(x.bin, b.binCode) && has(x.warehouse, b.siteCode) && has(x.lot_no, b.lotCode) && has(x.imei, b.imei) && has(x.unique_no, b.uniqueNo) && has(x.vendor_code, b.vendorCode));
        const map = x => ({
          id: x.id, skuCode: x.sku_code || '', style: x.style || '', mfgSkuCode: x.mfg_sku_code || '', hierarchyCode: x.hierarchy_code || '', size: x.size || '', zone: x.zone || '', bin: x.bin || '', lotNo: x.lot_no || '', invBucket: x.inv_bucket || 'Good', totalQty: Number(x.on_hand || 0), availableQty: Number(x.available || 0), commitedQty: Number(x.reserved || 0), pickedQty: Number(x.picked || 0), transitQty: Number(x.transit || 0), openQty: Number(x.open_qty || 0), brandCode: x.brand_code || '', vendorCode: x.vendor_code || '', siteLocation: x.warehouse || '', onHold: Number(x.on_hold || 0), wac: Number(x.wac || 0), primaryUpc: x.barcode || x.primary_upc || '', blockedQty: Number(x.blocked || 0), mrp: Number(x.mrp || 0), expiryDate: x.expiry_date || '', mfgDate: x.mfg_date || '', lottable04: x.lottable04 || '', batchNo: x.batch_no || '', lottable06: x.lottable06 || '', lottable07: x.lottable07 || '', imei: x.imei || '', status: x.status || 'In Stock', inTransactionDate: x.in_transaction_date || '', outTransactionDate: x.out_transaction_date || '', inTransactionNo: x.in_transaction_no || '', outTransactionNo: x.out_transaction_no || '', uniqueNo: x.unique_no || '', extUniqueNo: x.ext_unique_no || '', subStatus: x.sub_status || '', inDate: x.in_date || '', inReferenceNo: x.in_reference_no || '', outDate: x.out_date || '', outReferenceNo: x.out_reference_no || '', channelSkuCode: x.channel_sku_code || '', remarks: x.remarks || '', lastUpdateDate: x.modified_date || '', inventory: Number(x.available || 0), inventoryType: x.inventory_type || 'FG', tab,
        });
        items = items.map(map);
        const rows = [20, 50, 100, 200].includes(+b.rows) ? +b.rows : 20, page = Math.max(1, +b.page || 1), records = items.length, total = Math.ceil(records / rows);
        return res.status(200).json({ rows: items.slice((page - 1) * rows, page * rows), page, total, records, sidx: b.sidx || 'sku', sord: b.sord || 'desc' });
      }
      const { sku_code, name, warehouse, bin, available, reserved, on_hand } = req.body;
      return res.status(201).json(await insert('inventory', { sku_code, name, warehouse, bin, available, reserved, on_hand }));
    }
    if (req.method === 'PUT') {
      const { id, adjustment, ...fields } = req.body;
      if (adjustment !== undefined) {
        const row = await findOne('inventory', { id });
        const newAvail = (row.available || 0) + Number(adjustment);
        const newOnHand = (row.on_hand || 0) + Number(adjustment);
        const rows = await update('inventory', id, { available: newAvail, on_hand: newOnHand });
        return res.status(200).json(rows[0]);
      }
      const rows = await update('inventory', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('inventory', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
