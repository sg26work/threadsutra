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
  await page.getByLabel('Location').selectOption({ label: 'Delhi NCR' });
  await page.getByLabel('Product Set').selectOption({ label: 'SKU' });
  const requestPromise = page.waitForRequest((request) => request.url().includes('/api/ars?entity=rules') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();
  const response = await request.response();
  const result = await response.json();
  if (payload.entity !== 'rules' || payload.REQ_SEARCH_FLAG !== true || payload.rows !== 20 || payload.page !== 1 || payload.sidx !== '' || payload.sord !== 'asc' || payload.location !== 'Delhi NCR' || payload.productSet !== 'SKU' || !Array.isArray(result.gridModel) || !('records' in result) || !('total' in result)) throw new Error('ARS Rules search contract mismatch.');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByText('No records to view', { exact: true }).first().waitFor();
  if (await page.getByText('ROS Settings', { exact: true }).count()) throw new Error('Unobserved enquiry action remains.');
  if (errors.length) throw new Error(`Browser/API errors: ${errors.join(' | ')}`);
  console.log('PASS ARS Rules: API-backed live search payload, response model, filters, reset, pagination sizes, empty state, and enquiry actions.');
} finally {
  await browser.close();
}
