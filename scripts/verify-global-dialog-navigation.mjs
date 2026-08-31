import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'dialog-navigation-verifier' })));
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const active = () => page.locator('[data-screen-frame][aria-hidden="false"]');
  const go = async (path, label) => {
    await page.evaluate((nextPath) => { history.pushState({}, '', nextPath); dispatchEvent(new PopStateEvent('popstate')); }, path);
    await page.locator(`[data-screen-frame="${label}"][aria-hidden="false"]`).waitFor();
  };
  const assertSingleActive = async () => assert.equal(await page.locator('[data-screen-frame][aria-hidden="false"]').count(), 1, 'Exactly one screen frame must be active');

  await go('/app/m/price-zone', 'Price Zone Master');
  await active().getByRole('button', { name: 'Add New', exact: true }).click();
  const priceDialog = active().getByRole('dialog', { name: 'Add Price Zone' });
  await priceDialog.waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await priceDialog.isVisible(), true, 'Price Zone modal should not close on Escape, matching LIVE');
  await priceDialog.getByRole('button', { name: 'Close modal' }).click();

  await go('/app/m/vendor-promotions', 'Vendor Promotions');
  await active().getByRole('button', { name: 'Add New', exact: true }).click();
  await page.waitForURL('**/app/m/vendor-promotions?screen=editor');
  await page.locator('[data-screen-frame="Vendor Promotion Create/Edit"][aria-hidden="false"]').waitFor();
  await assertSingleActive();
  await active().getByLabel('Promo Code').fill('RETAIN-PROMO');
  await active().getByRole('button', { name: 'Vendor Promotions', exact: true }).last().click();
  await page.waitForURL('**/app/m/vendor-promotions');
  await page.locator('[data-screen-frame="Vendor Promotions"][aria-hidden="false"]').waitFor();
  await active().getByRole('banner').getByRole('button', { name: 'Vendor Promotion Create/Edit', exact: true }).click();
  await page.waitForURL('**screen=editor');
  assert.equal(await active().getByLabel('Promo Code').inputValue(), 'RETAIN-PROMO');
  await assertSingleActive();

  await go('/app/m/external-apps', 'External Apps');
  await active().getByRole('button', { name: 'Add New', exact: true }).click();
  await page.waitForURL('**/app/m/external-apps?screen=editor');
  await page.locator('[data-screen-frame="External Apps Create/Edit"][aria-hidden="false"]').waitFor();
  await active().getByLabel('ExtApps Desc').fill('RETAIN-EXTERNAL');
  await active().getByRole('banner').getByRole('button', { name: 'External Apps', exact: true }).click();
  await page.waitForURL('**/app/m/external-apps');
  await page.locator('[data-screen-frame="External Apps"][aria-hidden="false"]').waitFor();
  const hiddenExternal = page.locator('[data-screen-frame="External Apps Create/Edit"][aria-hidden="true"]');
  assert.equal(await hiddenExternal.getByLabel('ExtApps Desc').inputValue(), 'RETAIN-EXTERNAL', 'Hidden External Apps editor must retain draft state');
  await active().getByRole('banner').getByRole('button', { name: 'External Apps Create/Edit', exact: true }).click();
  await page.waitForURL('**screen=editor');
  await page.waitForFunction(() => document.querySelector('[data-screen-frame][aria-hidden="false"] input[aria-label="ExtApps Desc"]')?.value === 'RETAIN-EXTERNAL');
  assert.equal(await active().getByLabel('ExtApps Desc').inputValue(), 'RETAIN-EXTERNAL');
  await assertSingleActive();

  console.log('Global dialog/navigation behavior verified across Price Zone, Vendor Promotions, and External Apps.');
} finally {
  await browser.close();
}
