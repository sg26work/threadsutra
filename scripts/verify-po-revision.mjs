import { chromium } from 'playwright';

const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
const apiErrors = [];
let expectedApiError = false;
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => { if (!expectedApiError && message.type() === 'error') runtimeErrors.push(message.text()); });
page.on('response', (response) => { if (!expectedApiError && response.url().includes('/api/') && response.status() >= 400) apiErrors.push(`${response.status()} ${response.url()}`); });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'po-revision-verifier' })));
  const suffix = Date.now().toString().slice(-8);
  const poNo = `POREV${suffix}`;
  const createdResponse = await page.request.post(`${baseUrl}/api/purchase-orders`, { data: {
    po_no: poNo, vendor: 'Apex Apparel Mfg Pvt Ltd', vendor_code: 'VEN001', warehouse: 'Delhi NCR', source_location: 'Mumbai WH',
    po_date: '2026-08-24', expected_date: '2026-08-30', items: 1, qty: 10, amount: 1000, buyer_name: 'System Buyer',
    recv_validation_code: 'Standard', po_type: 'Outright', po_mode: 'Manual', status: 'Pending Confirmation',
  }});
  if (!createdResponse.ok()) throw new Error(`Fixture create failed: ${createdResponse.status()} ${await createdResponse.text()}`);
  const created = await createdResponse.json();
  const revisedResponse = await page.request.put(`${baseUrl}/api/purchase-orders`, { data: { id: created.id, qty: 12, amount: 1200, expected_date: '2026-09-01', revision_reason: 'Parity verification' } });
  if (!revisedResponse.ok()) throw new Error(`Fixture revision failed: ${revisedResponse.status()} ${await revisedResponse.text()}`);

  for (const size of [20, 50, 100, 200]) {
    const response = await page.request.post(`${baseUrl}/api/po-revision`, { data: { rows: size, page: 1, sidx: 'id.POCode', sord: 'asc', REQ_SEARCH_FLAG: true, 'id.POCode': poNo } });
    if (!response.ok()) throw new Error(`Page-size ${size} search failed: ${response.status()}`);
    const result = await response.json();
    if (!Array.isArray(result.rows) || result.total !== 1 || result.page !== 1 || result.records !== 1 || result.rows[0].poRevisionCode !== `${poNo}-R1`) throw new Error(`Invalid response model for page size ${size}: ${JSON.stringify(result)}`);
  }

  await page.goto(`${baseUrl}/app/purchase-orders`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Search to view PO revisions', { exact: true }).waitFor();
  if (await page.getByRole('button', { name: /create purchase order|revise|receive/i }).count()) throw new Error('Unobserved PO mutation controls remain in PO Revision.');
  const poTypeOptions = await page.locator('#gs_poType option').allTextContents();
  const expectedTypes = ['CIF', 'Outright-Direct Inbound', 'Outright', 'ARS', 'FNV', 'Consignment', 'Blanket', 'SOR', 'Aggregate'];
  if (JSON.stringify(poTypeOptions) !== JSON.stringify(expectedTypes)) throw new Error('PO Type options do not match live.');
  const sizes = await page.getByRole('combobox', { name: 'Records per Page' }).locator('option').allTextContents();
  if (JSON.stringify(sizes) !== JSON.stringify(['20', '50', '100', '200'])) throw new Error('Page sizes do not match live.');

  await page.getByRole('button', { name: 'Advanced Search', exact: true }).click();
  const poModes = await page.getByLabel('PO Mode').locator('option').allTextContents();
  if (!['ARS', 'Auto', 'BackOrder', 'BackOrder/new', 'DirectInbound', 'Manual', 'System'].every((mode) => poModes.includes(mode))) throw new Error('PO Mode options do not match confirmed options.');
  await page.getByLabel('From PO Revision Code').fill(`${poNo}-R1`);
  await page.getByLabel('To PO Revision Code').fill(`${poNo}-R1`);
  await page.getByLabel('From PO Code').fill(poNo);
  await page.getByLabel('To PO Code').fill(poNo);
  await page.getByLabel('Source Location').selectOption({ label: 'Mumbai WH' });
  await page.locator('#gs_poDate').fill('2026-08-24');
  await page.locator('#gs_poRevisionDate').fill(new Date().toISOString().slice(0, 10));
  await page.locator('#gs_poCode').fill(poNo);
  const requestPromise = page.waitForRequest((request) => request.url().endsWith('/api/po-revision') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();
  if (payload.rows !== 20 || payload.page !== 1 || payload.sidx !== 'id.POCode' || payload.sord !== 'asc' || payload.REQ_SEARCH_FLAG !== true || payload['id.POCode'] !== poNo || payload.podate !== '2026-08-24' || !payload.poRevisionDate || payload.sourceLocation !== 'Mumbai WH' || payload.createdBy !== '' || payload.updatedDate !== '' || payload.fromPORevisionCode !== `${poNo}-R1` || payload.toPOCode !== poNo) throw new Error(`Search payload mismatch: ${JSON.stringify(payload)}`);
  await page.getByText(`${poNo}-R1`, { exact: true }).waitFor();
  await page.getByText('View 1 - 1 of 1', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Open vendor picker' }).click();
  await page.getByText('Vendor Picker', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search vendors' }).fill('Apex');
  const vendor = page.getByRole('button').filter({ hasText: /Apex Apparel/ }).first();
  await vendor.click();
  if (!await page.locator('#gs_vendorCode').inputValue()) throw new Error('Vendor picker did not populate Vendor Code.');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  if (await page.locator('#gs_poCode').inputValue() || await page.locator('#gs_vendorCode').inputValue()) throw new Error('Reset did not clear filters.');
  await page.getByText('Search to view PO revisions', { exact: true }).waitFor();

  expectedApiError = true;
  await page.route('**/api/po-revision', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Verification failure' }) });
  });
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText('Loading records…', { exact: true }).waitFor();
  await page.getByRole('alert').getByText('Verification failure', { exact: true }).waitFor();
  await page.unroute('**/api/po-revision');
  expectedApiError = false;
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  if (runtimeErrors.length || apiErrors.length) throw new Error(`Browser errors: ${[...runtimeErrors, ...apiErrors].join(' | ')}`);
  console.log('PASS PO Revision: API-backed search, response model, filters, advanced search, vendor picker, pagination sizes, grid, and reset.');
} finally {
  await browser.close();
}
