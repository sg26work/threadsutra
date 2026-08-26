import { chromium } from 'playwright';

const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', (response) => { if (response.url().includes('/api/') && response.status() >= 500) errors.push(`${response.status()} ${response.url()}`); });

try {
  await page.goto(baseUrl);
  await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'ars-rules-verifier' })));
  await page.goto(`${baseUrl}/app/procurement/ars/rules`, { waitUntil: 'domcontentloaded' });
  await page.getByText('No records to view', { exact: true }).first().waitFor();
  const sizes = await page.getByRole('combobox', { name: 'Records per Page' }).locator('option').allTextContents();
  if (sizes.join() !== '20,50,100,200') throw new Error('Page sizes mismatch.');
  const locationOption = page.getByLabel('Location').locator('option').nth(1);
  const selectedLocation = await locationOption.getAttribute('value');
  if (!selectedLocation) throw new Error('Location master did not populate ARS Rules.');
  await page.getByLabel('Location').selectOption(selectedLocation);
  await page.getByLabel('Product Set').selectOption({ label: 'SKU' });
  const requestPromise = page.waitForRequest((request) => request.url().includes('/api/ars?entity=rules') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();
  const response = await request.response();
  const result = await response.json();
  if (payload.entity !== 'rules' || payload.REQ_SEARCH_FLAG !== true || payload.rows !== 20 || payload.page !== 1 || payload.sidx !== '' || payload.sord !== 'asc' || payload.location !== selectedLocation || payload.productSet !== 'SKU' || !Array.isArray(result.gridModel) || !('records' in result) || !('total' in result)) throw new Error('ARS Rules search contract mismatch.');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByText('No records to view', { exact: true }).first().waitFor();
  if (await page.getByText('ROS Settings', { exact: true }).count()) throw new Error('Unobserved enquiry action remains.');
  await page.getByRole('button', { name: 'Add New', exact: true }).click();
  for (const action of ['Run Now', 'View Log', 'Save', 'Confirm', 'Add New']) {
    if (!await page.getByRole('button', { name: action, exact: true }).isEnabled()) throw new Error(`${action} should match the enabled live editor action.`);
  }
  if (await page.getByRole('button', { name: 'Delete', exact: true }).count() || await page.getByRole('button', { name: 'Close', exact: true }).count()) throw new Error('Unobserved editor actions remain.');
  const frequencies = await page.getByLabel('Frequency').locator('option').allTextContents();
  if (frequencies.join() !== 'Never,Bimonthly,Monthly,Biweekly,Weekly,Daily') throw new Error(`Frequency mismatch: ${frequencies.join()}`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Please Enter Location.', { exact: true }).waitFor();
  errors.length = 0; // the expected 400 validation response is asserted above
  await page.getByRole('button', { name: 'Select Location' }).click();
  const locationDialog = page.locator('.fixed').filter({ hasText: 'Location Pick List' });
  const firstLocation = locationDialog.getByRole('checkbox').first();
  await firstLocation.check();
  await locationDialog.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByRole('button', { name: /Add SKU Set/ }).click();
  await page.getByLabel('SKU Set Type').selectOption({ label: 'Include' });
  await page.getByLabel('SKU Set Operand').selectOption({ label: 'Brand' });
  await page.getByLabel('SKU Set Value').selectOption({ index: 1 });
  await page.locator('.fixed').filter({ hasText: 'Add SKU Set' }).getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByLabel('Rule Description').fill('Playwright ARS Rule');
  await page.getByLabel('ARS Method').selectOption({ label: 'Min-Max' });
  await page.getByRole('spinbutton', { name: 'Min *', exact: true }).fill('5');
  await page.getByRole('spinbutton', { name: 'Max *', exact: true }).fill('20');
  await page.getByLabel('Vendor Type').selectOption({ label: 'Primary' });
  await page.getByLabel('Output Type').selectOption({ label: 'Pending' });
  await page.getByLabel('Status').selectOption({ label: 'Pending' });
  await page.getByLabel('Start Date').fill('2026-08-26');
  await page.getByLabel('Frequency').selectOption({ label: 'Monthly' });
  if (!await page.getByLabel('Day').isVisible() || !await page.getByLabel('Hour').isVisible()) throw new Error('Monthly schedule controls are missing.');
  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/ars?entity=rules') && response.request().method() === 'POST' && response.status() === 201);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved = await (await saveResponse).json();
  if (!saved.rule_id || saved.frequency !== 1 || saved.sku_sets?.[0]?.operand !== 'Include') throw new Error('Saved ARS Rule contract mismatch.');
  await page.getByText('ARS Rule created/updated Successfully', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: saved.rule_id, exact: true }).click();
  if (await page.getByLabel('Rule Description').inputValue() !== 'Playwright ARS Rule') throw new Error('ARS Rule did not persist across reload/reopen.');
  if (errors.length) throw new Error(`Browser/API errors: ${errors.join(' | ')}`);
  console.log('PASS ARS Rules: live-named enquiry, editor actions, validation, location and SKU-set dialogs, conditional schedule, create persistence, reload/reopen, console and API checks.');
} finally {
  await browser.close();
}
