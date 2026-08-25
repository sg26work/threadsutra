import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
for (const size of [20, 50, 100, 200]) {
  const response = await fetch(`${base}/api/cod-reconciliation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: size, page: 1, sidx: '', sord: 'asc', REQ_SEARCH_FLAG: true }) });
  assert.equal(response.status, 200); const body = await response.json(); assert.ok(body.rows.length <= size);
  for (const key of ['rows', 'total', 'page', 'records']) assert.ok(key in body);
}
const browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('cod-recon'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/cod-reconciliation`);
  for (const action of ['Search', 'Reset', 'Reconcile', 'Force Reconcile', 'Download', 'Upload tracking No']) await page.getByRole('button', { name: action, exact: true }).waitFor();
  for (const field of ['Web Order No', 'Ship Date', 'Tracking No', 'Transporter', 'Payment reconciled']) await page.getByLabel(field, { exact: true }).waitFor();
  for (const heading of ['Web Order No', 'Del No', 'Collectable amount', 'Collected amount', 'Cash', 'Credit Card', 'Coupon', 'Received Amount', 'Status', 'Source']) await page.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Search', exact: true }).click(); assert.deepEqual(errors, []);
  console.log('PASS COD Reconciliation: live actions, filters, columns, paging, dedicated API, and clean browser state.');
} finally { await browser.close(); }
