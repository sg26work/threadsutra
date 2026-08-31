import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'transporter-enquiry-audit' })));
  await page.goto(`${base}/app/transporters`, { waitUntil: 'domcontentloaded' });
  const module = page.locator('[data-screen-frame][aria-hidden="false"]').locator('main');
  for (const action of ['Search', 'Reset', 'Download', 'Add New']) await module.getByRole('button', { name: action, exact: true }).waitFor();
  assert.equal(await module.getByRole('button', { name: 'Import', exact: true }).count(), 0);
  assert.equal(await module.getByRole('button', { name: 'Export', exact: true }).count(), 0);
  const headers = await module.locator('thead tr').first().getByRole('columnheader').allTextContents();
  assert.deepEqual(headers.map((text) => text.replace(' ↑', '')), ['Transporter Code','Transporter Name','Transporter Company','Type','Country','State','City','Status']);
  assert.deepEqual(await module.getByLabel('transporter_type filter').locator('option').allTextContents(), ['--- Select ---','Courier','Own Fleet']);
  assert.deepEqual(await module.getByLabel('status filter').locator('option').allTextContents(), ['--- Select ---','InActive','Active']);
  assert.deepEqual(await module.getByTitle('Records per Page').locator('option').allTextContents(), ['20','50','100','200']);
  await module.getByLabel('transporter_code filter', { exact: true }).fill('ZZZ-NO-LOCAL-TRANSPORTER-999');
  await module.getByLabel('transporter_type filter').selectOption({ label: 'Courier' });
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/jsonTransporterEnquirySearch') && request.method() === 'POST');
  await module.getByRole('button', { name: 'Search', exact: true }).click();
  const request = await requestPromise;
  assert.match(request.headers()['content-type'], /^application\/x-www-form-urlencoded/);
  const payload = Object.fromEntries(new URLSearchParams(request.postData() || ''));
  assert.deepEqual({ transporterCode: payload.transporterCode, type: payload.type, status: payload.status, client: payload.client, flag: payload.REQ_SEARCH_FLAG, sidx: payload.sidx, sord: payload.sord, rows: payload.rows }, { transporterCode: 'ZZZ-NO-LOCAL-TRANSPORTER-999', type: '2', status: '-1', client: '0', flag: 'true', sidx: 'transCode', sord: 'asc', rows: '20' });
  const response = await request.response();
  const result = await response.json();
  assert.deepEqual({ gridModel: result.gridModel, page: result.page, records: result.records, rows: result.rows, total: result.total }, { gridModel: null, page: 1, records: 0, rows: 20, total: 0 });
  await module.getByRole('button', { name: 'Reset', exact: true }).click();
  await module.getByLabel('transporter_code filter', { exact: true }).evaluate((element) => new Promise((resolve, reject) => { const started = Date.now(); const check = () => element === document.activeElement ? resolve(true) : Date.now() - started > 1000 ? reject(new Error('Transporter Code did not receive focus after Reset')) : setTimeout(check, 10); check(); }));
  await module.getByRole('button', { name: 'Download', exact: true }).click();
  await page.getByText('No data found', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS Transporter Enquiry: exact LIVE actions, columns, catalogs, form request/response, reset focus, empty download state, and paging.');
} finally { await browser.close(); }
