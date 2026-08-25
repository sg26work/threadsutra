const base = 'http://127.0.0.1:3002/api';
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
function assert(value, message) { if (!value) throw new Error(message); }

let checks = 0; const ok = (value, message) => { assert(value, message); checks += 1; };
const configResponse = await request('/amazon-mfn?entity=config'); const config = configResponse.data[0];
ok(config.channel_type === 'Amazon India' && config.single_warehouse === true && config.channel_sla_hours === 48, 'Amazon India MFN defaults are incorrect');
ok(config.marketplace_id === 'A21TJRUUN4KGV' && config.developer_id === '073980952359' && config.developer_name === 'vinculum', 'India marketplace/developer defaults are incorrect');

const missingName = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', channel_name: '' });
ok(missingName.status === 400, 'Channel Name validation failed');
const multiWarehouse = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', single_warehouse: false });
ok(multiWarehouse.status === 400, 'single-warehouse MFN validation failed');
const missingOrderDate = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', order_sync: true, order_sync_from_date: '' });
ok(missingOrderDate.status === 400, 'Order Sync From Date validation failed');
const missingReturnDate = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', return_sync: true, return_sync_from_date: '' });
ok(missingReturnDate.status === 400, 'Return Sync From Date validation failed');
const missingSeller = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', seller_id: '' });
ok(missingSeller.status === 400, 'Seller ID validation failed');
const badDeveloper = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', developer_name: 'Vinculum India' });
ok(badDeveloper.status === 400, 'developer name lowercase/no-space rule failed');
const noInvoice = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', need_invoice: false });
ok(noInvoice.status === 400, 'Amazon India Need Invoice rule failed');

const otpRequired = await request('/amazon-mfn', 'PUT', { ...config, action: 'save-config', enable_easy_ship: false, otp_verified: false });
ok(otpRequired.status === 200 && otpRequired.data.interface_status === 'OTP Required', 'Easy Ship No did not require OTP');
const invalidOtp = await request('/amazon-mfn', 'POST', { action: 'verify-otp', otp: '123' });
ok(invalidOtp.status === 400, 'invalid Amazon OTP was accepted');
const validOtp = await request('/amazon-mfn', 'POST', { action: 'verify-otp', otp: '123456' });
ok(validOtp.status === 200 && validOtp.data.interface_status === 'Configured', 'valid Amazon OTP did not configure the interface');
const configured = await request('/amazon-mfn', 'PUT', { ...validOtp.data, action: 'save-config', enable_easy_ship: true, otp_verified: false, access_key: 'never-persist-access', secret_key: 'never-persist-secret', mws_token: 'never-persist-token', panel_password: 'never-persist-panel' });
ok(configured.status === 200 && configured.data.interface_status === 'Configured', 'Amazon MFN configuration save failed');
ok(!('access_key' in configured.data) && !('secret_key' in configured.data) && !('mws_token' in configured.data) && !('panel_password' in configured.data), 'confidential Amazon credentials were persisted');
const channels = await request('/channels'); const sharedChannel = channels.data.find((row) => row.channel_code === 'AMF');
ok(sharedChannel?.channel_name === configured.data.channel_name && sharedChannel?.location === configured.data.order_fulfillment_wh && sharedChannel?.channel_configured === 'Yes', 'Manage Channels was not synchronized');

const mappingsResponse = await request('/amazon-mfn?entity=mappings'); const unmapped = mappingsResponse.data.find((row) => row.mapping_status === 'Un-Mapped');
const invalidAsin = await request('/amazon-mfn', 'PUT', { action: 'map-sku', id: unmapped.id, sku_code: 'BACKPACK-GRY', channel_sku_code: unmapped.merchant_sku, channel_product_id: 'INVALID' });
ok(invalidAsin.status === 400, 'invalid ASIN was accepted');
const mapped = await request('/amazon-mfn', 'PUT', { action: 'map-sku', id: unmapped.id, sku_code: 'BACKPACK-GRY', channel_sku_code: unmapped.merchant_sku, channel_product_id: unmapped.asin });
ok(mapped.status === 200 && mapped.data.merchant_sku === unmapped.merchant_sku && mapped.data.asin === unmapped.asin && mapped.data.sku_code === 'BACKPACK-GRY', 'Merchant SKU/ASIN mapping failed');

const currentMappings = await request('/amazon-mfn?entity=mappings'); const listed = currentMappings.data.find((row) => row.merchant_sku === 'AMZ-TSHIRT-BLK-M'); const notListed = currentMappings.data.find((row) => row.listing_present === false);
const submitted = await request('/amazon-mfn', 'POST', { action: 'submit-inventory', mapping_ids: [listed.id, notListed.id] });
ok(submitted.status === 202 && submitted.data.status === 'Submitted' && submitted.data.count === 2, 'inventory feed submission failed');
const duplicate = await request('/amazon-mfn', 'POST', { action: 'submit-inventory', mapping_ids: [listed.id] });
ok(duplicate.status === 409 && duplicate.data.error.includes('Duplicate entries suppressed'), 'duplicate inventory submission was not blocked');
let logs = (await request('/amazon-mfn?entity=inventoryLogs')).data; const listedLog = logs.find((row) => row.merchant_sku === listed.merchant_sku); const missingLog = logs.find((row) => row.merchant_sku === notListed.merchant_sku);
const processed = await request('/amazon-mfn', 'POST', { action: 'process-feed', id: listedLog.id });
ok(processed.status === 200 && processed.data.status === 'Success', 'successful inventory feed processing failed');
const listingFailure = await request('/amazon-mfn', 'POST', { action: 'process-feed', id: missingLog.id });
ok(listingFailure.status === 409 && listingFailure.data.error.includes('Listing not present on Amazon'), 'missing listing did not fail with the documented error');
logs = (await request('/amazon-mfn?entity=inventoryLogs')).data;
ok(logs.find((row) => row.id === missingLog.id)?.status === 'Failed', 'missing-listing feed log was not persisted as Failed');
const reconciliation = await request('/amazon-mfn', 'POST', { action: 'reconcile-inventory' });
ok(reconciliation.status === 200 && reconciliation.data.status === 'Success', 'inventory reconciliation failed');
const repeatedReconciliation = await request('/amazon-mfn', 'POST', { action: 'reconcile-inventory' });
ok(repeatedReconciliation.status === 409, 'same-day inventory reconciliation was not blocked');

const orderSyncOff = await request('/amazon-mfn', 'PUT', { ...configured.data, action: 'save-config', order_sync: false });
const blockedPull = await request('/amazon-mfn', 'POST', { action: 'pull-orders' });
ok(orderSyncOff.status === 200 && blockedPull.status === 409, 'Order Sync No did not block Order Pull');
await request('/amazon-mfn', 'PUT', { ...orderSyncOff.data, action: 'save-config', order_sync: true, order_sync_from_date: '2026-08-08' });

const pulled = await request('/amazon-mfn', 'POST', { action: 'pull-orders' });
ok(pulled.status === 200 && pulled.data.pending === 1 && pulled.data.allocated === 1, 'Pending/Un-Shipped Order Pull state split failed');
let orders = (await request('/amazon-mfn?entity=orders')).data; const pending = orders.find((row) => row.marketplace_status === 'Pending'); let allocated = orders.find((row) => row.eretail_status === 'Allocated');
ok(pending.eretail_status === 'Pending' && pending.customer_name === '' && pending.reservation_status === 'Reserved', 'Pending order did not reserve stock without customer information');
ok(allocated.customer_name && allocated.sales_order_no && allocated.reservation_status === 'Reserved', 'Un-Shipped order was not Allocated with customer/sales order');
const repeatPull = await request('/amazon-mfn', 'POST', { action: 'pull-orders' });
ok(repeatPull.status === 404, 'repeat Amazon order pull was not idempotently blocked');
const confirmed = await request('/amazon-mfn', 'POST', { action: 'confirm-order', id: pending.id });
ok(confirmed.status === 200 && confirmed.data.marketplace_status === 'Un-Shipped' && confirmed.data.eretail_status === 'Allocated' && confirmed.data.customer_name, 'Pending to Un-Shipped/Allocated transition failed');

const zeroDimensions = await request('/amazon-mfn', 'POST', { action: 'prefetch-label', id: confirmed.data.id, weight_kg: 0, length_cm: 10, width_cm: 10, height_cm: 10 });
ok(zeroDimensions.status === 400 && zeroDimensions.data.error === 'Weight of dimension cannot be zero.', 'zero dimension validation failed');
const prefetch = await request('/amazon-mfn', 'POST', { action: 'prefetch-label', id: confirmed.data.id, weight_kg: 1.2, length_cm: 30, width_cm: 20, height_cm: 10 });
ok(prefetch.status === 202 && prefetch.data.label_status === 'Processing', 'PrePack label submission failed');
const notReady = await request('/amazon-mfn', 'POST', { action: 'prefetch-label', id: confirmed.data.id, weight_kg: 1.2, length_cm: 30, width_cm: 20, height_cm: 10 });
ok(notReady.status === 409 && notReady.data.error === 'Feed Submission Results not ready.', 'in-progress label feed did not return documented response');
const prefetched = await request('/amazon-mfn', 'POST', { action: 'process-label', id: confirmed.data.id });
ok(prefetched.status === 200 && prefetched.data.label_status === 'Prefetched' && prefetched.data.invoice_no && prefetched.data.shipping_label, 'prefetched invoice/shipping label generation failed');
const packedPrefetch = await request('/amazon-mfn', 'POST', { action: 'pack-order', id: confirmed.data.id });
ok(packedPrefetch.status === 200 && packedPrefetch.data.eretail_status === 'Packed' && packedPrefetch.data.marketplace_status === 'Waiting for Pick-Up', 'prefetched Order Pack/Waiting for Pick-Up transition failed');

const packScheduled = await request('/amazon-mfn', 'POST', { action: 'pack-order', id: allocated.id, weight_kg: 0.8, length_cm: 28, width_cm: 22, height_cm: 8 });
ok(packScheduled.status === 202 && packScheduled.data.pack_status === 'Packing Scheduled', 'six-minute Order Pack scheduling state failed');
const packProcessed = await request('/amazon-mfn', 'POST', { action: 'process-label', id: allocated.id });
ok(packProcessed.status === 200 && packProcessed.data.eretail_status === 'Packed' && packProcessed.data.label_status === 'Success' && packProcessed.data.tracking_no, 'scheduled label/invoice processing failed');
const postPackCancel = await request('/amazon-mfn', 'POST', { action: 'cancel-order', id: allocated.id });
ok(postPackCancel.status === 409 && postPackCancel.data.error === 'This order is not allowed to be re-scheduled.', 'post-pack cancellation was not blocked with documented response');
const missingTransporter = await request('/amazon-mfn', 'POST', { action: 'ship-order', id: allocated.id, tracking_no: packProcessed.data.tracking_no });
ok(missingTransporter.status === 400, 'Shipment accepted without Transporter Name');
const shipped = await request('/amazon-mfn', 'POST', { action: 'ship-order', id: allocated.id, transporter_name: 'Amazon Transportation Services', tracking_no: packProcessed.data.tracking_no });
ok(shipped.status === 201 && shipped.data.status === 'Shipped' && shipped.data.marketplace_update === 'Success', 'Shipment status/tracking push failed');
const saleOrders = await request('/sale-orders'); const sharedSale = saleOrders.data.find((row) => row.order_no === allocated.sales_order_no);
ok(sharedSale?.status === 'Shipped', 'shared sale order did not reflect Amazon shipment');

const returnsPulled = await request('/amazon-mfn', 'POST', { action: 'pull-returns' });
ok(returnsPulled.status === 200 && returnsPulled.data.count === 1, 'Amazon Return Pull failed');
const returns = (await request('/amazon-mfn?entity=returns')).data;
ok(returns[0].status === 'Confirmed' && returns[0].inbound_status === 'Pending Inbound', 'Amazon return was not created Confirmed for inbound');
const repeatReturns = await request('/amazon-mfn', 'POST', { action: 'pull-returns' });
ok(repeatReturns.status === 404, 'repeat Amazon Return Pull was not blocked');

console.log(JSON.stringify({
  checks,
  channel: configured.data.channel_type,
  region: configured.data.region,
  marketplace_id: configured.data.marketplace_id,
  credentials_persisted: false,
  manage_channels_synchronized: true,
  mapping: { ChannelSKUCode: mapped.data.merchant_sku, ChannelProductId: mapped.data.asin, VinSKU: mapped.data.sku_code },
  inventory_feed: { submitted: submitted.data.feed_id, success: processed.data.status, missing_listing: 'Failed' },
  order_states: ['Pending', 'Un-Shipped', 'Allocated', 'Packed', 'Waiting for Pick-Up', 'Shipped'],
  prefetch: prefetched.data.label_status,
  shipment: shipped.data,
  return_status: returns[0].status,
  blocked_paths: ['missing channel name', 'multi warehouse', 'missing sync dates', 'missing seller', 'bad developer name', 'Need Invoice No', 'invalid OTP', 'invalid ASIN', 'duplicate inventory feed', 'listing missing', 'same-day reconciliation', 'Order Sync No', 'repeat order pull', 'zero dimensions', 'label feed not ready', 'post-pack cancellation', 'missing transporter', 'repeat return pull'],
}, null, 2));
