const base = process.env.BASE_URL || 'http://127.0.0.1:3002';
const call = async (path, method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method });
  const json = await response.json();
  if (!response.ok) throw Object.assign(new Error(json.error || response.statusText), { status: response.status });
  return json;
};
const expectError = async (job, message) => { try { await job(); throw new Error('Expected validation error'); } catch (e) { if (!String(e.message).includes(message)) throw e; } };

const data = await call('/api/returns?entity=lookups');
if (!data.vendors.length || !data.purchaseOrders.length || !data.orders.length || !data.inventory.length) throw new Error('Returns lookups were not populated');
await expectError(() => call('/api/returns?entity=customer', 'POST', { entity: 'customer' }), 'Please select orderNo first');

const po = data.purchaseOrders[0]; const vendor = data.vendors.find((v) => v.vendor_name === po.vendor) || data.vendors[0]; const stock = data.inventory[0];
const vendorReturn = await call('/api/returns?entity=vendor', 'POST', { entity: 'vendor', with_po: true, po_no: po.po_no, site_location: po.warehouse, vendor_code: vendor.vendor_code, return_type: 'Damage Return', lines: [{ sku_code: stock.sku_code, qty: 1, base_cost: 99 }] });
if (vendorReturn.status !== 'Created') throw new Error('Vendor return did not start Created');
const confirmedVendor = await call('/api/returns?entity=action', 'POST', { entity: 'action', id: vendorReturn.id, action: 'confirm' });
if (confirmedVendor.status !== 'Confirmed') throw new Error('Vendor return confirm transition failed');
await expectError(() => call('/api/returns?entity=action', 'POST', { entity: 'action', id: vendorReturn.id, action: 'quick-ship' }), 'Cannot quick-ship');

const order = data.orders[0];
const customerReturn = await call('/api/returns?entity=customer', 'POST', { entity: 'customer', request_type: 'Request', external_order_no: order.order_no, order_no: order.order_no, customer: order.customer, order_type: order.payment_mode, order_channel: order.channel, delivery_location: order.warehouse || 'Delhi NCR', return_type: 'Delivered Return', category: 'Refund', delivery_type: 'Pick Up', lines: [{ sku_code: stock.sku_code, qty: 1, unit_price: 99 }] });
if (customerReturn.status !== 'Pending Confirmation') throw new Error('Customer return did not start Pending Confirmation');
const confirmedCustomer = await call('/api/returns?entity=action', 'POST', { entity: 'action', id: customerReturn.id, action: 'confirm' });
if (confirmedCustomer.status !== 'Confirmed') throw new Error('Customer return confirm transition failed');
const closedCustomer = await call('/api/returns?entity=action', 'POST', { entity: 'action', id: customerReturn.id, action: 'inbound' });
if (closedCustomer.status !== 'Closed') throw new Error('Customer return inbound transition failed');
const refundedCustomer = await call('/api/returns?entity=action', 'POST', { entity: 'action', id: customerReturn.id, action: 'refund', refund_remarks: 'Verification refund' });
if (!refundedCustomer.refund_date) throw new Error('Refund data was not persisted');
console.log('Returns API verification passed:', { vendor: vendorReturn.rtv_no, customer: customerReturn.return_no });
