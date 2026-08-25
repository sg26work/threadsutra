const base = 'http://127.0.0.1:3002/api';
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
function assert(value, message) { if (!value) throw new Error(message); }

const configs = await request('/ajio?entity=config'); const config = configs.data[0];
const badSeller = await request('/ajio', 'PUT', { ...config, action: 'save-config', seller_id: 'seller@example.com', password: 'not-stored' });
assert(badSeller.status === 400, 'email seller ID was not rejected');
const badLpn = await request('/ajio', 'PUT', { ...config, action: 'save-config', scan_lpn_on_picking: false });
assert(badLpn.status === 400, 'mandatory LPN configuration was not enforced');
const saved = await request('/ajio', 'PUT', { ...config, action: 'save-config', password: 'not-stored' });
assert(saved.status === 200 && saved.data.password_configured && !('password' in saved.data), 'credential configuration failed or retained a secret');

const mappings = await request('/ajio?entity=mappings'); const unmapped = mappings.data.find((row) => row.mapping_status === 'Un-Mapped');
const mapped = await request('/ajio', 'PUT', { action: 'map-sku', id: unmapped.id, sku_code: 'BACKPACK-GRY' });
assert(mapped.status === 200 && mapped.data.mapping_status === 'Mapped', 'SKU mapping failed');
const sync = await request('/ajio', 'POST', { action: 'inventory-sync' });
assert(sync.status === 200 && sync.data.count === 3, 'mapped inventory synchronization failed');

const inventoryBefore = await request('/inventory?warehouse=Delhi%20NCR');
const tshirtBefore = inventoryBefore.data.find((row) => row.sku_code === 'TSHIRT-BLK-M');
const pulled = await request('/ajio', 'POST', { action: 'pull-backorders' });
assert(pulled.status === 200 && pulled.data.count === 1, 'order pendency pull failed');
const inventoryAfter = await request('/inventory?warehouse=Delhi%20NCR');
const tshirtAfter = inventoryAfter.data.find((row) => row.sku_code === 'TSHIRT-BLK-M');
assert(tshirtAfter.available === tshirtBefore.available - 4 && tshirtAfter.reserved === tshirtBefore.reserved + 4, 'backorder did not reserve inventory');
const duplicatePull = await request('/ajio', 'POST', { action: 'pull-backorders' });
assert(duplicatePull.status === 404, 'repeat pendency pull was not blocked');

const backorders = await request('/ajio?entity=backorders'); const reserved = backorders.data.find((row) => row.status === 'Reserved');
const released = await request('/ajio', 'POST', { action: 'release-po', id: reserved.id });
assert(released.status === 201 && released.data.status === 'Allocated', 'AJIO PO did not create an allocated sales order');
const duplicateRelease = await request('/ajio', 'POST', { action: 'release-po', id: reserved.id });
assert(duplicateRelease.status === 409, 'duplicate AJIO PO release was not blocked');
const saleOrders = await request('/sale-orders');
assert(saleOrders.data.some((row) => row.external_order_no === reserved.ajio_po_no && row.channel === 'AJIO'), 'AJIO sales-order downstream mapping missing');
const fulfillment = await request('/fulfillment');
assert(fulfillment.data.filter((row) => row.ajio_order_id === released.data.id).length === released.data.lines.length, 'AJIO fulfillment lines were not allocated');

const orders = await request('/ajio?entity=orders'); const seedOrder = orders.data.find((row) => row.ajio_po_no === '40184240');
const picklist = await request('/ajio', 'POST', { action: 'generate-picklist', order_ids: [seedOrder.id, released.data.id] });
assert(picklist.status === 201 && picklist.data.deliveries.length === 2 && new Set(picklist.data.deliveries.map((row) => row.ajio_po_no)).size === 2, 'one-delivery-per-PO picklist mapping failed');
const first = picklist.data.deliveries.find((row) => row.ajio_po_no === '40184240'); const second = picklist.data.deliveries.find((row) => row.id !== first.id);

const scanOne = await request('/ajio', 'POST', { action: 'scan', delivery_id: first.id, lpn: 'AJIO-BOX-01', sku_code: 'TSHIRT-BLK-M', qty: 2 });
assert(scanOne.status === 200 && scanOne.data.status === 'Processing', 'first LPN scan failed');
const crossShipment = await request('/ajio', 'POST', { action: 'scan', delivery_id: second.id, lpn: 'AJIO-BOX-01', sku_code: second.lines[0].sku_code, qty: 1 });
assert(crossShipment.status === 409, 'cross-shipment Box ID was not rejected');
const partialScan = await request('/ajio', 'POST', { action: 'scan', delivery_id: second.id, lpn: 'AJIO-BOX-03', sku_code: second.lines[0].sku_code, qty: 1 });
assert(partialScan.status === 200 && partialScan.data.status === 'Processing', 'partial scan for Delivery Split failed');
const split = await request('/ajio', 'POST', { action: 'delivery-split', delivery_id: second.id });
assert(split.status === 201 && split.data.split_from === second.delivery_no && split.data.ajio_po_no === second.ajio_po_no && split.data.lines.every((line) => line.picked_qty === 0), 'pending quantities were not moved to a new delivery');
const scanTwo = await request('/ajio', 'POST', { action: 'scan', delivery_id: first.id, lpn: 'AJIO-BOX-02', sku_code: 'BOTTLE-STL-1L', qty: 1 });
assert(scanTwo.status === 200 && scanTwo.data.status === 'Picked', 'multi-box picking did not complete');
await request('/ajio', 'POST', { action: 'close-box', delivery_id: first.id, lpn: 'AJIO-BOX-01' });
await request('/ajio', 'POST', { action: 'close-box', delivery_id: first.id, lpn: 'AJIO-BOX-02' });
const closedMutation = await request('/ajio', 'POST', { action: 'scan', delivery_id: first.id, lpn: 'AJIO-BOX-01', sku_code: 'TSHIRT-BLK-M', qty: 1 });
assert(closedMutation.status === 409, 'closed box modification was not blocked');

const packed = await request('/ajio', 'POST', { action: 'pack', delivery_id: first.id });
assert(packed.status === 200 && packed.data.child_awbs.length === 2 && packed.data.master_awb === packed.data.child_awbs[0] && packed.data.invoice_no.startsWith(config.b2b_invoice_series), 'invoice/child/master AWB generation failed');
const cancelPacked = await request('/ajio', 'POST', { action: 'cancel', delivery_id: first.id });
assert(cancelPacked.status === 409, 'post-pack cancellation was not blocked');

const manifest = await request('/ajio', 'POST', { action: 'request-manifest', delivery_ids: [first.id] });
assert(manifest.status === 201 && manifest.data.shipment_count === 1 && manifest.data.box_count === 2, 'Request Manifest failed');
const partialManifest = await request('/ajio', 'POST', { action: 'request-manifest', delivery_ids: [second.id] });
assert(partialManifest.status === 409, 'partial shipment manifest was not blocked');
const handover = await request('/ajio', 'POST', { action: 'handover', manifest_id: manifest.data.id });
assert(handover.status === 200 && handover.data.status === 'Handed Over', 'manifest handover failed');
const deliveries = await request('/ajio?entity=deliveries');
assert(deliveries.data.find((row) => row.id === first.id).status === 'Shipped', 'handover did not mark delivery Shipped');

console.log(JSON.stringify({
  checks: 25,
  seller_id_validation: 'passed',
  secrets_persisted: false,
  reserved_po: reserved.ajio_po_no,
  generated_sales_order: released.data.sales_order_no,
  picklist: picklist.data.picklist_no,
  deliveries: picklist.data.deliveries.map((row) => row.delivery_no),
  split_delivery: split.data.delivery_no,
  boxes: packed.data.boxes.map((box) => box.lpn),
  master_awb: packed.data.master_awb,
  child_awbs: packed.data.child_awbs,
  invoice: packed.data.invoice_no,
  manifest: manifest.data.manifest_no,
  final_status: 'Shipped',
  blocked_paths: ['email seller ID', 'mandatory LPN settings off', 'repeat pendency pull', 'repeat PO release', 'cross-shipment LPN', 'closed-box mutation', 'post-pack cancellation', 'partial manifest'],
}, null, 2));
