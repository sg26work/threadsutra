import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3002';
const send = async (body) => { const r = await fetch(`${base}/api/inbound-enquiry`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { r, j: await r.json() }; };
const meta = await (await fetch(`${base}/api/inbound-enquiry`)).json();
assert.deepEqual(meta.pageSizes, [20, 50, 100, 200]);
assert.deepEqual(meta.statuses.map((x) => x[1]), ['Pending Confirmation', 'Pending Hold', 'GRN In Process', 'Confirmed', 'Cancelled']);
assert.deepEqual(meta.inboundTypes.map((x) => x[1]), ['With QC', 'Against ASN', 'Delivered Return', 'Non Delivered Return', 'With PO', 'With STO', 'Without PO']);
let x = await send({ action: 'search', REQ_SEARCH_FLAG: true, rows: 20, page: 1, sidx: 'inbound0_.crtDate', sord: 'desc', fromGRNNo: 'GRN50001201' });
assert.equal(x.j.records, 1); const row = x.j.inboundList[0];
for (const rows of [20, 50, 100, 200]) {
  x = await send({ action: 'search', REQ_SEARCH_FLAG: true, rows, page: 1, sidx: 'inbound0_.crtDate', sord: 'desc', fromInboundNo: row.inboundNo });
  for (const k of ['inboundList', 'gridModel', 'rows', 'page', 'total', 'records', 'sidx', 'sord']) assert.ok(k in x.j);
  assert.equal(x.j.rows, rows); assert.equal(typeof x.j.rows, 'number'); assert.equal(x.j.records, 1);
}
x = await send({ action: 'search', REQ_SEARCH_FLAG: true, rows: 20, page: 1, ExtCustReturnNo: 'RET1', inboundType: '1' }); assert.match(x.j.error, /inbound type should be either/);
x = await send({ action: 'search', REQ_SEARCH_FLAG: true, rows: 20, page: 1, lotNoArr: Array.from({ length: 101 }, (_, i) => `LOT${i}`).join('\n') }); assert.equal(x.j.error, 'Max 100 Records Can Be Entered');
x = await send({ action: 'qc' }); assert.equal(x.j.error, 'Please select a row.');
x = await send({ action: 'qc', id: row.id }); assert.equal(x.j.jsonMessage, 'Inbound opened for QC');
x = await send({ action: 'putaway', id: row.id }); assert.ok(['PutAway generated successfully', 'Existing PutAway opened'].includes(x.j.jsonMessage));

const b = await chromium.launch({ headless: true }), p = await b.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
try {
  await p.goto(base); const cap = (await p.locator('.font-mono').textContent()).trim();
  await p.getByPlaceholder('Username').fill('inbound'); await p.getByPlaceholder('Password').fill('local'); await p.getByPlaceholder('Enter captcha').fill(cap); await p.getByRole('button', { name: 'Login' }).click();
  await p.waitForURL('**/app/dashboard'); await p.goto(`${base}/app/r/inbound-enquiry`);
  for (const a of ['Search', 'Reset', 'Advance Search', 'Add New', 'QC', 'PutAway']) await p.getByRole('button', { name: a, exact: true }).first().waitFor();
  for (const h of ['Inbound No', 'Ext Inbound No', 'STO No', 'ASN No', 'PO No', 'GRN No', 'Creation Date', 'Inbound Type', 'Invoice No', 'vendor', 'Status', 'QC Status', 'Inbound Location', 'Ext Return No', 'Ext Invoice No']) await p.getByRole('columnheader', { name: h, exact: true }).waitFor();
  for (const hidden of ['Client', 'Exp Qty', 'Receieved Qty']) assert.equal(await p.getByRole('columnheader', { name: hidden, exact: true }).count(), 0);
  const inputs = p.locator('thead input:not([type="checkbox"])'); assert.match(await inputs.nth(6).inputValue(), /^\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}$/);
  await p.getByRole('button', { name: 'Select vendor' }).click(); await p.getByText('Vendor', { exact: true }).last().waitFor(); await p.getByRole('button', { name: 'Close modal' }).click();
  for (const size of ['20', '50', '100', '200']) await p.getByLabel('Records per Page').selectOption(size);
  await p.getByRole('button', { name: 'QC', exact: true }).click(); await p.getByText('Please select a row.', { exact: true }).waitFor();
  await p.getByRole('button', { name: 'Advance Search', exact: true }).click();
  for (const label of ['Inbound No', 'GRN No', 'Vendor Code', 'Creation Date', 'GRN Date', 'Location Code', 'PO No', 'Status', 'Invoice No', 'Inbound Type', 'BarCode', 'SKUCode', 'Order No', 'Lot No', 'Hierarchy Code', 'USN', 'LPN']) await p.getByLabel(label, { exact: true }).last().waitFor();
  assert.equal(await p.getByLabel('Location Code', { exact: true }).isDisabled(), true); assert.equal(await p.getByLabel('BarCode', { exact: true }).isChecked(), true); assert.equal(await p.getByLabel('Order No', { exact: true }).isDisabled(), true);
  await p.getByLabel('Inbound Type', { exact: true }).last().selectOption({ label: 'Delivered Return' }); assert.equal(await p.getByLabel('Order No', { exact: true }).isEnabled(), true);
  await p.getByRole('button', { name: 'Open Vendor Code picker' }).click(); await p.getByText('Vendor', { exact: true }).last().waitFor(); await p.getByRole('button', { name: 'Close modal' }).click();
  await p.getByRole('button', { name: 'Open Lot No picker' }).click(); await p.getByLabel('Lot Numbers').fill(Array.from({ length: 101 }, (_, i) => `LOT${i}`).join('\n')); await p.getByRole('button', { name: 'Search', exact: true }).last().click(); await p.getByText('Max 100 Records Can Be Entered', { exact: true }).waitFor(); await p.getByRole('button', { name: 'Close modal' }).click();
  await p.getByRole('button', { name: 'Reset', exact: true }).first().click(); await p.getByRole('cell', { name: 'No records to view', exact: true }).waitFor();
  assert.equal(await p.locator('vite-error-overlay').count(), 0); assert.deepEqual(errors.filter((e) => !e.includes('status of 400')), []);
  console.log('PASS Inbound Enquiry: live-empty/default-date state, exact visible grid, API paging contract, advanced dependencies and pickers, action validation, reset, and clean browser state.');
} finally { await b.close(); }
