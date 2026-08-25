import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3002';
const send = async (body) => { const r = await fetch(`${base}/api/inbound-create-edit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { r, j: await r.json() }; };
const meta = await (await fetch(`${base}/api/inbound-create-edit`)).json();
assert.equal(meta.maxImportRows, 200); assert.deepEqual(meta.pickerPageSizes, [10, 20, 30, 50]); assert.ok(meta.purchaseOrders.length);
let x = await send({ action: 'po-search', rows: 20, page: 1, poNo: 'PO20003012' });
assert.equal(typeof x.j.rows, 'number'); assert.equal(x.j.rows, 20); assert.equal(x.j.records, 1);
x = await send({ action: 'po', poNo: '' }); assert.equal(x.j.error, 'PO No is mandatory');
x = await send({ action: 'po', poNo: 'PO20003012' }); assert.equal(x.j.poNo, 'PO20003012');
x = await send({ action: 'import', rows: [] }); assert.equal(x.j.error, 'Nothing To Import');
x = await send({ action: 'import', rows: Array.from({ length: 201 }, (_, i) => ({ sku_code: `S${i}`, rcvdUOMQty: 1 })) }); assert.equal(x.j.error, 'Max 200 lines are allowed at a time');
x = await send({ action: 'import', rows: [{ sku_code: 'INB-TEST-SKU', sku_name: 'Inbound Test SKU', rcvdUOMQty: 2 }] }); assert.equal(x.j.successItems, 1); const lines = x.j.DTOList;
x = await send({ action: 'save', poNo: '', lines }); assert.equal(x.j.error, 'PO No is mandatory');
x = await send({ action: 'save', poNo: 'PO20003012', vendor: 'NovaTech Electronics', warehouse: 'Bengaluru WH', lines }); assert.equal(x.r.status, 201); assert.equal(x.j.row.status, 'Pending Confirmation'); const row = x.j.row;
x = await send({ action: 'confirm', ...row, id: row.id, poNo: row.poNo, lines: row.lines }); assert.equal(x.j.row.status, 'Confirmed');
const loaded = await (await fetch(`${base}/api/inbound-create-edit?inboundNo=${encodeURIComponent(row.inboundNo)}`)).json(); assert.equal(loaded.inboundNo, row.inboundNo);

const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
try {
  await p.goto(base); const cap = (await p.locator('.font-mono').textContent()).trim(); await p.getByPlaceholder('Username').fill('legacy-inbound'); await p.getByPlaceholder('Password').fill('local'); await p.getByPlaceholder('Enter captcha').fill(cap); await p.getByRole('button', { name: 'Login' }).click(); await p.waitForURL('**/app/dashboard'); await p.goto(`${base}/app/r/inbound-create-edit`);
  await p.getByText(/screen will be deprecated on 25th Nov 2025/).waitFor(); await p.getByRole('button', { name: 'Add New', exact: true }).waitFor();
  for (const hidden of ['Save Document', 'Save', 'Confirm', 'Add New Row', 'Delete Row']) assert.equal(await p.getByRole('button', { name: hidden, exact: true }).count(), 0);
  for (const tab of ['Inbound Create/Edit', 'Import']) await p.getByRole('main').getByRole('button', { name: tab, exact: true }).waitFor(); await p.getByLabel('PO No', { exact: true }).waitFor();
  await p.getByLabel('Open PO picker').click(); for (const h of ['PO Number', 'External PO No', 'PO Qty', 'Vendor Name', 'Last modified date', 'Status', 'Delivery Location']) await p.getByRole('columnheader', { name: h, exact: true }).waitFor();
  for (const size of ['10', '20', '30', '50']) await p.getByLabel('PO Records per Page').selectOption(size); await p.getByRole('cell', { name: 'PO20003012', exact: true }).first().click(); await p.getByRole('button', { name: 'OK', exact: true }).click();
  for (const a of ['Save Document', 'Save', 'Confirm', 'Add New Row', 'Delete Row']) await p.getByRole('button', { name: a, exact: true }).waitFor();
  for (const label of ['Inbound No', 'Creation Date', 'GRN No', 'GRN Date', 'Invoice Qty', 'Status Changed Date', 'Received Qty', 'Inbound Charge', 'Vendor Code', 'Vendor Name']) await p.getByLabel(label, { exact: true }).waitFor();
  await p.getByRole('button', { name: 'Add New Row', exact: true }).click(); for (const h of ['SKU Code', 'SKU Name', 'PO Qty', 'Rcvd UOM Qty', 'Rcvd Qty', 'Invoice Qty', 'Bin Location', 'LPN', 'Unit Price', 'Line Amount', 'MRP', 'Expiry Date', 'Mfg date', 'Lottable04', 'Batch No', 'Lottable06']) await p.getByRole('columnheader', { name: h, exact: true }).waitFor();
  await p.getByRole('main').getByRole('button', { name: 'Import', exact: true }).first().click(); await p.getByLabel('Import Client').waitFor(); await p.getByLabel('Import PO No').waitFor(); await p.getByLabel('Import Type').waitFor(); await p.getByLabel('Upload Template').waitFor(); await p.getByText('**Note: Max 200 lines are allowed at a time', { exact: true }).waitFor();
  assert.equal(await p.locator('vite-error-overlay').count(), 0); assert.deepEqual(errors.filter((e) => !e.includes('status of 400')), []);
  console.log('PASS Inbound Create/Edit: live initial gating, PO picker/search/paging, loaded summary/actions, line grid, 200-line import tab, lifecycle, and clean browser state.');
} finally { await b.close(); }
