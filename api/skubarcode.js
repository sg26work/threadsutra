import { find, findOne, insert, update, remove, cors } from './mongo.js';

// SKU Barcode (Master > Sku Management > SKU Bar Code Create/Edit)
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('sku_barcode', {}, { sort: { id: -1 } }));
    }
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const b=req.body,text=v=>String(v??'').trim(),has=(v,q)=>!text(q)||text(q)==='-1'||text(v).toLowerCase().includes(text(q).toLowerCase());let rows=(await find('sku_barcode',{})).filter(r=>has(r.client,b.client)&&has(r.sku_code,b.skuCode)&&has(r.sku_name,b.skuName)&&has(r.sku_barcode,b.skuBarcode)&&has(r.uom,b.uom)&&has(r.barcode_type,b.barcodeType)&&has(r.is_active,b.isActive)&&has(r.is_default,b.isDefault));rows.sort((a,c)=>text(a.sku_code).localeCompare(text(c.sku_code))*(text(b.sord)==='asc'?1:-1));const size=[20,50,100,200].includes(Number(b.rows))?Number(b.rows):20,page=Math.max(1,Number(b.page)||1),records=rows.length,total=Math.ceil(records/size),gridModel=rows.slice((page-1)*size,page*size);return res.status(200).json({gridModel,rows:gridModel,page,records,total});
    }
    if (req.method === 'POST') {
      const b = req.body;
      const sku = await findOne('skus', { sku_code: b.sku_code });
      if (!sku) return res.status(400).json({ error: 'SKU Code does not exist in Master SKU' });
      if (!String(b.sku_barcode || '').trim()) return res.status(400).json({ error: 'SKU Barcode is required' });
      if (await findOne('sku_barcode', { sku_barcode: String(b.sku_barcode).trim() })) return res.status(409).json({ error: 'SKU Barcode already exists' });
      const doc = await insert('sku_barcode', {
        sku_code: b.sku_code, sku_name: b.sku_name || sku.name || '', sku_barcode: String(b.sku_barcode).trim(),
        uom: b.uom || 'Each', barcode_type: b.barcode_type || 'EAN-13',
        is_active: b.is_active || 'Active', is_default: b.is_default || 'Yes',
        modified_date: b.modified_date || new Date().toISOString().slice(0, 10),
        case_size: Number(b.case_size) || 1, sale_price: Number(b.sale_price) || 0,
        is_purchasable: b.is_purchasable || 'Yes', is_saleable: b.is_saleable || 'Yes', client: b.client || '0-DummyClient', additional_uom: b.additional_uom || '', length: Number(b.length)||0, breath: Number(b.breath)||0, height: Number(b.height)||0, weight: Number(b.weight)||0, cube: Number(b.cube)||0, primary_vendor: b.primary_vendor||'', vendor: b.vendor||'', cost: Number(b.cost)||0,
      });
      return res.status(201).json(doc);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const rows = await update('sku_barcode', id, fields);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      return res.status(200).json(await remove('sku_barcode', id));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('skubarcode error:', err); res.status(500).json({ error: err.message }); }
}
