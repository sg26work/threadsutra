import { find, findOne, insert, update, cors } from './mongo.js';

const collections = {
  config: 'amazon_mfn_config', mappings: 'amazon_mfn_mappings', orders: 'amazon_mfn_orders',
  inventoryLogs: 'amazon_mfn_inventory_logs', returns: 'amazon_mfn_returns', shipments: 'amazon_mfn_shipments',
};
const text = (value) => String(value ?? '').trim();
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const code = (prefix) => `${prefix}${Date.now().toString().slice(-8)}`;
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };

const MARKETPLACES = {
  India: { country_code: 'IN', endpoint: 'https://mws.amazonservices.in', marketplace_id: 'A21TJRUUN4KGV', developer_id: '073980952359' },
  UAE: { country_code: 'AE', endpoint: 'https://mws.amazonservices.ae', marketplace_id: 'A2VIGQ35RCS4UG', developer_id: '073980952359' },
  US: { country_code: 'US', endpoint: 'https://mws.amazonservices.com', marketplace_id: 'ATVPDKIKX0DER', developer_id: '18802594138' },
};

async function getConfig() { return (await find('amazon_mfn_config'))[0]; }
async function currentInventory(skuCode, warehouse) {
  return (await find('inventory')).find((row) => row.sku_code === skuCode && row.warehouse === warehouse);
}
async function validateOrderLines(order, warehouse) {
  const mappings = await find('amazon_mfn_mappings');
  for (const line of order.lines) {
    const mapping = mappings.find((row) => row.merchant_sku === line.merchant_sku && row.sku_code === line.sku_code && row.mapping_status === 'Mapped');
    if (!mapping) fail(`Merchant SKU ${line.merchant_sku} must be mapped in ChannelSKUCode before order processing.`, 409);
    const stock = await currentInventory(line.sku_code, warehouse);
    if (!stock || Number(stock.available) < Number(line.qty)) fail(`Insufficient inventory for ${line.sku_code}; order cannot be Allocated.`, 409);
  }
}
async function reserve(order, config) {
  if (order.reservation_status === 'Reserved') return order;
  await validateOrderLines(order, config.order_fulfillment_wh);
  for (const line of order.lines) {
    const stock = await currentInventory(line.sku_code, config.order_fulfillment_wh);
    await update('inventory', stock.id, { available: Number(stock.available) - Number(line.qty), reserved: Number(stock.reserved || 0) + Number(line.qty) });
  }
  return (await update('amazon_mfn_orders', order.id, { warehouse: config.order_fulfillment_wh, reservation_status: 'Reserved', eretail_status: 'Pending', pulled_at: now() }))[0];
}
async function allocate(order) {
  if (order.eretail_status === 'Allocated') return order;
  const salesOrderNo = order.sales_order_no || code('SO-AMZ-');
  const customerName = order.remote_customer_name || 'Amazon Customer';
  const city = order.remote_city || '';
  const saved = (await update('amazon_mfn_orders', order.id, { marketplace_status: 'Un-Shipped', eretail_status: 'Allocated', customer_name: customerName, city, sales_order_no: salesOrderNo, allocated_at: now() }))[0];
  const existing = await findOne('sale_orders', { order_no: salesOrderNo });
  if (!existing) {
    const qty = order.lines.reduce((sum, line) => sum + Number(line.qty), 0);
    const amount = order.lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unit_price), 0);
    await insert('sale_orders', { order_no: salesOrderNo, external_order_no: order.amazon_order_id, channel: 'Amazon', customer: customerName, city, order_date: order.order_date, items: order.lines.length, qty, amount, status: 'Confirmed', payment_mode: 'Marketplace' });
    for (const line of order.lines) await insert('fulfillment_orders', { order_no: salesOrderNo, external_order_no: order.amazon_order_id, amazon_order_id: order.id, channel: 'Amazon', customer: customerName, city, warehouse: order.warehouse, order_date: order.order_date, sku_code: line.sku_code, sku_name: line.merchant_sku, qty: line.qty, amount: Number(line.qty) * Number(line.unit_price), payment_mode: 'Marketplace', status: 'Allocated', priority: 'High', acknowledged: true });
  }
  return saved;
}
function dimensions(body, order) {
  const values = {
    weight_kg: Number(body.weight_kg ?? order.weight_kg), length_cm: Number(body.length_cm ?? order.length_cm),
    width_cm: Number(body.width_cm ?? order.width_cm), height_cm: Number(body.height_cm ?? order.height_cm),
  };
  if (Object.values(values).some((value) => !Number.isFinite(value) || value <= 0)) fail('Weight of dimension cannot be zero.');
  return values;
}
async function scheduleLabel(order, body, mode) {
  const values = dimensions(body, order);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentCalls = (await find('amazon_mfn_label_calls')).filter((row) => new Date(row.requested_at).getTime() >= oneHourAgo);
  if (recentCalls.length >= 30) fail('Amazon shipping label throttling limit of 30 calls per hour has been reached.', 429);
  if (order.label_status === 'Processing') fail('Feed Submission Results not ready.', 409);
  await insert('amazon_mfn_label_calls', { amazon_order_id: order.amazon_order_id, mode, requested_at: now(), status: 'Submitted' });
  return (await update('amazon_mfn_orders', order.id, { ...values, label_status: 'Processing', pack_status: mode === 'Prefetch' ? 'Prefetch Scheduled' : 'Packing Scheduled', label_requested_at: now() }))[0];
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const entity = text(req.query.entity || req.body?.entity);
    if (req.method === 'GET') {
      if (entity === 'marketplaces') return res.status(200).json(MARKETPLACES);
      if (!collections[entity]) return res.status(400).json({ error: 'Unknown Amazon MFN entity.' });
      return res.status(200).json(await find(collections[entity], {}, { sort: { id: entity === 'config' ? 1 : -1 } }));
    }
    const action = text(req.body?.action);
    if (req.method === 'PUT' && action === 'save-config') {
      const current = await getConfig(); const body = req.body; const region = text(body.region);
      if (!MARKETPLACES[region]) fail('Select India, UAE, or US & Other Countries configuration.');
      if (!text(body.channel_name) || !text(body.order_fulfillment_wh)) fail('Channel Name and Order Fulfillment WH are required.');
      if (body.single_warehouse !== true) fail('Amazon MFN supports a single Order Fulfillment WH per seller account.');
      if (body.order_sync === true && !text(body.order_sync_from_date)) fail('Order Sync From Date is required when Order Sync is Yes.');
      if (body.return_sync === true && !text(body.return_sync_from_date)) fail('Return Sync From Date is required when Return Order Sync is Yes.');
      if (!text(body.seller_id) || !text(body.marketplace_id) || !text(body.mws_token) && !current.mws_token_configured) fail('Seller ID, Marketplace ID and MWS Token are mandatory.');
      if ((!text(body.access_key) && !current.access_key_configured) || (!text(body.secret_key) && !current.secret_key_configured)) fail('Access Key and Secret Key are mandatory; use _ when registered on Vinculum developer credentials.');
      if (region === 'India' && (!text(body.panel_user_id) || (!text(body.panel_password) && !current.panel_password_configured))) fail('Panel User Id and Panel Password are mandatory for Amazon India.');
      if (!/^\d+$/.test(text(body.developer_id)) || text(body.developer_name) !== 'vinculum' || /\s/.test(text(body.developer_name))) fail('Developer ID must be numeric and Developer Name must be vinculum in small caps without spaces.');
      if (region === 'India' && body.need_invoice !== true) fail('Need Invoice must be Yes for Amazon India Easy Ship.');
      if (region === 'India' && body.enable_easy_ship !== true && body.otp_verified !== true) body.interface_status = 'OTP Required';
      const { access_key: _access, secret_key: _secret, mws_token: _token, panel_password: _panelPassword, entity: _entity, action: _action, id: _id, ...fields } = body;
      fields.access_key_configured = Boolean(body.access_key) || current.access_key_configured;
      fields.secret_key_configured = Boolean(body.secret_key) || current.secret_key_configured;
      fields.mws_token_configured = Boolean(body.mws_token) || current.mws_token_configured;
      fields.panel_password_configured = Boolean(body.panel_password) || current.panel_password_configured;
      fields.interface_status = fields.interface_status === 'OTP Required' ? 'OTP Required' : 'Configured';
      fields.updated_by = 'demo-admin'; fields.updated_date = today();
      const saved = (await update('amazon_mfn_config', current.id, fields))[0];
      const channel = await findOne('channels', { channel_code: saved.channel_code });
      if (channel) await update('channels', channel.id, { channel_name: saved.channel_name, location: saved.order_fulfillment_wh, status: saved.status, fulfilment_status: saved.status === 'Active' ? 'Online' : 'Offline', channel_configured: saved.interface_status === 'Configured' ? 'Yes' : 'No' });
      return res.status(200).json(saved);
    }
    if (req.method === 'POST' && action === 'verify-otp') {
      const config = await getConfig();
      if (config.enable_easy_ship) fail('OTP login is required only when Enable Easy Ship is No.', 409);
      if (!/^\d{6}$/.test(text(req.body.otp))) fail('Enter the 6 digit OTP received from Amazon Seller Central.');
      return res.status(200).json((await update('amazon_mfn_config', config.id, { otp_verified: true, interface_status: 'Configured', otp_verified_at: now() }))[0]);
    }
    if (req.method === 'PUT' && action === 'map-sku') {
      const mapping = await findOne('amazon_mfn_mappings', { id: Number(req.body.id) }); const sku = await findOne('skus', { sku_code: text(req.body.sku_code) });
      if (!mapping || !sku) fail('Select a valid Amazon listing and Vin e-Retail SKU.', 404);
      const merchantSku = text(req.body.channel_sku_code || mapping.merchant_sku); const asin = text(req.body.channel_product_id || mapping.asin);
      if (!merchantSku) fail('Amazon Merchant SKU must be mapped in ChannelSKUCode.');
      if (!/^B[A-Z0-9]{9}$/.test(asin)) fail('Amazon ASIN mapped in ChannelProductId must be 10 alphanumeric characters beginning with B.');
      return res.status(200).json((await update('amazon_mfn_mappings', mapping.id, { merchant_sku: merchantSku, asin, sku_code: sku.sku_code, product_name: sku.name, mapping_status: 'Mapped', feed_status: 'Not Submitted', last_sync: '' }))[0]);
    }
    if (req.method === 'POST' && action === 'submit-inventory') {
      const config = await getConfig(); if (!config.inventory_sync) fail('Inventory Sync is set to No.', 409);
      const ids = (req.body.mapping_ids || []).map(Number); const mappings = (await find('amazon_mfn_mappings')).filter((row) => row.mapping_status === 'Mapped' && (!ids.length || ids.includes(row.id)));
      if (!mappings.length) fail('Select at least one mapped Amazon SKU.', 404);
      for (const mapping of mappings) {
        const duplicate = (await find('amazon_mfn_inventory_logs')).find((log) => log.mapping_id === mapping.id && log.status === 'Submitted');
        if (duplicate) fail('Duplicate entries suppressed. The same SKU inventory request is already submitted.', 409);
      }
      const feedId = code('AMZ-FEED-');
      for (const mapping of mappings) {
        const stock = await currentInventory(mapping.sku_code, config.order_fulfillment_wh); const qty = Math.max(0, Number(stock?.available || 0) - Number(config.safety_stock || 0));
        await insert('amazon_mfn_inventory_logs', { feed_id: feedId, mapping_id: mapping.id, merchant_sku: mapping.merchant_sku, asin: mapping.asin, quantity: qty, status: 'Submitted', submitted_at: now(), processed_at: '', message: 'Feed submitted to Amazon.' });
        await update('amazon_mfn_mappings', mapping.id, { feed_status: 'Submitted', submitted_inventory: qty, last_sync: now() });
      }
      return res.status(202).json({ feed_id: feedId, count: mappings.length, status: 'Submitted', message: 'Amazon inventory Feed submitted.' });
    }
    if (req.method === 'POST' && action === 'process-feed') {
      const log = await findOne('amazon_mfn_inventory_logs', { id: Number(req.body.id) }); if (!log || log.status !== 'Submitted') fail('Select a Submitted MP Inventory log.', 409);
      const mapping = await findOne('amazon_mfn_mappings', { id: log.mapping_id });
      if (!mapping.listing_present) {
        await update('amazon_mfn_inventory_logs', log.id, { status: 'Failed', processed_at: now(), message: 'Listing not present on Amazon.' });
        await update('amazon_mfn_mappings', mapping.id, { feed_status: 'Failed' });
        fail('Listing not present on Amazon. Correct the Channel Mappings.', 409);
      }
      await update('amazon_mfn_mappings', mapping.id, { feed_status: 'Success', published_inventory: log.quantity, last_sync: now() });
      return res.status(200).json((await update('amazon_mfn_inventory_logs', log.id, { status: 'Success', processed_at: now(), message: 'Inventory updated on Amazon Website.' }))[0]);
    }
    if (req.method === 'POST' && action === 'reconcile-inventory') {
      const config = await getConfig(); if (!config.enable_inventory_reconciliation) fail('Enable Inventory Reconciliation is set to No.', 409);
      if (config.last_reconciliation_date === today()) fail('Amazon inventory reconciliation has already run today.', 409);
      const mappings = await find('amazon_mfn_mappings'); let count = 0;
      for (const mapping of mappings.filter((row) => row.mapping_status === 'Mapped' && row.listing_present)) {
        const stock = await currentInventory(mapping.sku_code, config.order_fulfillment_wh); const qty = Math.max(0, Number(stock?.available || 0) - Number(config.safety_stock || 0));
        await update('amazon_mfn_mappings', mapping.id, { published_inventory: qty, feed_status: 'Success', last_sync: now() }); count += 1;
      }
      await update('amazon_mfn_config', config.id, { last_reconciliation_date: today(), last_reconciliation_at: now() });
      return res.status(200).json({ count, status: 'Success', message: `${count} Amazon listing(s) reconciled.` });
    }
    if (req.method === 'POST' && action === 'pull-orders') {
      const config = await getConfig(); if (!config.order_sync) fail('Order Sync is No; Order Pull, Pack, Invoice and Shipment Label generation are disabled.', 409);
      const orders = (await find('amazon_mfn_orders')).filter((row) => row.eretail_status === 'Not Pulled'); if (!orders.length) fail('No new Pending or Un-Shipped Amazon orders are available.', 404);
      let pending = 0; let allocated = 0;
      for (const source of orders) {
        const reserved = await reserve(source, config);
        if (source.marketplace_status === 'Un-Shipped') { await allocate(reserved); allocated += 1; } else pending += 1;
      }
      return res.status(200).json({ count: orders.length, pending, allocated, message: `${orders.length} Amazon order(s) pulled.` });
    }
    if (req.method === 'POST' && action === 'confirm-order') {
      const config = await getConfig(); let order = await findOne('amazon_mfn_orders', { id: Number(req.body.id) }); if (!order) fail('Amazon order not found.', 404);
      if (order.eretail_status === 'Not Pulled') order = await reserve(order, config);
      if (order.marketplace_status !== 'Pending' || order.eretail_status !== 'Pending') fail('Only a pulled Pending Amazon order can move to Un-Shipped.', 409);
      return res.status(200).json(await allocate(order));
    }
    if (req.method === 'POST' && (action === 'prefetch-label' || action === 'pack-order')) {
      const config = await getConfig(); if (!config.order_sync) fail('Order Sync is No; Order Pack and label generation are disabled.', 409);
      const order = await findOne('amazon_mfn_orders', { id: Number(req.body.id) }); if (!order) fail('Amazon order not found.', 404);
      if (order.eretail_status !== 'Allocated') fail('Only an Allocated Amazon order can be packed.', 409);
      if (action === 'prefetch-label' && !config.prepack_enabled) fail('PrePack Enabled is not selected in Channel Maintenance.', 409);
      if (action === 'pack-order' && order.label_status === 'Prefetched') {
        const sale = await findOne('sale_orders', { order_no: order.sales_order_no }); if (sale) await update('sale_orders', sale.id, { status: 'Ready to Ship' });
        return res.status(200).json((await update('amazon_mfn_orders', order.id, { eretail_status: 'Packed', pack_status: 'Packed', marketplace_status: config.enable_easy_ship ? 'Waiting for Pick-Up' : 'Un-Shipped', packed_at: now() }))[0]);
      }
      return res.status(202).json(await scheduleLabel(order, req.body, action === 'prefetch-label' ? 'Prefetch' : 'Pack'));
    }
    if (req.method === 'POST' && action === 'process-label') {
      const config = await getConfig(); const order = await findOne('amazon_mfn_orders', { id: Number(req.body.id) });
      if (!order || order.label_status !== 'Processing') fail('Feed Submission Results not ready.', 409);
      const prefetch = order.pack_status === 'Prefetch Scheduled'; const invoiceNo = order.invoice_no || code('AMZ-INV-'); const trackingNo = order.tracking_no || code('AMZTRK');
      const fields = { invoice_no: invoiceNo, shipping_label: `Amazon-MFN-Label-${order.amazon_order_id}`, tracking_no: trackingNo, label_status: prefetch ? 'Prefetched' : 'Success', label_generated_at: now(), pack_status: prefetch ? 'Not Packed' : 'Packed', eretail_status: prefetch ? 'Allocated' : 'Packed', marketplace_status: prefetch ? 'Un-Shipped' : (config.enable_easy_ship ? 'Waiting for Pick-Up' : 'Un-Shipped') };
      if (!prefetch) {
        const sale = await findOne('sale_orders', { order_no: order.sales_order_no }); if (sale) await update('sale_orders', sale.id, { status: 'Ready to Ship' });
      }
      return res.status(200).json((await update('amazon_mfn_orders', order.id, fields))[0]);
    }
    if (req.method === 'POST' && action === 'ship-order') {
      const order = await findOne('amazon_mfn_orders', { id: Number(req.body.id) }); if (!order) fail('Amazon order not found.', 404);
      if (order.eretail_status !== 'Packed' || !order.invoice_no || !order.shipping_label) fail('Only a successfully Packed Amazon order can be shipped.', 409);
      const transporterName = text(req.body.transporter_name); const trackingNo = text(req.body.tracking_no || order.tracking_no);
      if (!transporterName || !trackingNo) fail('Transporter Name and Tracking No. are required at Shipment.');
      const shipment = await insert('amazon_mfn_shipments', { amazon_order_id: order.amazon_order_id, sales_order_no: order.sales_order_no, transporter_name: transporterName, tracking_no: trackingNo, status: 'Shipped', shipped_at: now(), marketplace_update: 'Success' });
      await update('amazon_mfn_orders', order.id, { eretail_status: 'Shipped', marketplace_status: 'Shipped', transporter_name: transporterName, tracking_no: trackingNo, shipped_at: now() });
      const sale = await findOne('sale_orders', { order_no: order.sales_order_no }); if (sale) await update('sale_orders', sale.id, { status: 'Shipped' });
      return res.status(201).json(shipment);
    }
    if (req.method === 'POST' && action === 'cancel-order') {
      const order = await findOne('amazon_mfn_orders', { id: Number(req.body.id) }); if (!order) fail('Amazon order not found.', 404);
      if (['Packed', 'Shipped'].includes(order.eretail_status)) fail('This order is not allowed to be re-scheduled.', 409);
      if (order.reservation_status === 'Reserved') for (const line of order.lines) {
        const stock = await currentInventory(line.sku_code, order.warehouse); if (stock) await update('inventory', stock.id, { available: Number(stock.available) + Number(line.qty), reserved: Math.max(0, Number(stock.reserved || 0) - Number(line.qty)) });
      }
      return res.status(200).json((await update('amazon_mfn_orders', order.id, { cancelled: true, eretail_status: 'Cancelled', marketplace_status: 'Cancelled', reservation_status: 'Released', cancelled_at: now() }))[0]);
    }
    if (req.method === 'POST' && action === 'pull-returns') {
      const config = await getConfig(); if (!config.return_sync) fail('Return Order Sync is No.', 409);
      const rows = (await find('amazon_mfn_returns')).filter((row) => row.status === 'Pending Pull'); if (!rows.length) fail('No Amazon returns are available to pull.', 404);
      for (const row of rows) await update('amazon_mfn_returns', row.id, { status: 'Confirmed', inbound_status: 'Pending Inbound', pulled_at: now() });
      return res.status(200).json({ count: rows.length, message: `${rows.length} Amazon return(s) created in Confirmed status.` });
    }
    return res.status(405).json({ error: 'Unsupported Amazon MFN action.' });
  } catch (error) {
    console.error('Amazon MFN API error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}
