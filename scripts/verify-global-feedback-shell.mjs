import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'feedback-verifier' })));
  await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const active = () => page.locator('[data-screen-frame][aria-hidden="false"]');
  const go = async (path, label) => {
    await page.evaluate((nextPath) => { history.pushState({}, '', nextPath); dispatchEvent(new PopStateEvent('popstate')); }, path);
    await page.locator(`[data-screen-frame="${label}"][aria-hidden="false"]`).waitFor();
  };

  await go('/app/m/price-zone', 'Price Zone Master');
  await active().getByRole('button', { name: 'Add New', exact: true }).click();
  await active().getByRole('dialog', { name: 'Add Price Zone' }).getByRole('button', { name: 'Save', exact: true }).click();
  let banner = page.getByRole('alert');
  await banner.getByText('Please select price zone Group', { exact: true }).waitFor();
  assert.equal(await active().locator('#priceZoneGroup').evaluate((element) => element === document.activeElement), true);
  const box = await banner.boundingBox();
  assert.ok(box && Math.abs(box.width - 302) < 1 && Math.abs(box.y - 52) < 1, 'LIVE-sized top-right error banner expected');
  await banner.getByRole('button', { name: 'Dismiss message' }).click();

  let pricePost = 0;
  await page.route('**/api/price-zones', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    pricePost += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pricePost === 1 ? { id: 999 } : { rows: [], page: 0, total: 0, records: 0 }) });
  });
  const priceDialog = active().getByRole('dialog', { name: 'Add Price Zone' });
  await priceDialog.getByLabel('Price Zone Group').selectOption({ label: 'Price Zone Group One' });
  await priceDialog.getByLabel('Price Zone', { exact: true }).fill('Feedback Probe');
  await priceDialog.getByLabel('Margin Percent', { exact: true }).fill('1.250');
  await priceDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('status').getByText('Price Zone saved successfully', { exact: true }).waitFor();
  assert.equal(await page.getByRole('status').getAttribute('data-feedback-type'), 'ok');
  await page.getByRole('button', { name: 'Dismiss message' }).click();

  await go('/app/m/vendor-promotions', 'Vendor Promotions');
  await active().getByRole('button', { name: 'Export', exact: true }).click();
  banner = page.getByRole('alert');
  await banner.getByText('No data found', { exact: true }).waitFor();
  await banner.getByRole('button', { name: 'Dismiss message' }).click();

  await page.route('**/api/jsonExternalAppsSearch**', (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'External Apps feedback probe' }) }));
  await go('/app/m/external-apps', 'External Apps');
  await active().getByRole('main').getByRole('button', { name: 'Search', exact: true }).click();
  banner = page.getByRole('alert');
  await banner.getByText('External Apps feedback probe', { exact: true }).waitFor();

  // Parent-shell feedback remains visible while switching retained module frames.
  await active().getByRole('button', { name: 'Price Zone Master', exact: true }).first().click();
  await page.waitForURL('**/app/m/price-zone');
  await page.getByText('External Apps feedback probe', { exact: true }).waitFor();
  console.log('Global feedback shell verified across Price Zone Master, Vendor Promotions, and External Apps.');
} finally {
  await browser.close();
}
