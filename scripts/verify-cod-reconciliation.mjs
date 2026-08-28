import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const request = async (body) => { const response = await fetch(`${base}/api/cod-reconciliation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { response, data: await response.json() }; };
const metadata = await (await fetch(`${base}/api/cod-reconciliation`)).json();
assert.equal(metadata.transporters.length, 336);
assert.deepEqual(metadata.pageSizes, [20, 50, 100, 200]);
assert.deepEqual(metadata.reconciliation.map((item) => item.label), ['--- Select ---', 'No', 'Yes']);
let result = await request({ rows: 20, page: 1, REQ_SEARCH_FLAG: true, transporterName: '-1' });
assert.equal(result.response.status, 400); assert.equal(result.data.error, 'Please select transporter');
for (const rows of [20, 50, 100, 200]) {
  result = await request({ rows, page: 1, sidx: '', sord: 'asc', REQ_SEARCH_FLAG: true, transporterName: '1107', isReconcile: '-1' });
  assert.equal(result.response.status, 200); assert.ok(result.data.rows.length <= rows);
  for (const key of ['rows', 'total', 'page', 'records']) assert.ok(key in result.data);
}
assert.ok(result.data.rows.length, 'Delhivery catalogue search should return local COD rows');
const row = result.data.rows[0];
result = await request({ action: 'reconcile', items: [] }); assert.equal(result.data.error, 'Please Select Record For Process.');
result = await request({ action: 'force-reconcile', flag: 'ForceReconcile', cODReconciliationGridData: `${row.delNo}|${row.orderNo}`, items: [row] });
assert.equal(result.response.status, 200); assert.equal(result.data.successFailList[0].isReconcile, 'Yes');
result = await request({ rows: 200, page: 1, REQ_SEARCH_FLAG: true, transporterName: '1107', isReconcile: '1' });
assert.ok(result.data.rows.some((item) => item.id === row.id && item.isReconcile === 'Yes'));
result = await request({ action: 'import', cODReconciliationImport: 'NONEXISTENT-TRACKING,100,0,0' });
assert.equal(result.data.successFailList[0].importStatus, 'Invalid Data');
result = await request({ action: 'import', cODReconciliationImport: Array.from({ length: 501 }, (_, index) => `T${index},1,0,0`).join('\n') });
assert.equal(result.response.status, 400); assert.equal(result.data.error, 'Maximum 500 records can be imported at a time');
result = await request({ action: 'export', gridDataLen: 1, filters: { transporterName: '1107' } });
assert.match(result.data.reportId, /^COD-/);

const browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
page.setDefaultTimeout(8000); page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('cod-recon'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha);
  await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard'); await page.goto(`${base}/app/cod-reconciliation`);
  for (const label of ['Search', 'Reset', 'Reconcile', 'Force Reconcile', 'Download', 'Upload tracking No']) await page.getByRole('button', { name: label, exact: true }).waitFor();
  for (const heading of ['Web Order No', 'Ship Date', 'Tracking No', 'Transporter', 'Collectable amount', 'Payment reconciled', 'Cash', 'Credit Card', 'Coupon', 'Received Amount', 'Status', 'Source']) await page.getByRole('columnheader', { name: heading, exact: true }).first().waitFor();
  assert.equal(await page.getByLabel('Transporter').locator('option').count(), 337);
  assert.deepEqual(await page.getByLabel('Page size').locator('option').allTextContents(), ['20', '50', '100', '200']);
  await page.getByRole('button', { name: 'Search', exact: true }).click(); await page.getByText('Please select transporter').waitFor();
  await page.getByRole('button', { name: 'Reconcile', exact: true }).click(); await page.getByText('Please Select Record For Process.').waitFor();
  await page.getByRole('button', { name: 'Download', exact: true }).click(); await page.getByText('No Data In Grid To Export').waitFor();
  await page.getByRole('button', { name: 'Upload tracking No', exact: true }).click(); const dialog = page.getByRole('dialog', { name: 'Import' });
  await dialog.getByText('Atleast one of Collected amt Cash,Collected amt CC,Collected amt Coupon is mandatory').waitFor();
  await dialog.getByRole('button', { name: 'OK', exact: true }).click(); await page.getByText('Nothing To Import').waitFor();
  await dialog.getByLabel('COD Reconciliation Import').fill('NONEXISTENT-TRACKING,100,0,0'); await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByText('Invalid Data.').waitFor(); assert.equal(await page.getByLabel('Failed Imports').inputValue(), 'NONEXISTENT-TRACKING, Invalid Data');
  await page.getByLabel('Transporter').selectOption('1107'); await page.getByRole('button', { name: 'Search', exact: true }).click(); await page.getByText(/View 1 -/).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS COD Reconciliation: exact 336-option transporter catalogue, inline filters/columns, required/selection/import/export validations, paging, reconcile/force persistence, import failure UI, Pending Report export, and clean console.');
} finally { await browser.close(); }
