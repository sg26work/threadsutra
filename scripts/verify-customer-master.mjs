import { chromium } from 'playwright';

const baseUrl = process.env.CUSTOMER_TEST_URL || 'http://127.0.0.1:3005';
const requiredTabs = ['Customer Details', 'Addresses', 'Other Shipping Addresses', 'User Defined Fields', 'Other Settings'];
const runId = Date.now();
const uniquePhone = `8${String(runId).slice(-9)}`;
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
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'customer-e2e' })));

  await page.goto(`${baseUrl}/app/customers`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.getByRole('button', { name: 'add new' }).click();
  for (const tab of requiredTabs) await assert(await page.getByRole('button', { name: tab, exact: true }).count() === 1, `Missing tab: ${tab}`);
  for (const label of ['Customer Name','Is Active','Parent Customer','Ext Customer Code','Creation Source','Payment Terms','GSTIN/TIN','GL Code','Tax Zone','Type','Is Form C','PAN No.','Tax Ref No','credit Days','Earned Points','Expiry Date','Is TaxExempt','Is TCS Applicable','customermaintenance.thresholdLPNCount','Is Trusted Customer']) await page.getByText(label, { exact: true }).first().waitFor();
  await exactLabel(page, 'Parent Customer').getByRole('button').click();
  const parentPicker = page.getByText('Select Parent Customer', { exact: true }).locator('..').locator('..');
  for (const heading of ['Customer Code', 'Customer Name', 'Customer Address1']) await parentPicker.getByText(heading, { exact: true }).waitFor();
  await assert(await parentPicker.getByTitle('Records per Page').locator('option').allTextContents().then((items) => items.join('|')) === '50|100', 'Parent Customer paging options differ from LIVE');
  await parentPicker.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  const audit = page.getByRole('dialog', { name: 'Audit', exact: true });
  for (const label of ['Created By', 'Created Date', 'Modified By', 'Modified Date']) await audit.getByText(label, { exact: true }).waitFor();
  await audit.getByRole('button', { name: 'Close audit' }).click();
  await page.getByRole('button', { name: 'User Defined Fields', exact: true }).click();
  for (let index = 1; index <= 10; index += 1) await page.getByText(`UDF${index}`, { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Other Settings', exact: true }).click();
  for (const label of ['Invoice Report','Shelf Life on Picking Type','Total Shelf Life','Shelf Life on Picking']) await page.getByText(label, { exact: true }).first().waitFor();
  const picking = page.getByLabel('Picking Instructions', { exact: true });
  const shipping = page.getByLabel('Shipping Instructions', { exact: true });
  await assert(await picking.getAttribute('multiple') !== null, 'Picking Instructions is not multi-select');
  await assert(await picking.locator('option').count() === 40, 'Picking Instructions catalog differs from LIVE');
  await assert(await shipping.getAttribute('multiple') !== null, 'Shipping Instructions is not multi-select');
  await assert(await shipping.locator('option').count() === 35, 'Shipping Instructions catalog differs from LIVE');
  await page.getByRole('button', { name: 'Other Shipping Addresses', exact: true }).click();
  await page.getByRole('button', { name: 'Add New', exact: true }).first().click();
  const otherAddress = page.getByRole('dialog', { name: 'Customer Create/Edit' });
  await otherAddress.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Please save Customer to add Other Shipping Address.', { exact: true }).waitFor();
  await otherAddress.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.getByRole('button', { name: 'Customer Details', exact: true }).click();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('alert').getByText('Please Enter Customer Name', { exact: true }).waitFor();
  await assert(await page.locator('[data-field="customer_name"]').evaluate((element) => element === document.activeElement), 'Customer Name was not focused after validation');

  await input(page, 'Customer Name').fill('Customer Master E2E');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('alert').getByText('Please Enter Type', { exact: true }).waitFor();
  await assert(await page.locator('[data-field="type"]').evaluate((element) => element === document.activeElement), 'Type was not focused after validation');
  await select(page, 'Type').selectOption({ label: '1 - B2C' });
  await page.getByRole('button', { name: 'Addresses', exact: true }).click();
  await input(page, 'Address 1', 0).fill('100 Customer Street');
  await input(page, 'Address 2', 0).fill('Suite 4');
  await input(page, 'Phone', 0).fill(uniquePhone);
  await input(page, 'Email', 0).fill(`billing.customer.${runId}@example.test`);
  await select(page, 'Country', 0).selectOption({ label: 'INDIA' });
  await select(page, 'State', 0).selectOption({ label: 'Delhi' });
  await input(page, 'PinCode', 0).fill('110001');
  await input(page, 'Address 1', 1).fill('100 Customer Street');
  await input(page, 'Address 2', 1).fill('Suite 4');
  await input(page, 'Phone', 1).fill(uniquePhone);
  await input(page, 'Email', 1).fill(`shipping.customer.${runId}@example.test`);
  await select(page, 'Country', 1).selectOption({ label: 'INDIA' });
  await select(page, 'State', 1).selectOption({ label: 'Delhi' });
  await input(page, 'PinCode', 1).fill('110001');
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
  await input(page, 'Customer Name').fill('Reset this change');
  await page.locator('button:visible').filter({ hasText: /^Reset$/ }).first().click();
  await assert(await input(page, 'Customer Name').inputValue() === 'Customer Master E2E Updated', 'Reset did not reload saved Customer values');
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
