import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'customer-enquiry-audit' })));
  await page.goto(`${base}/app/customers`, { waitUntil: 'domcontentloaded' });
  const module = page.locator('[data-screen-frame][aria-hidden="false"]').locator('main');
  for (const action of ['Search', 'Reset', 'Import', 'Export', 'Add New']) await module.getByRole('button', { name: action, exact: true }).waitFor();
  const headers = await module.locator('thead tr').first().getByRole('columnheader').allTextContents();
  assert.deepEqual(headers.map((text) => text.replace(' ↑', '')), ['Customer Code','Customer Name','Ext. Customer Code','Type','Status','GSTIN/TIN','Primary Contact','Primary Email','Created Date']);
  assert.deepEqual(await module.getByLabel('type filter').locator('option').allTextContents(), ['--- Select ---','0 - Last','1 - B2C','2 - B2B']);
  assert.deepEqual(await module.getByLabel('is_active filter').locator('option').allTextContents(), ['- Select -','InActive','Active']);
  assert.deepEqual(await module.getByTitle('Records per Page').locator('option').allTextContents(), ['20','50','100','200']);
  await module.getByLabel('customer_code filter', { exact: true }).fill('ZZZ-NO-LOCAL-CUSTOMER-999');
  await module.getByLabel('type filter').selectOption({ label: '1 - B2C' });
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/jsonCustEnqSearch') && request.method() === 'POST');
  await module.getByRole('button', { name: 'Search', exact: true }).click();
  const request = await requestPromise;
  assert.match(request.headers()['content-type'], /^application\/x-www-form-urlencoded/);
  const payload = Object.fromEntries(new URLSearchParams(request.postData() || ''));
  assert.equal(payload.customerCode, 'ZZZ-NO-LOCAL-CUSTOMER-999');
  assert.equal(payload.type, '1');
  assert.equal(payload.isActive, '-1');
  assert.equal(payload.client, '0');
  assert.equal(payload.REQ_SEARCH_FLAG, 'true');
  assert.equal(payload.sidx, 'id.customerCode');
  assert.equal(payload.sord, 'desc');
  assert.equal(payload.rows, '20');
  const response = await request.response();
  const result = await response.json();
  assert.deepEqual({ gridModel: result.gridModel, page: result.page, records: result.records, rows: result.rows, total: result.total }, { gridModel: null, page: 0, records: 0, rows: 20, total: 0 });
  await module.getByRole('button', { name: 'Reset', exact: true }).click();
  await module.getByLabel('customer_code filter', { exact: true }).evaluate((element) => new Promise((resolve, reject) => {
    const started = Date.now(); const check = () => element === document.activeElement ? resolve(true) : Date.now() - started > 1000 ? reject(new Error('Customer Code did not receive focus after Reset')) : setTimeout(check, 10); check();
  }));
  await module.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByText('No data found', { exact: true }).waitFor();
  await module.getByRole('button', { name: 'Import', exact: true }).click();
  await page.waitForURL('**/app/admin/common-import?ExternalImportType=70');
  assert.deepEqual(errors, []);
  console.log('PASS Customer Enquiry: exact LIVE actions, columns, catalogs, form request/response, reset focus, export empty state, paging, and Common Import 70 navigation.');
} finally { await browser.close(); }
