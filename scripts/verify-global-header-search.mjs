import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'header-search-verifier' })));
  const requests = [];
  page.on('request', (request) => { if (request.url().endsWith('/api/jsonOrderExits')) requests.push(request.postDataJSON()); });
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const active = page.locator('[data-screen-frame][aria-hidden="false"]');
  const select = active.getByLabel('Search Type');
  assert.deepEqual(await select.locator('option').allTextContents(), ['Web Order No', 'AWB No', 'Sub Order No', 'PO No', 'LPN No', 'Reverse AWB No', 'Invoice No']);
  assert.deepEqual(await select.locator('option').evaluateAll((options) => options.map((option) => option.value)), ['1', '2', '3', '4', '5', '6', '7']);
  const selectRect = await select.boundingBox(), inputRect = await active.getByLabel('Global Search').boundingBox();
  assert.equal(Math.round(selectRect.width), 105); assert.equal(Math.round(selectRect.height), 24);
  assert.equal(Math.round(inputRect.width), 105); assert.equal(Math.round(inputRect.height), 24);
  await active.getByRole('button', { name: 'Search', exact: true }).click();
  assert.equal(requests.length, 0, 'Blank LIVE header searches do nothing');
  await select.selectOption('6');
  assert.equal(await active.getByLabel('Global Search').getAttribute('placeholder'), 'Enter RVAWB No');
  await active.getByLabel('Global Search').fill('__PARITY_NOT_FOUND__');
  await active.getByLabel('Global Search').press('Enter');
  await page.getByText('Reverse Awb No does not exists in system.').waitFor();
  assert.deepEqual(requests.at(-1), { orderno: '__PARITY_NOT_FOUND__', searchType: '6' });
  for (const title of ['Switch Location', 'Open Screen(s)', 'Toggle Full-Screen', 'Export Report Status']) {
    const rect = await active.getByTitle(title).boundingBox();
    assert.equal(Math.round(rect.width), 42); assert.equal(Math.round(rect.height), 50);
  }
  console.log('Global LIVE-style header search options, geometry, blank behavior, request payload, error feedback, and action-cell geometry verified.');
} finally {
  await browser.close();
}
