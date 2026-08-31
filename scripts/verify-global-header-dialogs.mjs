import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'Amit Singh' })));
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const active = page.locator('[data-screen-frame][aria-hidden="false"]');
  const userButton = active.locator('header button').last();
  await active.getByTitle('Switch Location').click();
  const preferences = active.getByRole('dialog', { name: 'User Preferences' });
  for (const label of ['Company', 'Location', 'Language', 'Timezone']) await preferences.getByLabel(label, { exact: true }).waitFor();
  assert.deepEqual(await preferences.getByLabel('Language').locator('option').allTextContents(), ['Please select a Language','English','Thai/ไทย','Bahasa','Simple Chinese/简单的中文','Vietnamese/Tiếng Việt','Hindi/हिंदी','Arabic (Saudi Arabia)']);
  assert.equal(await preferences.getByLabel('Do Nothing').isChecked(), true);
  await preferences.getByRole('button', { name: 'Cancel' }).click();

  await active.locator('header button').last().click();
  const account = active.locator('header');
  await account.getByText('vineretail.helpdesk@vinculumgroup.com').waitFor();
  await account.getByText('+91 7838 130 820').waitFor();
  for (const label of ['Test My Internet Speed', 'Profile', 'Sign out']) await account.getByRole('button', { name: label, exact: true }).waitFor();
  for (const title of ['Change Password', 'User Activity Log']) await account.getByTitle(title).waitFor();
  await account.getByRole('button', { name: 'Test My Internet Speed', exact: true }).click();
  const speed = page.getByRole('dialog', { name: 'Speed Test' });
  for (const text of ['Download', 'Upload', 'Latency', 'Jitter', 'Packet Loss', 'Measured at --:--:--']) await speed.getByText(text, { exact: true }).waitFor();
  await speed.getByRole('button', { name: 'Close', exact: true }).click();

  await userButton.click();
  await page.locator('.absolute.right-0.top-\\[50px\\]').getByTitle('User Activity Log').click();
  const activity = page.getByRole('dialog', { name: 'User Activity Log' });
  for (const heading of ['LogInTime', 'LogOutTime', 'IPAddress']) await activity.getByRole('columnheader', { name: heading, exact: true }).waitFor();
  await activity.getByRole('button', { name: 'Close', exact: true }).first().click();

  await userButton.click();
  await account.getByTitle('Change Password').click();
  const password = active.getByRole('dialog', { name: 'Change Password' });
  for (const label of ['Old Password', 'New Password', 'Confirm Password']) {
    assert.equal(await password.getByLabel(label).getAttribute('maxlength'), '20');
  }
  await password.getByRole('button', { name: 'Save' }).click();
  await password.getByText('Please Enter old password').waitFor();
  await password.getByLabel('Old Password').fill('old');
  await password.getByRole('button', { name: 'Save' }).click();
  await password.getByText('Please Enter new password').waitFor();
  await password.getByRole('button', { name: 'Cancel' }).click();
  await userButton.click();
  await page.locator('.absolute.right-0.top-\\[50px\\]').getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForURL('**/app/profile');
  for (const section of ['Basic Information', 'Bank Details', 'Seller Configuration Details']) await page.getByText(section, { exact: true }).waitFor();
  console.log('Global Switch Location, account menu geometry/content, and observed Change Password blank validation verified.');
} finally {
  await browser.close();
}
