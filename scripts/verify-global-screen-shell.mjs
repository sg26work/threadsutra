import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'shell-verifier' })));
  await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: 'domcontentloaded' });

  const active = () => page.locator('[data-screen-frame][aria-hidden="false"]');
  const count = async () => `You have ${await active().getByTitle('Open Screen(s)').getAttribute('data-screen-count')} Open Screen(s)`;
  const go = async (path) => {
    await page.evaluate((nextPath) => {
      history.pushState({}, '', nextPath);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
  };
  await active().getByTitle('Open Screen(s)').waitFor();
  assert.equal(await count(), 'You have 1 Open Screen(s)');
  await active().getByTitle('Open Screen(s)').click();
  assert.equal(await active().getByRole('button', { name: 'Close Dashboard' }).count(), 0, 'Dashboard must not be closable');
  await active().getByRole('button', { name: 'Close', exact: true }).click();

  const modules = [
    ['/app/m/price-zone', 'Price Zone Master'],
    ['/app/m/vendor-promotions', 'Vendor Promotions'],
    ['/app/m/external-apps', 'External Apps'],
  ];
  for (const [path, label] of modules) {
    await go(path);
    await active().getByRole('button', { name: label, exact: true }).first().waitFor();
    if (label === 'Price Zone Master') {
      await active().getByLabel('Search Type').selectOption('2');
      await active().getByRole('button', { name: 'Add New', exact: true }).click();
      await active().getByRole('dialog', { name: 'Add Price Zone' }).getByLabel('Price Zone Code', { exact: true }).fill('PERSIST-PRICE-ZONE');
    }
    if (label === 'Vendor Promotions') {
      await active().locator('#gs_vendorCode').fill('PERSIST-VENDOR');
      assert.equal(await active().getByLabel('Search Type').inputValue(), '2');
    }
  }
  assert.equal(await count(), 'You have 4 Open Screen(s)');

  // LIVE Back pops activation history without closing or remounting any screen.
  await active().getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForURL('**/app/m/vendor-promotions');
  assert.equal(await count(), 'You have 4 Open Screen(s)');
  assert.equal(await active().locator('#gs_vendorCode').inputValue(), 'PERSIST-VENDOR');
  await active().getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForURL('**/app/m/price-zone');
  assert.equal(await count(), 'You have 4 Open Screen(s)');
  assert.equal(await active().getByRole('dialog', { name: 'Add Price Zone' }).getByLabel('Price Zone Code', { exact: true }).inputValue(), 'PERSIST-PRICE-ZONE');

  // LIVE keeps inactive iframes mounted. LOCAL must preserve independent module state too.
  await active().getByRole('button', { name: 'Price Zone Master', exact: true }).first().click();
  await page.waitForURL('**/app/m/price-zone');
  assert.equal(await active().getByRole('dialog', { name: 'Add Price Zone' }).getByLabel('Price Zone Code', { exact: true }).inputValue(), 'PERSIST-PRICE-ZONE');
  await active().getByRole('button', { name: 'Vendor Promotions', exact: true }).first().click();
  await page.waitForURL('**/app/m/vendor-promotions');
  assert.equal(await active().locator('#gs_vendorCode').inputValue(), 'PERSIST-VENDOR');

  // Reopening a named screen activates the existing entry rather than adding a duplicate.
  await active().getByRole('button', { name: 'Vendor Promotions', exact: true }).first().click();
  await page.waitForURL('**/app/m/vendor-promotions');
  assert.equal(await count(), 'You have 4 Open Screen(s)');
  assert.equal(await active().getByRole('button', { name: 'Close Vendor Promotions' }).count(), 1);

  // Repeated activation is recorded, but LIVE truncates the history queue to 20.
  for (let index = 0; index < 22; index += 1) {
    const label = index % 2 === 0 ? 'Price Zone Master' : 'Vendor Promotions';
    await active().getByRole('button', { name: label, exact: true }).first().click();
    await page.waitForURL(index % 2 === 0 ? '**/app/m/price-zone' : '**/app/m/vendor-promotions');
    await page.locator(`[data-screen-frame="${label}"][aria-hidden="false"]`).waitFor();
  }
  await page.waitForURL('**/app/m/vendor-promotions');
  assert.equal(await active().getByRole('button', { name: 'Back' }).getAttribute('data-history-depth'), '20');

  // LIVE selects the preceding screen when the active screen closes.
  await active().getByRole('button', { name: 'Close Vendor Promotions' }).first().click();
  await page.waitForURL('**/app/m/price-zone');
  await active().getByTitle('Open Screen(s)').waitFor();
  assert.equal(await count(), 'You have 3 Open Screen(s)');
  assert.equal(await active().getByRole('button', { name: 'Vendor Promotions', exact: true }).count(), 0);

  // Closing an inactive screen does not switch away from the active screen.
  await active().getByRole('button', { name: 'Close External Apps' }).last().click();
  assert.match(page.url(), /\/app\/m\/price-zone$/);
  await active().getByTitle('Open Screen(s)').waitFor();
  assert.equal(await count(), 'You have 2 Open Screen(s)');

  console.log('Global screen shell and mounted state retention verified across Dashboard, Price Zone Master, Vendor Promotions, and External Apps.');
} finally {
  await browser.close();
}
