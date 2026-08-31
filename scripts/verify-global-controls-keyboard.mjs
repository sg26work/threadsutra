import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'controls-keyboard-verifier' })));
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const active = () => page.locator('[data-screen-frame][aria-hidden="false"]');
  const go = async (path, label) => {
    await page.evaluate((nextPath) => { history.pushState({}, '', nextPath); dispatchEvent(new PopStateEvent('popstate')); }, path);
    await page.locator(`[data-screen-frame="${label}"][aria-hidden="false"]`).waitFor();
  };

  const priceRequests = [];
  await page.route('**/api/price-zones', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    priceRequests.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [], page: 1, total: 0, records: 0 }) });
  });
  await go('/app/m/price-zone', 'Price Zone Master');
  const priceCode = active().locator('thead tr').nth(1).locator('th').nth(0).locator('input');
  assert.equal(await priceCode.count(), 1, 'Price Zone must expose one LIVE-style grid filter');
  await priceCode.fill('AUTO');
  await page.waitForTimeout(650);
  assert.equal(priceRequests.length, 1);
  assert.equal(priceRequests[0].priceZoneCode, 'AUTO');
  await priceCode.press('Enter');
  await page.waitForTimeout(150);
  assert.equal(priceRequests.length, 1, 'Price Zone Enter must be suppressed');
  await active().locator('thead tr').nth(1).locator('th').nth(5).locator('select').selectOption('Active');
  await page.waitForTimeout(50);
  assert.equal(priceRequests.length, 2, 'Price Zone dropdown must search immediately');

  const promotionRequests = [];
  await page.route('**/api/vendor-promotions', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    promotionRequests.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ gridModel: [], page: 1, total: 0, records: 0 }) });
  });
  await go('/app/m/vendor-promotions', 'Vendor Promotions');
  const vendorCode = active().locator('#gs_vendorCode');
  await vendorCode.fill('VENDOR-A');
  await page.waitForTimeout(650);
  assert.equal(promotionRequests.length, 0, 'Vendor text filter must remain manual until Enter');
  await vendorCode.press('Enter');
  await page.waitForTimeout(50);
  assert.equal(promotionRequests.length, 1);
  assert.equal(promotionRequests[0].vendorCode, 'VENDOR-A');
  await active().locator('#gs_status').selectOption('4');
  await page.waitForTimeout(50);
  assert.equal(promotionRequests.length, 2, 'Vendor dropdown must search immediately');

  const externalRequests = [];
  await page.route('**/api/jsonExternalAppsSearch**', async (route) => {
    externalRequests.push(Object.fromEntries(new URLSearchParams(route.request().postData() || '')));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rows: [], page: 1, total: 0, records: 0 }) });
  });
  await go('/app/m/external-apps', 'External Apps');
  await active().getByLabel('ExtApps Type').selectOption({ label: 'Accounting' });
  await page.waitForTimeout(50);
  assert.equal(externalRequests.at(-1).extapptype, 'F');
  await active().getByLabel('ExtApps Name').selectOption({ label: 'TALLY' });
  await page.waitForTimeout(50);
  assert.equal(externalRequests.at(-1).extid, '10');
  const beforeDescription = externalRequests.length;
  await active().getByLabel('ExtApps Desc').fill('manual-only');
  await page.waitForTimeout(650);
  assert.equal(externalRequests.length, beforeDescription, 'External Apps description must remain manual');

  console.log('Global control and keyboard behavior verified across Price Zone, Vendor Promotions, and External Apps.');
} finally {
  await browser.close();
}
