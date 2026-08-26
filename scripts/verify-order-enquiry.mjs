import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const post = async (body, method = 'POST') => {
  const response = await fetch(`${base}/api/order-enquiry`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { response, data: await response.json() };
};

for (const [queue, sizes, extra] of [
  ['all', [20, 50, 100, 200], { fromOrderDate: '2024-01-01', toOrderDate: '2024-12-31' }],
  ['failed', [20, 50, 100], { orderNo: 'SO10004523' }],
  ['cancelled', [20, 50, 100, 200, 300], { fromDate: '2024-01-01', toDate: '2024-12-31' }],
  ['shipments', [20, 50, 100], {}],
]) for (const rows of sizes) {
  const { response, data } = await post({ REQ_SEARCH_FLAG: true, queue, rows, page: 1, ...extra });
  assert.equal(response.status, 200);
  assert.ok(data.rows.length <= rows);
  for (const key of ['rows', 'total', 'page', 'records']) assert.ok(key in data);
}

let result = await post({ REQ_SEARCH_FLAG: true, queue: 'failed' });
assert.equal(result.response.status, 400);
assert.equal(result.data.error, 'Any of search field is mandatory');
result = await post({ REQ_SEARCH_FLAG: true, queue: 'cancelled' });
assert.equal(result.response.status, 400);
assert.equal(result.data.error, 'Please fill all mandatory fields');
result = await post({ action: 'force-pull', ids: [3] }, 'PUT');
assert.equal(result.response.status, 200);
result = await post({ REQ_SEARCH_FLAG: true, queue: 'failed', orderNo: 'SO10004523' });
assert.equal(result.data.rows[0].status, 'force pull initiated');
result = await post({ action: 'retry', ids: [3] }, 'PUT');
assert.equal(result.response.status, 200);
result = await post({ REQ_SEARCH_FLAG: true, queue: 'shipments', orderNo: 'SO10004523' });
assert.equal(result.data.rows[0].transmit_status, 'Pending');

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('OrderImport');
sheet.addRow(['Order No', 'Order Date', 'Channel', 'Status']);
sheet.addRow(['SO-IMPORT-VERIFY', '2026-08-26', 'Website', 'Pending']);
const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
result = await post({ action: 'import-file', fileName: 'VIN_REP_OrderImport_USPL.xlsx', base64: xlsx.toString('base64') });
assert.equal(result.response.status, 201);
assert.equal(result.data.created, 1);
const importBatchId = result.data.batchId;
result = await post({ action: 'import-jobs', uploadDate: '', rows: 20, page: 1 });
assert.equal(result.response.status, 400);
assert.equal(result.data.error, 'Upload Date is mendatory');
result = await post({ action: 'import-jobs', uploadDate: '26/08/2026', importType: 'OrderImport', rows: 20, page: 1 });
assert.equal(result.response.status, 200);
assert.ok(result.data.rows.some((x) => x.file_name === 'VIN_REP_OrderImport_USPL.xlsx'));
result = await post({ action: 'import-details', batchId: String(importBatchId), rows: 20, page: 1 });
assert.equal(result.response.status, 200);
assert.equal(result.data.rows[0].batch_id, String(importBatchId));
result = await post({ REQ_SEARCH_FLAG: true, queue: 'all', orderNo: 'SO-IMPORT-VERIFY' });
assert.equal(result.data.rows[0].order_no, 'SO-IMPORT-VERIFY');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
try {
  await page.goto(base);
  const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('orders');
  await page.getByPlaceholder('Password').fill('local');
  await page.getByPlaceholder('Enter captcha').fill(captcha);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/order-enquiry`);
  const tabs = page.locator('.flex.border-b.bg-white');
  for (const name of ['All', 'Failed Orders', 'Cancelled Picked Orders', 'Failed Shipments']) await tabs.getByRole('button', { name, exact: true }).waitFor();
  assert.deepEqual(await page.getByLabel('Pending Orders').locator('option').allTextContents(), ['--- Select ---', 'Stock Pending Orders', 'Processing Orders', 'SLA Breaching Today', 'SLA Breaching in 24 hrs', 'SLA Breaching in 48 hrs', 'SLA Breached']);
  await page.getByLabel('Order No', { exact: true }).fill('SO-IMPORT-VERIFY');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const importedRow = page.getByRole('row').filter({ hasText: 'SO-IMPORT-VERIFY' }).first();
  await importedRow.waitFor();
  const views = importedRow.getByRole('button', { name: 'View', exact: true });
  await views.nth(0).click(); await page.getByText('Order Activity Log', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Close' }).click();
  await views.nth(1).click(); await page.getByText('Multiple SubID', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Close' }).click();
  await views.nth(2).click(); await page.getByText(/Order level Pick\/Ship instruction/).waitFor(); await page.getByRole('button', { name: 'Close' }).click();
  await views.nth(3).click(); await page.getByText('Payment Details', { exact: true }).last().waitFor(); await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Advance Search' }).click();
  for (const label of ['Source Warehouse', 'BarCode SkuCode', 'Discount Code', 'Priority', 'In Process', 'Customer Code', 'PO Code', 'Replacement', 'Transporter Status', 'Verification Reasons', 'Fulfilled By', 'Order Source', 'Customer Email', 'Customer Phone', 'Brand', 'Channel Name', 'Is C&C', 'Vendor Code', 'Virtual Bundle Order(s)', 'Order Processing', 'Virtual Bom SKU', 'Ext Customer Code']) await page.getByLabel(label, { exact: true }).waitFor();
  await page.getByLabel('Ext Customer Code').fill('999999');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText('The external customer code 999999 is not permitted.').waitFor();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  for (const name of ['Import', 'Download', 'File Detail']) await page.getByRole('button', { name, exact: true }).last().waitFor();
  await page.getByRole('button', { name: 'Import', exact: true }).last().click();
  await page.getByText('No file chosen to import.').waitFor();
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await page.getByLabel('Upload Date').fill('');
  await page.getByRole('button', { name: 'Search', exact: true }).last().click();
  await page.getByText('Upload Date is mendatory').waitFor();
  await page.getByLabel('Upload Date').fill('26/08/2026 - 26/08/2026');
  await page.getByRole('button', { name: 'Search', exact: true }).last().click();
  await page.getByRole('columnheader', { name: 'Request Id', exact: true }).waitFor();
  await page.getByRole('button', { name: 'File Detail', exact: true }).click();
  await page.getByLabel('Batch Id').fill(String(importBatchId));
  await page.getByRole('button', { name: 'Search', exact: true }).last().click();
  await page.getByRole('columnheader', { name: 'Generated Key', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  await tabs.getByRole('button', { name: 'Failed Orders' }).click();
  for (const header of ['Client', 'Order No', 'Channel Order Id', 'Date Created', 'Issue Description', 'IntCode']) await page.getByRole('columnheader', { name: header, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText('Any of search field is mandatory').waitFor();
  await page.getByRole('button', { name: 'ForcePull Order' }).click();
  await page.getByText('Please select atleast one row to proceed.').waitFor();
  await tabs.getByRole('button', { name: 'Cancelled Picked Orders' }).click();
  for (const header of ['Pick List', 'SKU Code', 'Unallocation Date', 'Previous Status', 'From LPN', 'Putaway Done']) await page.getByRole('columnheader', { name: header, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Generate PutAway' }).click();
  await page.getByText('Nothing selected to generate putaway').waitFor();
  await tabs.getByRole('button', { name: 'Failed Shipments' }).click();
  for (const header of ['Type', 'External Order No', 'Delivery No', 'Pigeon Hole', 'Pack Date', 'Error Desc']) await page.getByRole('columnheader', { name: header, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Retry' }).click();
  await page.getByText('Please select atleast one row to proceed').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS Order Enquiry: distinct four-tab contracts, advanced fields, exact validations/actions, XLSX persistence, nested Common Import, paging, and clean browser state.');
} finally {
  await browser.close();
}
