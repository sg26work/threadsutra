import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const post = async (body) => { const response = await fetch(`${base}/api/global-order-search`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { response, body: await response.json() }; };
const meta = await (await fetch(`${base}/api/global-order-search`)).json();
assert.deepEqual(meta.pageSizes, [20, 50, 100, 200]); assert.equal(meta.orderTypes.length, 41); assert.equal(meta.orderTags.length, 73); assert.equal(meta.merchantStatuses.length, 14); assert.equal(meta.marketplaceStatuses.length, 16); assert.equal(meta.merchantKey, 'SPGBLODRSRCH'); assert.equal(meta.marketplaceKey, 'SPGBLDSODRSRCH'); assert.equal(meta.maxDateRangeDays, 90);

let check = await post({ rows: 20, page: 1, REQ_SEARCH_FLAG: true, mode: 'merchant', key: 'SPGBLODRSRCH' });
assert.equal(check.response.status, 400); assert.equal(check.body.error, 'Please Provide Value For Either Order No ,Web Order No or Order Date.');
check = await post({ rows: 20, page: 1, REQ_SEARCH_FLAG: true, mode: 'marketplace', key: 'SPGBLDSODRSRCH', orderDate: '01/01/2026 - 28/08/2026' });
assert.equal(check.response.status, 400); assert.equal(check.body.error, 'Order Date range can not be greater than 90 days');
check = await post({ rows: 20, page: 1, REQ_SEARCH_FLAG: true, mode: 'merchant', key: 'SPGBLDSODRSRCH', orderNo: 'X' });
assert.equal(check.response.status, 400); assert.equal(check.body.error, 'key must be SPGBLODRSRCH for merchant mode');

const order = (await (await fetch(`${base}/api/sale-orders`)).json())[0]; assert.ok(order?.order_no);
for (const mode of ['merchant', 'marketplace']) for (const rows of [20, 50, 100, 200]) {
  const key = mode === 'marketplace' ? 'SPGBLDSODRSRCH' : 'SPGBLODRSRCH'; const result = await post({ rows, page: 1, sidx: 'o.OrderDate', sord: 'desc', REQ_SEARCH_FLAG: true, mode, key, orderNo: order.order_no });
  assert.equal(result.response.status, 200); assert.ok(result.body.rows.length <= rows); assert.equal(result.body.key, key); assert.ok(result.body.records >= 1); for (const name of ['gridModel', 'rows', 'page', 'records', 'total']) assert.ok(name in result.body);
}
check = await post({ action: 'export', mode: 'marketplace', key: 'SPGBLDSODRSRCH', rows: [] }); assert.equal(check.response.status, 400); assert.equal(check.body.error, 'No order available to download in search results.');
check = await post({ action: 'export', mode: 'marketplace', key: 'SPGBLDSODRSRCH', rows: [order], filters: { orderNo: order.order_no } }); assert.equal(check.response.status, 200); assert.match(check.body.reportId, /^GOR-/);

const browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim(); await page.getByPlaceholder('Username').fill('global-order'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/global-order-search`); const main = page.getByRole('main');
  assert.deepEqual(await main.getByLabel('Fulfillment Mode').locator('option').allTextContents(), ['By Merchant', 'By Marketplace']); assert.equal(await main.getByLabel('Fulfillment Mode').inputValue(), '2');
  for (const action of ['Search', 'Reset', 'Download']) await main.getByRole('button', { name: action, exact: true }).waitFor();
  for (const heading of ['Order No', 'Web Order No', 'Order Date', 'Timezone', 'Order Type', 'Customer Name', 'Ship City', 'Status', 'Order Amount', 'Tax Amt', 'Disc Amt', 'Order Tag', 'On Hold', 'Vendor', 'Vendor Mode']) await main.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  assert.equal(await main.getByLabel('Order Type').locator('option').count(), 41); assert.equal(await main.getByLabel('Order Tag').locator('option').count(), 73); assert.equal(await main.getByLabel('Status').locator('option').count(), 16); assert.deepEqual(await main.getByLabel('Page size').locator('option').allTextContents(), ['20', '50', '100', '200']);
  await main.getByRole('button', { name: 'Download', exact: true }).click(); await page.getByText('No order available to download in search results.', { exact: true }).waitFor();
  await main.getByRole('button', { name: 'Reset', exact: true }).click(); await main.getByRole('button', { name: 'Search', exact: true }).click(); await page.getByText('Please Provide Value For Either Order No ,Web Order No or Order Date.', { exact: true }).waitFor();
  await main.getByLabel('Fulfillment Mode').selectOption('1'); assert.equal(await main.getByRole('columnheader', { name: 'Timezone', exact: true }).count(), 0); assert.equal(await main.getByLabel('Vendor', { exact: true }).count(), 0); assert.equal(await main.getByLabel('Vendor Mode', { exact: true }).count(), 0); assert.equal(await main.getByLabel('Status').locator('option').count(), 14);
  await main.getByLabel('Order Date', { exact: true }).fill(''); await main.getByLabel('Order No', { exact: true }).fill(order.order_no); await main.getByRole('button', { name: 'Search', exact: true }).click(); const orderLink = main.getByRole('button', { name: order.order_no, exact: true }); await orderLink.waitFor(); await orderLink.click(); await page.waitForURL('**/app/order-maintenance?orderCode=*');
  await page.goto(`${base}/app/global-order-search`); await main.getByLabel('Order Date', { exact: true }).fill(''); await main.getByLabel('Order No', { exact: true }).fill(order.order_no); await main.getByRole('button', { name: 'Search', exact: true }).click(); const marketLink = main.getByRole('button', { name: order.order_no, exact: true }); await marketLink.waitFor(); await marketLink.click(); await page.waitForURL('**/app/market-order-view?orderNo=*');
  assert.equal(await page.locator('vite-error-overlay').count(), 0); assert.deepEqual(errors, []);
  console.log('PASS Global Order Search: exact live mode control/options, procedure keys, inline grids, required/date validations, conditional columns, paging, both row children, Pending Report export contract, and clean console.');
} finally { await browser.close(); }
