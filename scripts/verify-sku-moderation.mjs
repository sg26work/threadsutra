import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
for (const size of [20, 50, 100, 200]) {
  const response = await fetch(`${base}/api/sku-moderation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: size, page: 1, sidx: '', sord: 'desc', REQ_SEARCH_FLAG: true, linkedUnlinkedFlag: '0', doFetchCount: true, clientId: '0', SearchChannelStatus: 'Active' }) });
  assert.equal(response.status, 200); const body = await response.json(); assert.ok(body.rows.length <= size);
  for (const key of ['rows', 'total', 'page', 'records']) assert.ok(key in body);
  assert.equal(body.linkedUnlinkedFlag, '0');
}
const missing = await fetch(`${base}/api/sku-moderation`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 0, linkedSkuCode: '' }) });
assert.equal(missing.status, 400); assert.equal((await missing.json()).error, 'Search SKU to link.');
const browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('sku-moderation'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/sku-moderation`); await page.getByText('Unmapped SKU', { exact: true }).waitFor();
  for (const action of ['Search', 'Reset', 'Advance Search', 'Export']) await page.getByRole('button', { name: action, exact: true }).waitFor();
  for (const heading of ['SKU Name', 'Channel', 'Seller SKU', 'ERetail Sku', 'Product ID', 'Pricing', 'Other Info', 'Action', 'Created Date']) await page.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Advance Search', exact: true }).click();
  for (const field of ['Client', 'Channel', 'SKU Name', 'Seller SKU', 'Product ID', 'Channel Price', 'Channel Status']) await page.getByLabel(field, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Search', exact: true }).click(); assert.deepEqual(errors, []);
  console.log('PASS SKU Moderation: cached-live request contract, unmapped grid, advanced filters, page sizes, link validation, export/reset, and clean browser state.');
} finally { await browser.close(); }
