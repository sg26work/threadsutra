import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const response = await fetch(`${base}/api/tally-config`); assert.equal(response.status, 200); const snapshot = await response.json(); for (const key of ['config', 'aliases', 'sources', 'companies', 'audit']) assert.ok(key in snapshot);
const browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim(); await page.getByPlaceholder('Username').fill('tally'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard'); await page.goto(`${base}/app/tally-configuration`);
  for (const action of ['Save', 'Reset', 'Audit']) await page.getByRole('button', { name: action, exact: true }).first().waitFor(); await page.getByLabel('Company').waitFor();
  await page.getByRole('button', { name: 'Sales And Sales Return' }).waitFor(); await page.getByRole('button', { name: 'Purchase And Purchase Returns' }).click(); await page.getByText('Purchase Details', { exact: true }).waitFor(); await page.getByText('Purchase Return Details', { exact: true }).waitFor();
  assert.deepEqual(errors, []); console.log('PASS Tally Configuration: company, actions, sales/purchase mappings, API snapshot, and clean browser state.');
} finally { await browser.close(); }
