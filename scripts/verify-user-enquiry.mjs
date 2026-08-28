import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true });
try {
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(base);
const captcha = (await page.locator('.font-mono').textContent()).trim();
await page.getByPlaceholder('Username').fill('user-enquiry');
await page.getByPlaceholder('Password').fill('local');
await page.getByPlaceholder('Enter captcha').fill(captcha);
await page.getByRole('button', { name: 'Login' }).click();
await page.waitForURL('**/app/dashboard');
await page.goto(`${base}/app/admin/user-enquiry`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Search', exact: true }).click();
await page.getByText(/View 1 - \d+ of \d+/).waitFor();
for (const action of ['Search', 'Reset', 'Advance Search', 'Import', 'Export', 'Add New']) ok(await page.getByRole('button', { name: action, exact: true }).count() === 1, `${action} action missing`);
for (const column of ['User Name', 'First Name', 'Last Name', 'Status', 'Email', 'User Type']) ok(await page.getByRole('columnheader', { name: column, exact: true }).count() === 1, `${column} column missing`);
ok(await page.locator('tbody tr').count() >= 1, 'default Normal-user search returned no rows');
await page.getByRole('button', { name: 'Advance Search', exact: true }).click();
for (const label of ['role', 'company', 'location', 'email', 'userStatus', 'userType']) ok(await page.getByLabel(label).count() >= 1, `${label} advanced filter missing`);
ok(await page.getByLabel('userType').first().inputValue() === '1', 'User Type default is not Normal (1)');
ok((await page.getByLabel('Records per Page').locator('option').allTextContents()).join('|') === '20|50|100|200', 'page sizes differ from live');
await page.getByRole('button', { name: 'Reset', exact: true }).click();
ok(await page.locator('tbody tr').count() === 0, 'Reset did not clear the grid');
await page.getByRole('button', { name: 'Export', exact: true }).click();
await page.getByText('No data found', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Search', exact: true }).click();
const firstUser = page.locator('tbody tr button').first();
await firstUser.waitFor();
ok(await firstUser.count() === 1, 'User Name is not an editor link');
await firstUser.click();
ok(page.url().includes('/app/admin/user-create-edit?userIdVal='), 'User row did not open encoded User Create/Edit route');
const unexpectedErrors = errors.filter((message) => !message.includes('status of 400'));
ok(unexpectedErrors.length === 0, `browser console errors: ${unexpectedErrors.join(' | ')}`);
await browser.close();
console.log('PASS User Enquiry: six actions, six columns, exact catalogs/defaults, server search/reset/paging, empty export validation, editor row route, clean console.');
} catch (error) {
  await browser.close().catch(() => {});
  throw error;
}
