import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'seller-dashboard-audit' })));
  await page.goto(`${base}/app/seller-panel-dashboard`, { waitUntil: 'domcontentloaded' });
  const active = page.locator('[data-screen-frame][aria-hidden="false"]');
  assert.deepEqual(await active.getByLabel('Seller Mode').locator('option').evaluateAll((options) => options.map((option) => ({ value: option.value, text: option.textContent }))), [{ value: '1', text: 'Drop Ship' }, { value: '7', text: 'Mall Oneship' }, { value: '2', text: 'Vendor Self Delivery' }]);
  for (const label of ['Confirmed', 'Ready For Ship', 'Shipped', 'Returned', 'Cancelled', 'Order Flow - Last 7 Days', 'SKU For Replenishment - Top 5', 'Shipment VS Transporter - Last 30 Days', 'Top 5 SKUs Sold - Last 90 Days']) await active.getByText(label, { exact: true }).first().waitFor();
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/seller-panel-dashboard') && request.method() === 'POST');
  await active.getByLabel('Seller Mode').selectOption('7');
  const request = await requestPromise;
  assert.equal(request.postDataJSON().selectMode, '7');
  assert.equal(await active.getByText('No Records Found.', { exact: true }).count(), 2);
  assert.deepEqual(errors, []);
  console.log('Seller Panel Dashboard LIVE modes, zero-state cards, chart/table sections, POST contract, and clean browser state verified.');
} finally { await browser.close(); }
