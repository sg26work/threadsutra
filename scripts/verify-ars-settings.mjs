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
  await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'ars-settings-verifier' })));
  const baseline = await page.request.put(`${baseUrl}/api/ars`, { data: { entity: 'settings', enable_ars: true, calculation_hour: 2, puf_tuf: '1', ros_lifetime: true, ros_12_weeks: true, ros_6_weeks: false, ros_1_month: false, ros_2_weeks: false, custom_periods: ['', '', ''], custom_period_enabled: [false, false, false] } });
  if (!baseline.ok()) throw new Error(`Unable to reset ARS Settings baseline: ${baseline.status()}`);
  await page.goto(`${baseUrl}/app/procurement/ars/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByText('ARS Setting', { exact: true }).waitFor();
  const hours = await page.getByLabel('ROS Calculation Hour').locator('option').allTextContents();
  if (hours.length !== 24 || hours[0] !== '0' || hours[23] !== '23') throw new Error('ROS Calculation Hour options mismatch.');
  const rounding = await page.getByLabel('PUF/TUF').locator('option').allTextContents();
  if (rounding.join() !== 'Round Up,Round Down') throw new Error('PUF/TUF options mismatch.');
  const toggleFor = (label) => page.locator('label').filter({ hasText: label }).getByRole('button').first();
  await toggleFor('12 Weeks').click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Minimum 2 ROS Calculation parameters should be Active', { exact: true }).waitFor();
  await toggleFor('12 Weeks').click();
  await page.getByLabel('Custom Period 1 Active').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Please Enter Days in Textbox to Make it Active.', { exact: true }).waitFor();
  await page.getByLabel('Custom Period 1 Days').fill('10');
  await page.getByLabel('PUF/TUF').selectOption({ label: 'Round Down' });
  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/ars') && response.request().method() === 'PUT' && response.status() === 200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved = await (await saveResponse).json();
  if (saved.puf_tuf !== '2' || saved.custom_periods?.[0] !== '10' || saved.custom_period_enabled?.[0] !== true) throw new Error('ARS Settings save contract mismatch.');
  await page.getByText('Configuration updated Successfully', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const selects = [...document.querySelectorAll('label')];
    const puf = selects.find((label) => label.innerText.includes('PUF/TUF'))?.querySelector('select');
    const days = document.querySelector('input[aria-label="Custom Period 1 Days"]');
    return puf?.value === '2' && days?.value === '10';
  });
  if (await page.getByLabel('PUF/TUF').inputValue() !== '2' || await page.getByLabel('Custom Period 1 Days').inputValue() !== '10') throw new Error('ARS Settings did not persist across reload.');
  if (errors.length) throw new Error(`Browser/API errors: ${errors.join(' | ')}`);
  console.log('PASS ARS Settings: exact controls/options, live validation, save payload, persistence, reload, console and API checks.');
} finally {
  await browser.close();
}
