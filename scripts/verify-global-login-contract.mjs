import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base, { waitUntil: 'domcontentloaded' });

  await page.getByLabel('Login Id', { exact: true }).waitFor();
  await page.getByLabel('Password', { exact: true }).waitFor();
  for (const name of ['Login', 'Reset', 'Forgot?']) await page.getByRole('button', { name, exact: true }).waitFor();
  assert.equal(await page.getByText('Omni-channel OMS & WMS', { exact: true }).isVisible(), true);
  assert.equal(await page.getByText('Captcha', { exact: true }).count(), 0, 'LIVE login has no captcha control');
  assert.equal(await page.getByText(/Local mock authentication/i).count(), 0, 'Mock-auth copy is not present in LIVE');
  assert.equal(await page.getByText(/Multi-channel Order Management/i).count(), 0, 'Invented marketing copy is not present in LIVE');
  assert.equal(await page.locator('img[src*="lhs-panel-vin-seller-panel-mobile-app-june-26.jpg"]').count(), 1, 'Login side panel must use the observed LIVE image');

  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Login Failed. Invalid Login Credentials.' }).waitFor();
  await page.getByLabel('Login Id').fill('reset-check');
  await page.getByLabel('Password').fill('reset-check');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await page.getByLabel('Login Id').inputValue(), '');
  assert.equal(await page.getByLabel('Password').inputValue(), '');

  assert.equal(await page.getByRole('link', { name: 'Facebook' }).getAttribute('href'), 'https://www.facebook.com/VinculumGroup/');
  assert.equal(await page.getByRole('link', { name: 'Twitter' }).getAttribute('href'), 'https://twitter.com/Vin_Omnichannel');
  assert.equal(await page.getByRole('link', { name: 'LinkedIn' }).getAttribute('href'), 'https://www.linkedin.com/company/vinculumgroup/');
  assert.equal(await page.getByRole('link', { name: 'Refer Now' }).getAttribute('href'), 'https://www.vinculumgroup.com/customer-referral/');

  await page.getByLabel('Login Id').fill('login-contract');
  await page.getByLabel('Password').fill('local-adapter');
  await page.getByLabel('Password').press('Enter');
  await page.waitForURL('**/app/dashboard');
  console.log('Global login contract verified: LIVE fields, controls, reset, error message, links, and Enter submission.');
} finally {
  await browser.close();
}
