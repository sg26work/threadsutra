import { chromium } from 'playwright';

const baseUrl = process.env.TRANSPORTER_TEST_URL || 'http://127.0.0.1:3005';
const uniqueCode = `TR-E2E-${Date.now()}`;
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
  await page.getByPlaceholder('Username').fill('transporter-e2e');
  await page.getByPlaceholder('Password').fill('local-only');
  await page.getByPlaceholder('Enter captcha').fill(captcha.trim());
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/app/dashboard');
  await page.goto(`${baseUrl}/app/transporters`, { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.getByRole('button', { name: 'add new' }).click();
  for (const tab of ['Detail Transporter', 'User Defined Field']) await assert(await page.getByRole('button', { name: tab, exact: true }).count() === 1, `Missing tab: ${tab}`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await assert(await page.getByText('Please complete the highlighted mandatory fields').count() === 1, 'Expected required-field validation');
  await select(page, 'Transporter Type').selectOption({ label: 'Courier' });
  await input(page, 'Transporter Code').fill(uniqueCode);
  await input(page, 'Transporter Name').fill('Transporter Master E2E');
  await input(page, 'Address1').fill('77 Dispatch Road');
  await input(page, 'Address2').fill('Dock B');
  await page.getByRole('button', { name: 'User Defined Field', exact: true }).click();
  await input(page, 'UDF1').fill('retained');
  await page.getByRole('button', { name: 'Detail Transporter', exact: true }).click();
  await assert(await input(page, 'Transporter Code').inputValue() === uniqueCode, 'Tab switch reset transporter state');
  const create = page.waitForResponse((response) => response.url().includes('/api/transporters') && response.request().method() === 'POST' && response.status() === 201);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const transporter = await (await create).json();
  await assert(transporter.transporter_code === uniqueCode && transporter.address1 === '77 Dispatch Road', 'Transporter create did not persist UI data');
  await page.getByText('Transporter created successfully').waitFor();
  await page.getByRole('button', { name: 'Close vendor editor' }).click();
  await page.getByRole('button', { name: uniqueCode, exact: true }).waitFor();
  await page.getByRole('button', { name: uniqueCode, exact: true }).click();
  await input(page, 'Transporter Name').fill('Transporter Master E2E Updated');
  const update = page.waitForResponse((response) => response.url().includes('/api/transporters') && response.request().method() === 'PUT' && response.status() === 200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await assert((await (await update).json()).transporter_name === 'Transporter Master E2E Updated', 'Transporter edit did not persist');
  await page.getByText('Transporter updated successfully').waitFor();
  await assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join('; ')}`);
  console.log(`Transporter Master browser workflow passed: ${uniqueCode}`);
} catch (error) {
  console.error('Transporter Master browser workflow failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
