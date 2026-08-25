import { find, findOne, insert, update, cors } from './mongo.js';

async function validateTaxCategory(hsn, currentHsn = '') {
  if (!hsn) return null;
  const category = await findOne('generic_records', { module: 'tax-category', code: hsn });
  if (!category) return 'HSN/SAC Category does not exist';
  if (category.status !== 'Active' && hsn !== currentHsn) return 'Inactive HSN/SAC Category cannot be assigned';
  return null;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await find('skus', {}, { sort: { id: 1 } }));
    }
    if (req.method === 'POST' && req.body?.REQ_SEARCH_FLAG) {
      const b=req.body, text=v=>String(v??'').trim(), has=(v,q)=>!text(q)||text(q)==='-1'||text(v).toLowerCase().includes(text(q).toLowerCase());
      let rows=(await find('skus',{})).filter(r=>has(r.client,b.client)&&has(r.sku_code,b.sku)&&has(r.style,b.style)&&has(r.name,b.skuName)&&has(r.temp_sku_code,b.tempSkuCode)&&has(r.classification,b.classification)&&has(r.size,b.size)&&has(r.color||r.colour,b.color)&&has(r.primary_vendor,b.vendorCode)&&has(r.brand,b.brandCode)&&has(r.hierarchy_code,b.hierarchyCode)&&has(r.attribute_set,b.attributeSet)&&has(r.size_group,b.sizeGroup)&&has(r.status,b.status)&&has(r.created_by,b.createdBy)&&has(r.created_date,b.createdDate)&&has(r.updated_by,b.updatedBy)&&has(r.updated_date,b.updatedDate)&&has(r.back_order,b.backOrder)&&has(r.magento_status,b.magentoStatus));
      const key={sku:'sku_code',style:'style',SKUName:'name'}[b.sidx]||'sku_code';rows.sort((a,c)=>text(a[key]).localeCompare(text(c[key]))*(text(b.sord)==='asc'?1:-1));const size=[50,100,200].includes(Number(b.rows))?Number(b.rows):50,page=Math.max(1,Number(b.page)||1),records=rows.length,total=Math.ceil(records/size),gridModel=rows.slice((page-1)*size,page*size);return res.status(200).json({gridModel,rows:gridModel,page,records,total});
    }
    if (req.method === 'POST') {
      const { sku_code, name, category, brand, uom, mrp, cost_price, hsn, master_sku_code, style, classification, sale_price, sku_mfg_code, primary_vendor, hierarchy_code, attribute_set, back_order } = req.body;
      if (!String(sku_code || '').trim()) return res.status(400).json({ error: 'Please Enter SKU Code' });
      if (!String(name || '').trim()) return res.status(400).json({ error: 'Please Enter SKU Name' });
      if ((await find('skus', {})).some((sku) => sku.sku_code?.toLowerCase() === String(sku_code).trim().toLowerCase())) return res.status(409).json({ error: 'SKU Code already exists' });
      const taxError = await validateTaxCategory(hsn); if (taxError) return res.status(400).json({ error: taxError });
      return res.status(201).json(await insert('skus', { sku_code: String(sku_code).trim(), name, category, brand, uom, mrp, cost_price, hsn, master_sku_code: master_sku_code || '', style: style || '', classification: classification || '', sale_price: Number(sale_price) || 0, sku_mfg_code: sku_mfg_code || '', primary_vendor: primary_vendor || '', hierarchy_code: hierarchy_code || '', attribute_set: attribute_set || '', back_order: back_order || 'No', status: req.body.status || 'Active', created_by: 'local-user', created_date: new Date().toISOString().slice(0, 10), updated_by: '', updated_date: '' }));
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const current = (await find('skus', {})).find((sku) => sku.id === Number(id)); if (!current) return res.status(404).json({ error: 'SKU not found' });
      if ((await find('skus', {})).some((sku) => sku.id !== current.id && sku.sku_code?.toLowerCase() === String(fields.sku_code || '').trim().toLowerCase())) return res.status(409).json({ error: 'SKU Code already exists' });
      const taxError = await validateTaxCategory(fields.hsn, current.hsn); if (taxError) return res.status(400).json({ error: taxError });
      const rows = await update('skus', id, { ...fields, updated_by: 'local-user', updated_date: new Date().toISOString().slice(0, 10) });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      return res.status(409).json({ error: 'SKUs cannot be deleted. Set Status to Inactive instead.' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
