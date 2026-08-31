import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'vendor-enquiry-audit' })));
  await page.goto(`${base}/app/vendors`, { waitUntil: 'domcontentloaded' });
  const active = page.locator('[data-screen-frame][aria-hidden="false"]');
  const module = active.locator('main');
  for (const action of ['Search', 'Reset', 'Import', 'Export', 'Add New']) await module.getByRole('button', { name: action, exact: true }).waitFor();
  const headers = await module.locator('thead tr').first().getByRole('columnheader').allTextContents();
  assert.deepEqual(headers.map((text) => text.replace(' ↑', '')), ['Vendor Code','Vendor Name','Vendor Type','Credit Days','Country','State','City','Status']);
  assert.deepEqual(await module.getByLabel('vendor_type filter').locator('option').allTextContents(), ['--- Select ---','B2S2','JIT','Marketplace','Outright purchase']);
  assert.deepEqual(await module.getByLabel('status filter').locator('option').allTextContents(), ['--- Select ---','Confirmed','Deactivated','Pending Confirmation']);
  assert.ok((await module.getByLabel('country filter').locator('option').count()) > 200, 'LIVE country catalog must not be replaced with a short generic list');
  assert.deepEqual(await module.getByTitle('Records per Page').locator('option').allTextContents(), ['20','50','100','200']);
  await module.getByRole('cell', { name: 'No records to view', exact: true }).waitFor();
  await module.getByLabel('vendor_code filter').fill('ZZZ-NO-LOCAL-MATCH-999');
  await module.getByLabel('vendor_type filter').selectOption({ label: 'Marketplace' });
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/jsonVendorEnquirySearch') && request.method() === 'POST');
  await module.getByRole('button', { name: 'Search', exact: true }).click();
  const payload = (await requestPromise).postDataJSON();
  assert.deepEqual(payload, { vendorCode:'ZZZ-NO-LOCAL-MATCH-999',vendorName:'',vendorType:'2',vendorShortName:'',paymentTerm:'',status:'',country:'',state:'',city:'',client:'0',REQ_SEARCH_FLAG:true,doFetchCount:false });
  await module.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await module.getByLabel('vendor_code filter').inputValue(), '');
  assert.equal(await module.getByLabel('vendor_type filter').inputValue(), '');
  await module.getByLabel('vendor_code filter').evaluate((element) => new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => element === document.activeElement ? resolve(true) : Date.now() - started > 1000 ? reject(new Error('Vendor Code did not receive focus after Reset')) : setTimeout(check, 10);
    check();
  }));
  await module.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByText('No data found', { exact: true }).waitFor();
  await module.getByRole('button', { name: 'Import', exact: true }).click();
  await page.waitForURL('**/app/admin/common-import?ExternalImportType=3');
  assert.deepEqual(errors, []);
  console.log('Vendor Enquiry LIVE actions, filters, catalogs, request payload, empty/export/reset states, pager, and Common Import navigation verified.');
} finally { await browser.close(); }
