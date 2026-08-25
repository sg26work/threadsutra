import { chromium } from 'playwright';
import ExcelJS from 'exceljs';

const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = []; const apiErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
page.on('response', (response) => { if (response.url().includes('/api/') && response.status() >= 500) apiErrors.push(`${response.status()} ${response.url()}`); });
page.on('dialog', (dialog) => dialog.accept());

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'manage-asn-verifier' })));
  const suffix = Date.now().toString().slice(-8); const poNo = `ASNPO${suffix}`;
  const poResponse = await page.request.post(`${baseUrl}/api/purchase-orders`, { data: { po_no: poNo, vendor: 'Apex Apparel Mfg Pvt Ltd', vendor_code: 'VEN001', warehouse: 'Delhi NCR', po_date: new Date().toISOString().slice(0, 10), expected_date: '2026-09-10', items: 1, qty: 5, amount: 2700, status: 'Released', buyer_name: 'System Buyer', recv_validation_code: 'Standard', po_type: 'Outright', line_items: [{ sku_code: 'TSHIRT-BLK-M', description: 'Cotton Crew Neck T-Shirt - Black', po_qty: 5, mrp: 1299, delivery_date: '2026-09-10' }] } });
  if (!poResponse.ok()) throw new Error(`PO fixture failed: ${poResponse.status()} ${await poResponse.text()}`);

  const invalid = await page.request.post(`${baseUrl}/api/manage-asn`, { data: { asn_type: '4', po_no: '', lines: [] } });
  if (invalid.status() !== 400 || !(await invalid.json()).error.includes('PO No is Mandatory.')) throw new Error('Manage ASN mandatory PO validation mismatch.');

  await page.goto(`${baseUrl}/app/grn`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Manage ASN', exact: true }).waitFor();
  const sizes = await page.getByRole('combobox', { name: 'Records per Page' }).locator('option').allTextContents();
  if (JSON.stringify(sizes) !== JSON.stringify(['50', '100', '200'])) throw new Error('Manage ASN page sizes do not match live.');
  const statusOptions = await page.locator('#gs_status option').allTextContents();
  if (JSON.stringify(statusOptions) !== JSON.stringify(['--- Select ---','Cancelled','Closed','Part received','Pending Confirmation','Short Closed','Confirmed'])) throw new Error('Manage ASN status options mismatch.');
  const typeOptions = await page.locator('#gs_asnTypeText option').allTextContents();
  if (JSON.stringify(typeOptions) !== JSON.stringify(['--- Select ---','PO','Vendor','Customer','Marketplace','Other'])) throw new Error('Manage ASN type options mismatch.');

  await page.getByRole('button', { name: 'Advanced Search', exact: true }).click();
  await page.getByLabel('SKU').fill('TSHIRT'); await page.getByLabel('Reference No').fill('REF-VERIFY');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  if (await page.locator('#gs_asnNo').inputValue() || await page.getByLabel('SKU').count()) throw new Error('Manage ASN Reset did not restore empty/collapsed state.');

  await page.getByRole('button', { name: 'Add New', exact: true }).click();
  await page.getByRole('heading', { name: 'ASN Create/Edit', exact: true }).waitFor();
  for (const tab of ['Create ASN','User Defined Fields','Attached Document','Import','ASN Tags']) await page.getByRole('button', { name: tab, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open PO picker' }).click();
  await page.getByLabel('Search picker').fill(poNo);
  await page.getByRole('button', { name: new RegExp(poNo) }).click();
  await page.getByLabel('Ext ASN No').fill(`EXT-${suffix}`); await page.getByLabel('Remarks').fill('Manage ASN parity verification'); await page.getByLabel('Invoice No').fill(`INV-${suffix}`); await page.getByLabel('Invoice Amount').fill('2700');
  await page.getByLabel('Exp Qty TSHIRT-BLK-M').fill('4');
  const saveRequest = page.waitForRequest((request) => request.url().endsWith('/api/manage-asn') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const savedRequest = await saveRequest; const savePayload = savedRequest.postDataJSON(); const savedResponse = await savedRequest.response(); const savedRecord = await savedResponse.json(); const asnNo = savedRecord.asn_no;
  if (savePayload.operation !== '1' || savePayload.po_no !== poNo || savePayload.lines[0].exp_qty !== 4) throw new Error(`Manage ASN save payload mismatch: ${JSON.stringify(savePayload)}`);
  await page.getByText('ASN saved successfully.', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importBook = new ExcelJS.Workbook(); const importSheet = importBook.addWorksheet('ASN Import'); importSheet.addRows([['SKU Code','SKU Description','Exp Qty','Reference No','LPN','LotNo','Delivery Date'],['TSHIRT-BLK-M','Cotton Crew Neck T-Shirt - Black',4,'REF-VERIFY','LPN-1','LOT-1','2026-09-10']]);
  const importBuffer = Buffer.from(await importBook.xlsx.writeBuffer());
  await page.getByLabel('Upload Template').setInputFiles({ name: 'asn-import.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: importBuffer });
  await page.getByRole('button', { name: 'Import', exact: true }).last().click(); await page.getByText('1 SKU line(s) imported.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'User Defined Fields', exact: true }).click(); await page.getByLabel('PO UDF1', { exact: true }).fill('Alpha'); await page.getByLabel('PO UDF10', { exact: true }).fill('Omega');
  await page.getByRole('button', { name: 'Attached Document', exact: true }).click(); await page.getByLabel('Attach document').setInputFiles({ name: 'asn-proof.txt', mimeType: 'text/plain', buffer: Buffer.from('verification') }); await page.getByText('asn-proof.txt', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'ASN Tags', exact: true }).click(); await page.locator('#asnTag_select').selectOption(['1','2']);
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByText('ASN saved successfully.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await page.getByText('ASN confirmed successfully.', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Manage ASN', exact: true }).click();
  if (!asnNo) throw new Error('Saved ASN number was not rendered.');
  await page.locator('#gs_asnNo').fill(asnNo);
  const searchRequest = page.waitForRequest((request) => request.url().endsWith('/api/asn-enquiry') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Search', exact: true }).click(); const payload = (await searchRequest).postDataJSON();
  if (payload.rows !== 50 || payload.page !== 1 || payload.sord !== 'desc' || payload.REQ_SEARCH_FLAG !== true || payload.doFetchCount !== false) throw new Error(`Manage ASN search payload mismatch: ${JSON.stringify(payload)}`);
  const rowButton = page.getByRole('button', { name: new RegExp(asnNo) }); await rowButton.waitFor();
  await rowButton.click(); await page.getByRole('button', { name: 'User Defined Fields', exact: true }).click();
  if (await page.getByLabel('PO UDF1', { exact: true }).inputValue() !== 'Alpha' || await page.getByLabel('PO UDF10', { exact: true }).inputValue() !== 'Omega') throw new Error('ASN UDF persistence failed.');
  await page.getByRole('button', { name: 'Attached Document', exact: true }).click(); await page.getByText('asn-proof.txt', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'ASN Tags', exact: true }).click();
  const selectedTags = await page.locator('#asnTag_select').inputValue(); if (!['1','2'].includes(selectedTags)) throw new Error('ASN tag persistence failed.');
  await page.getByRole('button', { name: 'Close', exact: true }).click(); await page.getByRole('heading', { name: 'Close ASN Lines', exact: true }).waitFor();
  await page.getByLabel('Select close TSHIRT-BLK-M').check(); await page.getByText('Set Open qty as close qty', { exact: true }).click(); await page.getByLabel('Reason For Close').selectOption('others');
  await page.getByRole('button', { name: 'OK', exact: true }).click(); await page.getByText('ASN short closed successfully.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Manage ASN', exact: true }).click(); await page.locator('#gs_asnNo').fill(asnNo); await page.getByRole('button', { name: 'Search', exact: true }).click(); await page.getByRole('button', { name: new RegExp(asnNo) }).click();
  const persisted = await page.request.get(`${baseUrl}/api/manage-asn?asnNo=${encodeURIComponent(asnNo)}`); const persistedBody = await persisted.json(); if (persistedBody.status !== 'Short Closed') throw new Error('ASN short-close status persistence failed.'); if (persistedBody.lines[0].closed_qty !== 4 || persistedBody.lines[0].close_reason !== 'others') throw new Error('ASN line close persistence failed.');
  const stale = await page.request.put(`${baseUrl}/api/manage-asn`, { data: { ...persistedBody, row_version: 1, operation: '1' } }); if (stale.status() !== 409 || !(await stale.json()).error.includes('another user')) throw new Error('ASN row-version conflict contract failed.');
  if (runtimeErrors.length || apiErrors.length) throw new Error(`Browser/API errors: ${[...runtimeErrors, ...apiErrors].join(' | ')}`);
  console.log('PASS Manage ASN: enquiry, live payload, validation, pickers, editor, line quantities, UDF, documents, tags, save, confirm, line short-close, persistence, and pagination.');
} finally { await browser.close(); }
