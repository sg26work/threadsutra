import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const masters = ['Subscribe HSN code', 'Brands', 'Materials', 'Size Group', 'Size', 'Color', 'State', 'Reasons', 'Tags', 'Payment Terms', 'Pigeon Hole Master', 'Excise Category', 'SKU Case Size', 'Packaging Type', 'SKU Fulfillment Type', 'Channel Configuration', 'Manage Currency', 'UOM', 'FnV Channel Master', 'Pick/Ship Instructions', 'Transpoter PickUp Location Mapping', 'Permanent LPN', 'Device Master', 'Store Promotion'];
const browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim(); await page.getByPlaceholder('Username').fill('other-masters'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard'); await page.goto(`${base}/app/m/other-masters`);
  for (const master of masters) await page.getByRole('button', { name: master, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Brands', exact: true }).click(); await page.getByLabel('Code').fill('READONLY'); await page.getByLabel('Name').fill('Read Only'); await page.getByRole('button', { name: 'Back to Other Masters' }).click();
  assert.equal(await page.getByRole('button', { name: 'Brands', exact: true }).isVisible(), true); assert.deepEqual(errors, []);
  console.log('PASS Other Masters: exact live launcher set, functional child navigation, and clean browser state.');
} finally { await browser.close(); }
