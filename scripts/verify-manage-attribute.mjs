import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
for (const size of [20, 50, 100, 200]) {
  const response = await fetch(`${base}/api/manage-attributes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: size, page: 1, sidx: 'attrPK.atribCode', sord: 'desc', pick_sku: '', attributeDescription: '', mandatory1: '-1', visible1: '-1', scope1: '-1', searchable1: '-1', active: '-1', REQ_SEARCH_FLAG: true }) });
  assert.equal(response.status, 200); const body = await response.json(); assert.ok(body.rows.length <= size); for (const key of ['rows', 'total', 'page', 'records']) assert.ok(key in body);
}
const browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('manage-attribute'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/m/manage-attribute`);
  for (const action of ['Search', 'Reset', 'Add New']) await page.getByRole('button', { name: action, exact: true }).waitFor();
  for (const field of ['Attribute Code', 'Description', 'Mandatory', 'Visible', 'Scope', 'Searchable', 'isActive']) await page.getByLabel(field, { exact: true }).waitFor();
  for (const heading of ['Attribute Code', 'Description', 'Mandatory', 'Input Type', 'Visible', 'Scope', 'Searchable']) await page.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Search', exact: true }).click(); await page.getByText(/No records to view|View 0 - 0 of 0/).first().waitFor();
  await page.getByRole('button', { name: 'Add New', exact: true }).click(); await page.getByRole('dialog').waitFor();
  assert.deepEqual(errors, []); console.log('PASS Manage Attribute: live enquiry fields, request contract, paging, Add New action, and clean browser state.');
} finally { await browser.close(); }
