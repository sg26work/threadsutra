import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.TAX_APPLICATION_TEST_URL || process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const post = async (body) => {
  const response = await fetch(`${base}/api/taxapp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, 200, `search returned ${response.status}`);
  return response.json();
};

const source = await readFile(new URL('../src/eretail/masters/TaxApplication.tsx', import.meta.url), 'utf8');
for (const token of ['REQ_SEARCH_FLAG', 'taxAuthority', 'IsFormCTax', 'IsFormHTax', 'Bulk Import', "navigate('/app/admin/common-import')", 'remote={pageModel}']) assert.ok(source.includes(token), `missing ${token}`);
for (const size of [20, 50, 100, 200]) {
  const result = await post({ rows: size, page: 1, sidx: 'taxCategory', sord: 'desc', taxGroupCode: '-1', taxZone: '-1', taxCategory: '-1', startDate: '', taxType: '-1', goodsDirection: '-1', taxAuthority: '', IsFormCTax: '-1', IsFormHTax: '-1', isActive: '-1', operationFlag: 'save', REQ_SEARCH_FLAG: true });
  assert.deepEqual(Object.keys(result).sort(), ['gridModel', 'page', 'records', 'rows', 'sidx', 'sord', 'total'].sort());
  assert.equal(result.page, 1); assert.ok(result.rows.length <= size); assert.equal(result.gridModel.length, result.rows.length);
}
const empty = await post({ rows: 20, page: 1, sidx: 'taxCategory', sord: 'desc', taxGroupCode: '-1', taxZone: '-1', taxCategory: '__NO_MATCH__', startDate: '', taxType: '-1', goodsDirection: '-1', taxAuthority: '', IsFormCTax: '-1', IsFormHTax: '-1', isActive: '-1', operationFlag: 'save', REQ_SEARCH_FLAG: true });
assert.equal(empty.records, 0); assert.deepEqual(empty.rows, []);

const browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); const errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); page.setDefaultTimeout(12_000);
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' }); const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('tax-application-e2e'); await page.getByPlaceholder('Password').fill('local-only'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/tax-application`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  for (const name of ['Search', 'Reset', 'Add New', 'Download', 'Bulk Import']) await page.getByRole('button', { name, exact: true }).waitFor();
  for (const heading of ['Tax Category', 'Tax Type', 'Tax Group Code', 'Goods Direction', 'Tax Authority', 'Tax Zone', 'Start Date', 'Is Active', 'Is Form C Tax', 'Is Form H Tax', 'From MRP', 'To MRP', 'Actions']) await page.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  const waitSearch = () => page.waitForResponse((response) => response.url().endsWith('/api/taxapp') && response.request().method() === 'POST');
  const selects = page.locator('thead select'); await selects.nth(1).selectOption({ label: 'Purchase' }); await Promise.all([waitSearch(), page.getByRole('button', { name: 'Search', exact: true }).click()]);
  await Promise.all([waitSearch(), page.getByRole('button', { name: 'Reset', exact: true }).click()]);
  for (const size of ['20', '50', '100', '200']) await Promise.all([waitSearch(), page.getByLabel('Records per Page').selectOption(size)]);
  await page.getByRole('button', { name: 'Add New', exact: true }).click(); const modal = page.locator('.fixed.inset-0.z-50');
  for (const label of ['Tax Category', 'Tax Type', 'Tax Group Code', 'Goods Direction', 'Tax Authority', 'Tax Zone', 'Start Date', 'From MRP', 'To MRP', 'Is Active', 'Is Form C Tax', 'Is Form H Tax']) await modal.locator('label').filter({ hasText: label }).first().waitFor();
  await modal.getByRole('button', { name: 'Cancel' }).click();
  assert.deepEqual(errors, [], errors.join('; '));
  console.log('PASS Tax Application: live search contract, server filters/response, paging sizes, grid, editor fields, and clean browser state.');
} finally { await browser.close(); }
