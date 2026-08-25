const base = 'http://127.0.0.1:3002/api';
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
function assert(value, message) { if (!value) throw new Error(message); }

const configResponse = await request('/ajio?entity=config'); const config = configResponse.data[0];
assert(config.channel_type === 'AJIO JIT' && config.sku_sync === 'Pull' && config.sku_create === 'Moderate' && config.is_b2b === true, 'AJIO JIT mandatory defaults are incorrect');
assert(config.order_sync && config.inventory_sync_method === 'Pull' && config.reconciliation_frequency === 'Once Daily', 'Channel Maintenance sync defaults are incorrect');

const missingName = await request('/ajio', 'PUT', { ...config, action: 'save-config', channel_name: '' });
assert(missingName.status === 400, 'Channel Name required validation failed');
const missingOrderDate = await request('/ajio', 'PUT', { ...config, action: 'save-config', order_sync: true, order_sync_from_date: '' });
assert(missingOrderDate.status === 400, 'Order Sync From Date required validation failed');
const missingReturnDate = await request('/ajio', 'PUT', { ...config, action: 'save-config', return_sync: true, return_sync_from_date: '' });
assert(missingReturnDate.status === 400, 'Return Sync From Date conditional validation failed');
const notB2b = await request('/ajio', 'PUT', { ...config, action: 'save-config', is_b2b: false });
assert(notB2b.status === 400, 'mandatory B2B flag was not enforced');
const wrongMappingMode = await request('/ajio', 'PUT', { ...config, action: 'save-config', sku_sync: 'Push' });
assert(wrongMappingMode.status === 400, 'Pull/Moderate mapping requirement was not enforced');
const incompleteEInvoice = await request('/ajio', 'PUT', { ...config, action: 'save-config', enable_e_invoicing: true });
assert(incompleteEInvoice.status === 400, 'conditional E-Invoicing credentials were not enforced');

const configured = await request('/ajio', 'PUT', {
  ...config, action: 'save-config', password: 'never-persist', enable_e_invoicing: true,
  e_invoicing_username: 'EINV-AJIO', e_invoicing_password: 'never-persist-einvoice',
  prepack_enabled: true, ready_to_ship_at: 'Pack', enable_inventory_reconciliation: true,
});
assert(configured.status === 200 && configured.data.interface_status === 'Configured' && configured.data.e_invoicing_password_configured, 'Channel Configure save failed');
assert(!('password' in configured.data) && !('e_invoicing_password' in configured.data), 'credential secret was persisted');
const channelsAfterSave = await request('/channels'); const sharedChannel = channelsAfterSave.data.find((row) => row.channel_code === configured.data.channel_code);
assert(sharedChannel?.channel_name === configured.data.channel_name && sharedChannel?.channel_configured === 'Yes', 'Channel Maintenance did not synchronize Manage Channels');

const mappings = await request('/ajio?entity=mappings'); const unmapped = mappings.data.find((row) => row.mapping_status === 'Un-Mapped');
const invalidProduct = await request('/ajio', 'PUT', { action: 'map-sku', id: unmapped.id, sku_code: 'BACKPACK-GRY', channel_sku_code: unmapped.channel_sku_code, channel_product_id: 'PIDWITHOUTVARIANT' });
assert(invalidProduct.status === 400, 'ProductId~VariantId format validation failed');
const mapping = await request('/ajio', 'PUT', { action: 'map-sku', id: unmapped.id, sku_code: 'BACKPACK-GRY', channel_sku_code: unmapped.channel_sku_code, channel_product_id: unmapped.channel_product_id });
assert(mapping.status === 200 && mapping.data.channel_sku_code === unmapped.article_code && mapping.data.channel_product_id.includes('~'), 'ChannelSKUCode/ChannelProductId mapping failed');

const reconciliation = await request('/ajio', 'POST', { action: 'inventory-reconciliation' });
assert(reconciliation.status === 200 && reconciliation.data.count === 3, 'once-daily reconciliation failed');
const repeatReconciliation = await request('/ajio', 'POST', { action: 'inventory-reconciliation' });
assert(repeatReconciliation.status === 409, 'second same-day reconciliation was not blocked');

const disabledOrderSync = await request('/ajio', 'PUT', { ...configured.data, action: 'save-config', order_sync: false });
assert(disabledOrderSync.status === 200, 'Order Sync could not be disabled');
const blockedPull = await request('/ajio', 'POST', { action: 'pull-backorders' });
assert(blockedPull.status === 409, 'Order Pull was not blocked when Order Sync was No');
await request('/ajio', 'PUT', { ...disabledOrderSync.data, action: 'save-config', order_sync: true, order_sync_from_date: '2026-08-08' });

const orders = await request('/ajio?entity=orders'); const order = orders.data.find((row) => row.status === 'Allocated');
const picklist = await request('/ajio', 'POST', { action: 'generate-picklist', order_ids: [order.id] });
const delivery = picklist.data.deliveries[0];
assert(delivery.label_prefetch_status === 'Pending Prefetch', 'PrePack did not mark delivery for label prefetch');
const prefetched = await request('/ajio', 'POST', { action: 'prefetch-label', delivery_id: delivery.id });
assert(prefetched.status === 200 && prefetched.data.label_prefetch_status === 'Prefetched', 'Prefetch Shipment Label failed');

for (let index = 0; index < delivery.lines.length; index += 1) {
  const line = delivery.lines[index]; const lpn = `JIT-BOX-${index + 1}`;
  const scanned = await request('/ajio', 'POST', { action: 'scan', delivery_id: delivery.id, lpn, sku_code: line.sku_code, qty: line.qty });
  assert(scanned.status === 200, `scan failed for ${line.sku_code}`);
  const closed = await request('/ajio', 'POST', { action: 'close-box', delivery_id: delivery.id, lpn });
  assert(closed.status === 200, `box close failed for ${lpn}`);
}
const packed = await request('/ajio', 'POST', { action: 'pack', delivery_id: delivery.id });
assert(packed.status === 200 && packed.data.ready_to_ship === true && packed.data.shipping_label_report === 'ShippingLabel_AJIO', 'Ready-to-Ship at Pack or marketplace label behavior failed');

console.log(JSON.stringify({
  checks: 21,
  channel_type: configured.data.channel_type,
  channel_code: configured.data.channel_code,
  interface_status: configured.data.interface_status,
  manage_channels_synchronized: true,
  secrets_persisted: false,
  b2b: configured.data.is_b2b,
  sku_mode: `${configured.data.sku_sync}/${configured.data.sku_create}`,
  mapping: { ChannelSKUCode: mapping.data.channel_sku_code, ChannelProductId: mapping.data.channel_product_id },
  reconciliation: reconciliation.data.message,
  prefetch: prefetched.data.label_prefetch_status,
  ready_to_ship_at: configured.data.ready_to_ship_at,
  packed_ready_to_ship: packed.data.ready_to_ship,
  blocked_paths: ['missing channel name', 'missing order sync date', 'missing return sync date', 'Is B2B No', 'SKU Push', 'incomplete E-Invoicing credentials', 'invalid ChannelProductId', 'same-day reconciliation', 'order pull while Order Sync No'],
}, null, 2));
