import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const send = (body) => fetch(`${base}/api/sku-moderation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const metaResponse = await fetch(`${base}/api/sku-moderation?meta=1`);
assert.equal(metaResponse.status, 200);
const meta = await metaResponse.json();
assert.deepEqual(meta.pageSizes, [50, 100, 200]);
assert.equal(meta.maxImportRows, 5000);
assert.equal(meta.channels.length, 485);

for (const linkedUnlinkedFlag of [0, 1]) for (const rows of [50, 100, 200]) {
  const response = await send({ rows, page: 1, sidx: '', sord: 'desc', linkedUnlinkedFlag, REQ_SEARCH_FLAG: true, doFetchCount: true, locCode: '', skuName: '', channelSkuCode: '', channelProductId: '' });
  assert.equal(response.status, 200); const body = await response.json();
  for (const key of ['gridModel', 'rows', 'page', 'records', 'total']) assert.ok(key in body);
  assert.equal(body.linkedUnlinkedFlag, linkedUnlinkedFlag);
}
const candidates = await (await fetch(`${base}/api/sku-moderation?q=TSHIRT`)).json();
assert.ok(candidates.some((row) => row.sku_code === 'TSHIRT-BLK-M' && row.description === 'Cotton Crew Neck T-Shirt - Black'));
const missing = await fetch(`${base}/api/sku-moderation`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ linkedSkuCode: '' }) });
assert.equal(missing.status, 400); assert.equal((await missing.json()).error, 'Search SKU to link.');
const invalidImport = await send({ action: 'import', fileName: 'invalid.csv', rows: [{ 'SKU Code': 'NOT-REAL', 'Channel SKU Code': 'CHAN-1', 'Product ID': 'P1', Channel: 'ABR' }] });
assert.equal(invalidImport.status, 200); const importBody = await invalidImport.json();
assert.match(importBody.batchIdImport, /^SKUMOD/); assert.equal(importBody.importDTO.totalItems, 1); assert.equal(importBody.importDTO.failedItems, 1); assert.equal(importBody.importDTO.dtoList[0].remarks, 'Invalid SKU Code');

const browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(base); const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('sku-moderation'); await page.getByPlaceholder('Password').fill('local'); await page.getByPlaceholder('Enter captcha').fill(captcha); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/sku-moderation`); const main = page.getByRole('main');
  for (const tab of ['Enquiry/Create', 'Import']) await main.getByRole('button', { name: tab, exact: true }).waitFor();
  for (const mode of ['Unlinked', 'Linked']) await main.getByLabel(mode, { exact: true }).waitFor();
  for (const action of ['Search', 'Reset', 'Export']) await main.getByRole('button', { name: action, exact: true }).waitFor();
  assert.equal(await main.getByRole('button', { name: 'Advance Search' }).count(), 0);
  assert.equal(await main.getByLabel('Channel', { exact: true }).locator('option').count(), 486);
  for (const heading of ['Image', 'SKU Name', 'Channel', 'Seller SKU', 'ERetail Sku', 'Product ID', 'Pricing', 'Other Info', 'Action']) await main.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  assert.deepEqual(await main.getByLabel('Page size').locator('option').allTextContents(), ['50', '100', '200']);
  await main.getByLabel('Linked', { exact: true }).check(); await main.getByText('No records to view', { exact: true }).first().waitFor();
  await main.getByRole('button', { name: 'Export', exact: true }).click(); await page.getByText('No Data in Grid', { exact: true }).waitFor();
  await main.getByRole('button', { name: 'Import', exact: true }).first().click();
  for (const label of ['Import Batch No', 'Upload Template']) await main.getByLabel(label, { exact: true }).waitFor();
  await main.getByRole('link', { name: 'Download Template', exact: true }).waitFor();
  await main.getByText('**Note: Max 5000 lines are allowed at a time.', { exact: true }).waitFor();
  for (const heading of ['Seq No', 'SKU Code', 'Channel SKU Code', 'Product ID', 'Channel', 'Error Description']) await main.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await main.getByRole('button', { name: 'Import', exact: true }).last().click(); await page.getByText('No file chosen to import.', { exact: true }).waitFor();
  await main.getByLabel('Upload Template').setInputFiles({ name: 'sku-moderation.csv', mimeType: 'text/csv', buffer: Buffer.from('SKU Code,Channel SKU Code,Product ID,Channel\nNOT-REAL,CHAN-1,P1,ABR\n') });
  await main.getByRole('button', { name: 'Import', exact: true }).last().click(); await main.getByText('Invalid SKU Code', { exact: true }).waitFor(); assert.match(await main.getByLabel('Import Batch No').inputValue(), /^SKUMOD/);
  await main.getByRole('button', { name: 'Reset', exact: true }).click(); assert.equal(await main.getByLabel('Import Batch No').inputValue(), ''); assert.equal(await main.getByLabel('Upload Template').inputValue(), '');
  assert.equal(await page.locator('vite-error-overlay').count(), 0); assert.deepEqual(errors, []);
  console.log('PASS SKU Moderation: authenticated-live two-tab structure, exact modes/inline filters/columns/paging, candidate and link validation contracts, import batch/results/reset, empty export, and clean console.');
} finally { await browser.close(); }
