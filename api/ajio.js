import { find, findOne, insert, update, cors } from './mongo.js';

const collections = {
  config: 'ajio_config', mappings: 'ajio_sku_mappings', backorders: 'ajio_backorders',
  orders: 'ajio_orders', deliveries: 'ajio_deliveries', invoices: 'ajio_invoices', manifests: 'ajio_manifests',
};
const text = (value) => String(value ?? '').trim();
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const code = (prefix) => `${prefix}${Date.now().toString().slice(-8)}`;

async function getConfig() {
  return (await find('ajio_config'))[0];
}

async function reserveBackorders(ids) {
  const config = await getConfig();
  if (!config?.fetch_backorder) fail('FetchBackorder configuration is disabled.', 409);
  if (!config?.order_sync) fail('Order Sync is disabled. Order pull, invoice, shipping label and manifest generation are unavailable.', 409);
  const rows = (await find('ajio_backorders')).filter((row) => (!ids?.length || ids.includes(row.id)) && row.status === 'Pending Pull');
  if (!rows.length) fail('No pending AJIO order pendency is available to pull.', 404);
  const mappings = await find('ajio_sku_mappings');
  const inventory = await find('inventory');
  for (const row of rows) {
    for (const line of row.lines) {
      const mapped = mappings.find((item) => item.sku_code === line.sku_code && item.mapping_status === 'Mapped');
      if (!mapped) fail(`AJIO article for ${line.sku_code} must be mapped before reservation.`, 409);
      const stock = inventory.find((item) => item.sku_code === line.sku_code && item.warehouse === row.warehouse);
      if (!stock || Number(stock.available) < Number(line.qty)) fail(`Insufficient positive inventory for ${line.sku_code}.`, 409);
    }
  }
  for (const row of rows) {
    for (const line of row.lines) {
      const stock = inventory.find((item) => item.sku_code === line.sku_code && item.warehouse === row.warehouse);
      await update('inventory', stock.id, { available: Number(stock.available) - Number(line.qty), reserved: Number(stock.reserved || 0) + Number(line.qty) });
      stock.available -= Number(line.qty); stock.reserved = Number(stock.reserved || 0) + Number(line.qty);
    }
    await update('ajio_backorders', row.id, { status: 'Reserved', reservation_status: 'Inventory Reserved', pulled_at: now() });
  }
  return rows.length;
}

async function releasePo(id) {
  const config = await getConfig();
  if (!config?.order_sync) fail('Order Sync is disabled. AJIO orders cannot be created.', 409);
  const source = await findOne('ajio_backorders', { id: Number(id) });
  if (!source) fail('AJIO PO pendency was not found.', 404);
  if (source.status !== 'Reserved' || source.released) fail('Only a reserved, unreleased AJIO PO can create an order.', 409);
  const skus = await find('skus');
  const lines = source.lines.map((line) => {
    const sku = skus.find((item) => item.sku_code === line.sku_code) || {};
    return { sku_code: line.sku_code, sku_name: sku.name || line.sku_code, qty: Number(line.qty), unit_price: Number(sku.mrp || 0) };
  });
  const salesOrderNo = code('SO-AJIO-');
  const order = await insert('ajio_orders', {
    ajio_po_no: source.ajio_po_no, sales_order_no: salesOrderNo, customer: 'AJIO JIT', warehouse: source.warehouse,
    order_date: today(), status: 'Allocated', picklist_no: '', delivery_ids: [], lines,
  });
  const amount = lines.reduce((sum, line) => sum + line.qty * line.unit_price, 0);
  await insert('sale_orders', { order_no: salesOrderNo, external_order_no: source.ajio_po_no, channel: 'AJIO', customer: 'AJIO JIT', city: '', order_date: today(), items: lines.length, qty: lines.reduce((sum, line) => sum + line.qty, 0), amount, status: 'Confirmed', payment_mode: 'B2B JIT' });
  for (const line of lines) {
    await insert('fulfillment_orders', { order_no: salesOrderNo, external_order_no: source.ajio_po_no, ajio_order_id: order.id, channel: 'AJIO', customer: 'AJIO JIT', city: '', warehouse: source.warehouse, order_date: today(), sku_code: line.sku_code, sku_name: line.sku_name, qty: line.qty, amount: line.qty * line.unit_price, payment_mode: 'B2B JIT', status: 'Allocated', priority: 'High', acknowledged: true });
  }
  await update('ajio_backorders', source.id, { released: true, status: 'Order Created', sales_order_no: salesOrderNo, released_at: now() });
  return order;
}

async function generatePicklist(orderIds) {
  const config = await getConfig();
  if (!config?.scan_lpn_on_picking || !config?.lpn_reuse_after_ship) fail('Scan LPN on Picking and LPN reuse after ship must both be enabled.', 409);
  const orders = (await find('ajio_orders')).filter((row) => orderIds.includes(row.id));
  if (!orders.length || orders.length !== orderIds.length) fail('Select valid AJIO orders.', 400);
  if (orders.some((row) => row.status !== 'Allocated')) fail('Only Allocated AJIO orders can be added to a picklist.', 409);
  const inventory = await find('inventory');
  for (const order of orders) for (const line of order.lines) {
    const stock = inventory.find((item) => item.sku_code === line.sku_code && item.warehouse === order.warehouse);
    if (!stock || Number(stock.available) + Number(stock.reserved || 0) <= 0) fail(`Picklist cannot include ${line.sku_code} without positive inventory.`, 409);
  }
  const picklistNo = code('PL-AJIO-');
  await insert('picklists', { picklist_no: picklistNo, warehouse: orders[0].warehouse, order_count: orders.length, sku_count: new Set(orders.flatMap((row) => row.lines.map((line) => line.sku_code))).size, total_qty: orders.flatMap((row) => row.lines).reduce((sum, line) => sum + Number(line.qty), 0), pick_mode: 'Pick by Order', status: 'Open', created_date: today(), picker: 'Unassigned', channel: 'AJIO' });
  const deliveries = [];
  for (const order of orders) {
    const delivery = await insert('ajio_deliveries', {
      delivery_no: code('UW') + order.id, ajio_po_no: order.ajio_po_no, sales_order_no: order.sales_order_no,
      order_id: order.id, picklist_no: picklistNo, warehouse: order.warehouse, status: 'Pending', split_from: '',
      lines: order.lines.map((line) => ({ ...line, picked_qty: 0 })), boxes: [], invoice_no: '', master_awb: '', child_awbs: [],
      label_prefetch_status: config.prepack_enabled ? 'Pending Prefetch' : 'Not Enabled', ready_to_ship: false,
    });
    deliveries.push(delivery);
    await update('ajio_orders', order.id, { status: 'Picklist Created', picklist_no: picklistNo, delivery_ids: [delivery.id] });
  }
  return { picklist_no: picklistNo, deliveries };
}

async function scanItem(body) {
  const config = await getConfig();
  if (!config?.scan_lpn_on_picking) fail('Scan LPN on Picking is disabled.', 409);
  const delivery = await findOne('ajio_deliveries', { id: Number(body.delivery_id) });
  if (!delivery) fail('Delivery was not found.', 404);
  if (!['Pending', 'Processing'].includes(delivery.status)) fail('Only a pending or processing delivery can be scanned.', 409);
  const lpn = text(body.lpn); const skuCode = text(body.sku_code); const qty = Number(body.qty);
  if (!lpn || !skuCode || !Number.isInteger(qty) || qty <= 0) fail('Box ID, SKU and a positive whole quantity are required.');
  const deliveries = await find('ajio_deliveries');
  const other = deliveries.find((row) => row.id !== delivery.id && row.boxes?.some((box) => box.lpn === lpn) && !(config.lpn_reuse_after_ship && row.status === 'Shipped'));
  if (other) fail(`Box ID ${lpn} belongs to another shipment and cannot be reused.`, 409);
  const line = delivery.lines.find((item) => item.sku_code === skuCode);
  if (!line) fail('The scanned item does not belong to this shipment.', 409);
  const remaining = Number(line.qty) - Number(line.picked_qty || 0);
  if (qty > remaining) fail(`Scan quantity exceeds the pending quantity of ${remaining}.`, 409);
  const boxes = structuredClone(delivery.boxes || []);
  let box = boxes.find((item) => item.lpn === lpn);
  if (box?.status === 'Closed') fail('A closed box cannot be modified.', 409);
  if (!box) { box = { lpn, status: 'Open', items: [] }; boxes.push(box); }
  const item = box.items.find((entry) => entry.sku_code === skuCode);
  if (item) item.qty += qty; else box.items.push({ sku_code: skuCode, qty });
  const lines = delivery.lines.map((item) => item.sku_code === skuCode ? { ...item, picked_qty: Number(item.picked_qty || 0) + qty } : item);
  const complete = lines.every((item) => Number(item.picked_qty) === Number(item.qty));
  return (await update('ajio_deliveries', delivery.id, { boxes, lines, status: complete ? 'Picked' : 'Processing', updated_at: now() }))[0];
}

async function closeBox(body) {
  const delivery = await findOne('ajio_deliveries', { id: Number(body.delivery_id) });
  if (!delivery) fail('Delivery was not found.', 404);
  const boxes = structuredClone(delivery.boxes || []); const box = boxes.find((item) => item.lpn === text(body.lpn));
  if (!box) fail('Scan the Box ID before closing it.', 404);
  if (box.status === 'Closed') fail('The box is already closed.', 409);
  if (!box.items.length) fail('An empty box cannot be closed.', 409);
  box.status = 'Closed'; box.closed_at = now();
  return (await update('ajio_deliveries', delivery.id, { boxes, updated_at: now() }))[0];
}

async function splitDelivery(id) {
  const delivery = await findOne('ajio_deliveries', { id: Number(id) });
  if (!delivery) fail('Delivery was not found.', 404);
  if (delivery.status !== 'Processing') fail('Delivery Split is available only after partial picking.', 409);
  const remaining = delivery.lines.map((line) => ({ ...line, qty: Number(line.qty) - Number(line.picked_qty || 0), picked_qty: 0 })).filter((line) => line.qty > 0);
  if (!remaining.length) fail('There are no pending line items to split.', 409);
  const retained = delivery.lines.filter((line) => Number(line.picked_qty || 0) > 0).map((line) => ({ ...line, qty: Number(line.picked_qty), picked_qty: Number(line.picked_qty) }));
  const split = await insert('ajio_deliveries', { ...Object.fromEntries(Object.entries(delivery).filter(([key]) => key !== 'id')), delivery_no: `${delivery.delivery_no}-S2`, status: 'Pending', split_from: delivery.delivery_no, lines: remaining, boxes: [], invoice_no: '', master_awb: '', child_awbs: [] });
  await update('ajio_deliveries', delivery.id, { lines: retained, status: 'Picked', updated_at: now() });
  const order = await findOne('ajio_orders', { id: delivery.order_id });
  await update('ajio_orders', order.id, { delivery_ids: [...new Set([...(order.delivery_ids || []), split.id])], status: 'Picking' });
  return split;
}

async function packDelivery(id) {
  const config = await getConfig(); const delivery = await findOne('ajio_deliveries', { id: Number(id) });
  if (!delivery) fail('Delivery was not found.', 404);
  if (delivery.status !== 'Picked' || !delivery.lines.every((line) => Number(line.picked_qty) === Number(line.qty))) fail('All delivery quantities must be picked before Order Pack.', 409);
  if (!delivery.boxes?.length || delivery.boxes.some((box) => box.status !== 'Closed')) fail('Every scanned box must be closed before Order Pack.', 409);
  const childAwbs = delivery.boxes.map((box, index) => `${delivery.ajio_po_no}${String(index + 1).padStart(3, '0')}`);
  const invoiceNo = `${config.b2b_invoice_series}-${Date.now().toString().slice(-6)}`;
  const packed = (await update('ajio_deliveries', delivery.id, { status: 'Packed', invoice_no: invoiceNo, master_awb: childAwbs[0], child_awbs: childAwbs, packed_at: now(), shipping_label_report: config.shipping_label_report, ready_to_ship: config.ready_to_ship_at === 'Pack' }))[0];
  await insert('ajio_invoices', { invoice_no: invoiceNo, ajio_po_no: delivery.ajio_po_no, delivery_no: delivery.delivery_no, master_awb: childAwbs[0], child_awbs: childAwbs, generated_at: now(), source: 'AJIO JIT', status: 'Generated' });
  const all = await find('ajio_deliveries');
  const siblings = all.filter((row) => row.order_id === delivery.order_id);
  if (siblings.every((row) => row.id === delivery.id || row.status === 'Packed')) await update('ajio_orders', delivery.order_id, { status: 'Packed' });
  return packed;
}

async function requestManifest(ids) {
  const config = await getConfig();
  if (!config?.order_sync) fail('Order Sync is disabled. Manifest generation is unavailable.', 409);
  const deliveries = (await find('ajio_deliveries')).filter((row) => ids.includes(row.id));
  if (!deliveries.length || deliveries.length !== ids.length) fail('Select valid packed deliveries.', 400);
  if (deliveries.some((row) => row.status !== 'Packed' || !row.invoice_no || row.boxes.some((box) => box.status !== 'Closed'))) fail('3PL will not pick any partial shipment. Select only fully packed deliveries.', 409);
  const manifest = await insert('ajio_manifests', { manifest_no: code('AJIO-MF-'), marketplace: 'Ajio FK', manifest_date: today(), delivery_ids: ids, shipment_count: deliveries.length, box_count: deliveries.reduce((sum, row) => sum + row.boxes.length, 0), master_awbs: deliveries.map((row) => row.master_awb), status: 'Manifested', requested_at: now(), manifest_document: `AJIO consolidated manifest for ${deliveries.length} shipment(s)` });
  for (const delivery of deliveries) await update('ajio_deliveries', delivery.id, { status: 'Manifested', manifest_no: manifest.manifest_no, ready_to_ship: true });
  return manifest;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const entity = text(req.query.entity || req.body?.entity);
    if (req.method === 'GET') {
      if (!collections[entity]) return res.status(400).json({ error: 'Unknown AJIO entity.' });
      return res.status(200).json(await find(collections[entity], {}, { sort: { id: entity === 'config' ? 1 : -1 } }));
    }
    const action = text(req.body?.action);
    if (req.method === 'PUT' && action === 'save-config') {
      const current = await getConfig();
      const sellerId = text(req.body.seller_id);
      if (!/^DV[A-Za-z0-9]+$/.test(sellerId) || sellerId.includes('@')) fail('Seller ID must be an alphanumeric value starting with DV and cannot be an email address.');
      if (!text(req.body.channel_name) || !text(req.body.order_fulfillment_wh)) fail('Channel Name and Order Fulfillment WH are required.');
      if (req.body.order_sync === true && !text(req.body.order_sync_from_date)) fail('Order Sync From Date is required when Order Sync is Yes.');
      if (req.body.return_sync === true && !text(req.body.return_sync_from_date)) fail('Return Sync From Date is required when Return Order Sync is Yes.');
      if (!text(req.body.b2b_invoice_series)) fail('B2B Invoice Series is required.');
      if (req.body.is_b2b !== true) fail('Is B2B must always be Yes for AJIO JIT.');
      if (req.body.sku_sync !== 'Pull' || req.body.sku_create !== 'Moderate') fail('AJIO JIT Channel Mappings require SKU Sync Pull with SKU Create Moderate.');
      if (req.body.enable_e_invoicing === true && (!text(req.body.e_invoicing_username) || (!req.body.e_invoicing_password && !current?.e_invoicing_password_configured))) fail('E-Invoicing Username and Password are required when Enable E-Invoicing is Yes.');
      if (req.body.scan_lpn_on_picking !== true || req.body.lpn_reuse_after_ship !== true) fail('Scan LPN on Picking and LPN reuse after ship are mandatory for AJIO.');
      if (req.body.unpack_access !== false) fail('Un-Packing access must remain revoked for AJIO users.');
      const { password: _password, e_invoicing_password: _eInvoicePassword, entity: _entity, action: _action, id: _id, ...fields } = req.body;
      fields.password_configured = Boolean(req.body.password) || Boolean(current?.password_configured);
      fields.e_invoicing_password_configured = Boolean(req.body.e_invoicing_password) || Boolean(current?.e_invoicing_password_configured);
      fields.interface_status = fields.password_configured ? 'Configured' : 'Pending Credentials'; fields.updated_date = today(); fields.updated_by = 'demo-admin';
      const saved = (await update('ajio_config', current.id, fields))[0];
      const channel = await findOne('channels', { channel_code: saved.channel_code });
      if (channel) await update('channels', channel.id, {
        channel_name: saved.channel_name,
        location: saved.order_fulfillment_wh,
        status: saved.status,
        fulfilment_status: saved.status === 'Active' ? 'Online' : 'Offline',
        channel_configured: saved.interface_status === 'Configured' ? 'Yes' : 'No',
      });
      return res.status(200).json(saved);
    }
    if (req.method === 'PUT' && action === 'map-sku') {
      const mapping = await findOne('ajio_sku_mappings', { id: Number(req.body.id) }); const sku = await findOne('skus', { sku_code: text(req.body.sku_code) });
      if (!mapping || !sku) fail('Select a valid AJIO article and Vin e-Retail SKU.', 404);
      const channelSkuCode = text(req.body.channel_sku_code || mapping.channel_sku_code); const channelProductId = text(req.body.channel_product_id || mapping.channel_product_id);
      if (!channelSkuCode) fail('AJIO SKU Code must be mapped in ChannelSKUCode.');
      if (!/^[^~]+~[^~]+$/.test(channelProductId)) fail('ChannelProductId must contain ProductId~VariantId.');
      return res.status(200).json((await update('ajio_sku_mappings', mapping.id, { channel_sku_code: channelSkuCode, channel_product_id: channelProductId, sku_code: sku.sku_code, article_name: sku.name, mapping_status: 'Mapped', inventory_sync: 'Active', last_sync: now() }))[0]);
    }
    if (req.method === 'POST' && action === 'inventory-sync') {
      const config = await getConfig(); if (config.inventory_sync_method !== 'Pull') fail('AJIO JIT inventory synchronization requires Pull.', 409);
      const inventory = await find('inventory'); const mappings = await find('ajio_sku_mappings'); let count = 0;
      for (const mapping of mappings.filter((row) => row.mapping_status === 'Mapped')) {
        const available = inventory.filter((row) => row.sku_code === mapping.sku_code).reduce((sum, row) => sum + Number(row.available || 0), 0);
        await update('ajio_sku_mappings', mapping.id, { published_inventory: available, inventory_sync: 'Synced', last_sync: now() }); count += 1;
      }
      return res.status(200).json({ count, message: `${count} mapped SKU inventory record(s) synchronized.` });
    }
    if (req.method === 'POST' && action === 'inventory-reconciliation') {
      const config = await getConfig(); if (!config.enable_inventory_reconciliation) fail('Enable Inventory Reconciliation is set to No.', 409);
      if (config.reconciliation_frequency !== 'Once Daily') fail('AJIO inventory reconciliation is supported only once per day.', 409);
      if (config.last_reconciliation_date === today()) fail('Inventory reconciliation has already run today.', 409);
      const inventory = await find('inventory'); const mappings = await find('ajio_sku_mappings'); let count = 0;
      for (const mapping of mappings.filter((row) => row.mapping_status === 'Mapped')) {
        const available = inventory.filter((row) => row.sku_code === mapping.sku_code).reduce((sum, row) => sum + Number(row.available || 0), 0);
        await update('ajio_sku_mappings', mapping.id, { published_inventory: available, inventory_sync: 'Reconciled', last_sync: now() }); count += 1;
      }
      await update('ajio_config', config.id, { last_reconciliation_date: today(), last_reconciliation_at: now() });
      return res.status(200).json({ count, message: `${count} SKU inventory record(s) reconciled.` });
    }
    if (req.method === 'POST' && action === 'prefetch-label') {
      const config = await getConfig(); if (!config.prepack_enabled) fail('PrePack Enabled is not selected in Channel Maintenance.', 409);
      const delivery = await findOne('ajio_deliveries', { id: Number(req.body.delivery_id) });
      if (!delivery || !['Pending', 'Processing'].includes(delivery.status)) fail('Select a pending picklist delivery for Prefetch.', 409);
      return res.status(200).json((await update('ajio_deliveries', delivery.id, { label_prefetch_status: 'Prefetched', label_prefetched_at: now() }))[0]);
    }
    if (req.method === 'POST' && action === 'pull-backorders') return res.status(200).json({ count: await reserveBackorders(req.body.ids), message: 'AJIO order pendency pulled and inventory reserved.' });
    if (req.method === 'POST' && action === 'release-po') return res.status(201).json(await releasePo(req.body.id));
    if (req.method === 'POST' && action === 'generate-picklist') return res.status(201).json(await generatePicklist(req.body.order_ids || []));
    if (req.method === 'POST' && action === 'scan') return res.status(200).json(await scanItem(req.body));
    if (req.method === 'POST' && action === 'close-box') return res.status(200).json(await closeBox(req.body));
    if (req.method === 'POST' && action === 'delivery-split') return res.status(201).json(await splitDelivery(req.body.delivery_id));
    if (req.method === 'POST' && action === 'pack') return res.status(200).json(await packDelivery(req.body.delivery_id));
    if (req.method === 'POST' && action === 'request-manifest') return res.status(201).json(await requestManifest(req.body.delivery_ids || []));
    if (req.method === 'POST' && action === 'cancel') {
      const delivery = await findOne('ajio_deliveries', { id: Number(req.body.delivery_id) });
      if (!delivery) fail('Delivery was not found.', 404);
      if (['Packed', 'Manifested', 'Shipped'].includes(delivery.status)) fail('No Order Cancellation is allowed after Order Packing/Invoice generation.', 409);
      return res.status(200).json((await update('ajio_deliveries', delivery.id, { status: 'Cancelled' }))[0]);
    }
    if (req.method === 'POST' && action === 'handover') {
      const manifest = await findOne('ajio_manifests', { id: Number(req.body.manifest_id) }); if (!manifest) fail('Manifest was not found.', 404);
      for (const id of manifest.delivery_ids) await update('ajio_deliveries', id, { status: 'Shipped', shipped_at: now() });
      return res.status(200).json((await update('ajio_manifests', manifest.id, { status: 'Handed Over', handed_over_at: now() }))[0]);
    }
    res.status(405).json({ error: 'Unsupported AJIO operation.' });
  } catch (error) {
    console.error('AJIO API error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'AJIO operation failed.' });
  }
}
