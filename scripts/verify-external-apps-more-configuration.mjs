import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const description = `SFMC More Configuration ${Date.now()}`;

const createPayload = new URLSearchParams({
  extappType: 'SME',
  extappid: '43',
  extappdesc1: description,
  extappdesc: 'SFMC',
  status: '1',
  clientId: '0',
  credential1: 'local-client-id',
  credential2: 'local-client-secret',
  credential3: 'local-subdomain',
  credential4: 'local-value-4',
  credential5: 'local-value-5',
  extsubid: '',
});
const createdResponse = await fetch(`${base}/api/saveExternalAppsData`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
  body: createPayload,
});
assert.equal(createdResponse.status, 201);
const created = await createdResponse.json();
const extAppSubId = Number(created.rewardMaintDTO.extAppSubId);
assert.ok(extAppSubId > 0);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const captcha = (await page.locator('.font-mono').textContent()).trim();
  await page.getByPlaceholder('Username').fill('external-apps');
  await page.getByPlaceholder('Password').fill('local');
  await page.getByPlaceholder('Enter captcha').fill(captcha);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/m/external-apps`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('ExtApps Type').selectOption({ label: 'SMS/Email' });
  await page.getByLabel('ExtApps Name').selectOption({ label: 'SFMC' });
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText(description, { exact: true }).waitFor();
  await page.getByRole('table').getByRole('button', { name: String(extAppSubId), exact: true }).click();
  await page.getByRole('button', { name: 'More Configuration', exact: true }).click();
  await page.waitForURL('**screen=more-configuration**');
  assert.equal(await page.locator('[data-screen-frame][aria-hidden="false"]').count(), 1, 'More Configuration must activate exactly one retained screen');

  await page.getByText('MASTER > Miscellaneous > More Configuration', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create Definition', exact: true }).click();
  assert.deepEqual(await page.getByRole('columnheader').allTextContents(), ['Definition Key', 'Description', 'Content', 'Recipient', 'Variables', 'Order Status', 'Action']);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Please fill all mandatory fields', { exact: true }).waitFor();

  await page.getByLabel('Definition Key 1').fill('ORDER_SHIPPED');
  await page.getByLabel('Description 1').fill('Order shipped message');
  await page.getByLabel('Content 1').fill('Order %%orderNo%% has shipped');
  await page.getByRole('button', { name: 'Recipients', exact: true }).click();
  await page.getByRole('dialog', { name: 'Recipient' }).getByLabel('Recipient', { exact: true }).selectOption('1');
  assert.deepEqual(await page.getByLabel('Recipient Details').locator('option').allTextContents(), ['--- Select ---', 'Alternate Contact No', 'Both', 'Primary Contact No']);
  await page.getByLabel('Recipient Details').selectOption('1');
  await page.getByRole('button', { name: 'OK', exact: true }).click();

  await page.getByRole('button', { name: 'Variables', exact: true }).click();
  assert.equal(await page.getByText('orderNo', { exact: true }).count(), 0);
  await page.getByLabel('Variable orderNo').selectOption('1');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByLabel('Order Status 1').selectOption('31');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Definition saved successfully.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Definition Key 1').isDisabled(), true);
  assert.equal(await page.getByLabel('Description 1').isDisabled(), true);
  assert.equal(await page.getByLabel('Content 1').isDisabled(), true);

  const persisted = await fetch(`${base}/api/external-app-definitions?extAppSubId=${extAppSubId}`).then((response) => response.json());
  assert.equal(persisted.rows.length, 1);
  assert.equal(persisted.rows[0].definition_key, 'ORDER_SHIPPED');
  assert.deepEqual(persisted.rows[0].variables, [{ name: 'orderNo', mapping: '1' }]);
  assert.equal(persisted.rows[0].order_status, '31');

  await page.getByLabel('Add New Parameter 1').click();
  assert.equal(await page.getByLabel('Definition Key 2').inputValue(), '');
  assert.equal(await page.getByLabel('Definition Key 2').isDisabled(), false);
  assert.equal(await page.getByLabel('Order Status 2').inputValue(), '-1');
  await page.getByLabel('Remove Parameter 2').click();
  assert.equal(await page.getByLabel('Definition Key 2').count(), 0);

  page.once('dialog', async (dialog) => {
    assert.equal(dialog.message(), 'Do you really want to update?');
    await dialog.accept();
  });
  await page.getByLabel('Is Active 1').click();
  await page.getByText('Status Updated Successfully', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Is Active 1').isChecked(), false);
  const updated = await fetch(`${base}/api/external-app-definitions?extAppSubId=${extAppSubId}`).then((response) => response.json());
  assert.equal(updated.rows[0].is_active, false);
  await page.screenshot({ path: 'docs/live-exploration/external-apps-more-configuration-local.png', fullPage: true });

  page.once('dialog', async (dialog) => {
    assert.equal(dialog.message(), 'Do you really want to delete?');
    await dialog.accept();
  });
  await page.getByLabel('Remove Parameter 1').click();
  await page.getByText('Data deleted successfully', { exact: true }).waitFor();
  const deleted = await fetch(`${base}/api/external-app-definitions?extAppSubId=${extAppSubId}`).then((response) => response.json());
  assert.equal(deleted.rows.length, 0);

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.waitForURL(`**screen=editor&id=${extAppSubId}`);
  assert.equal(await page.locator('[data-screen-frame][aria-hidden="false"]').count(), 1, 'Returning to External Apps editor must activate exactly one retained screen');
  await page.locator('[data-screen-frame][aria-hidden="false"]').getByRole('main').getByRole('button', { name: 'More Configuration', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS External Apps More Configuration: exact columns, entry point, validation, recipients, variables, clone/remove/delete, persistence, active toggle, and clean console.');
} finally {
  await browser.close();
}
