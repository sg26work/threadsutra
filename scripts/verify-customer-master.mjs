import { chromium } from 'playwright';

const baseUrl = process.env.CUSTOMER_TEST_URL || 'http://127.0.0.1:3005';
const requiredTabs = ['Customer Details', 'Addresses', 'Other Shipping Addresses', 'User Defined Fields'];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exactLabel = (page, text, index = 0) => page.locator('label').filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`) }).nth(index);
const input = (page, text, index = 0) => exactLabel(page, text, index).locator('input');
const select = (page, text, index = 0) => exactLabel(page, text, index).locator('select');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
page.setDefaultTimeout(10_000);
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10_000 });
  const captcha = await page.locator('.font-mono').textContent();
  await page.getByPlaceholder('Username').fill('customer-e2e');
  await page.getByPlaceholder('Password').fill('local-only');
  await page.getByPlaceholder('Enter captcha').fill(captcha.trim());
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/app/dashboard');

  await page.goto(`${baseUrl}/app/customers`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.getByRole('button', { name: 'add new' }).click();
  for (const tab of requiredTabs) await assert(await page.getByRole('button', { name: tab, exact: true }).count() === 1, `Missing tab: ${tab}`);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await assert(await page.getByText('Please complete the highlighted mandatory fields').count() === 1, 'Expected invalid Customer validation');

  await input(page, 'Customer Name').fill('Customer Master E2E');
  await select(page, 'Type').selectOption({ label: '1-B2C' });
  await page.getByRole('button', { name: 'Addresses', exact: true }).click();
  await input(page, 'Shipping Address1').fill('100 Customer Street');
  await input(page, 'Shipping Address2').fill('Suite 4');
  await input(page, 'Shipping Phone').fill('8888888888');
  await input(page, 'Shipping Email').fill('shipping.customer@example.test');
  await select(page, 'Shipping Country').selectOption({ label: 'INDIA' });
  await select(page, 'Shipping State').selectOption({ label: 'Delhi' });
  await input(page, 'Shipping PinCode').fill('110001');
  await input(page, 'Billing Address1').fill('100 Customer Street');
  await input(page, 'Billing Address2').fill('Suite 4');
  await input(page, 'Billing Phone').fill('8888888888');
  await input(page, 'Billing Email').fill('billing.customer@example.test');
  await select(page, 'Billing Country').selectOption({ label: 'INDIA' });
  await select(page, 'Billing State').selectOption({ label: 'Delhi' });
  await input(page, 'Billing PinCode').fill('110001');
  await page.getByRole('button', { name: 'Customer Details', exact: true }).click();
  await assert(await input(page, 'Customer Name').inputValue() === 'Customer Master E2E', 'Tab switch reset Customer data');

  const created = page.waitForResponse((response) => response.url().includes('/api/customers') && response.request().method() === 'POST' && response.status() === 201);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const customer = await (await created).json();
  await assert(customer.customer_name === 'Customer Master E2E' && customer.shipping_address1 === '100 Customer Street', 'Customer create did not persist UI data');
  await page.getByText('Customer created successfully').waitFor();
  await page.getByRole('button', { name: 'Close vendor editor' }).click();
  await page.getByRole('button', { name: customer.customer_code, exact: true }).waitFor();

  await page.getByRole('button', { name: customer.customer_code, exact: true }).click();
  await input(page, 'Customer Name').fill('Customer Master E2E Updated');
  const updated = page.waitForResponse((response) => response.url().includes('/api/customers') && response.request().method() === 'PUT' && response.status() === 200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await assert((await (await updated).json()).customer_name === 'Customer Master E2E Updated', 'Customer edit did not persist');
  await page.getByText('Customer updated successfully').waitFor();
  await input(page, 'Customer Name').fill('Discard this change');
  await page.getByRole('button', { name: 'Close vendor editor' }).click();
  await page.getByRole('dialog', { name: 'Discard vendor changes' }).getByRole('button', { name: 'Continue editing' }).click();
  await page.getByRole('button', { name: 'Close vendor editor' }).click();
  await page.getByRole('dialog', { name: 'Discard vendor changes' }).getByRole('button', { name: 'Discard changes' }).click();
  await page.getByRole('button', { name: customer.customer_code, exact: true }).click();
  await assert(await input(page, 'Customer Name').inputValue() === 'Customer Master E2E Updated', 'Discard changed persisted Customer data');
  await assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join('; ')}`);
  console.log(`Customer Master browser workflow passed: ${customer.customer_code}`);
} catch (error) {
  console.error('Customer Master browser workflow failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
