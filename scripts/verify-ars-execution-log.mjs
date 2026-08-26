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
  await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'ars-log-verifier' })));
  await page.goto(`${baseUrl}/app/procurement/ars/logs`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'ARSEX-20190430-1003', exact: true }).waitFor();
  const sizes = await page.getByRole('combobox', { name: 'Records per Page' }).locator('option').allTextContents();
  if (sizes.join() !== '20,50,100,200') throw new Error('Page sizes mismatch.');
  await page.getByRole('textbox', { name: 'Rule ID' }).fill('1003');
  await page.getByRole('textbox', { name: 'Execution ID' }).fill('ARSEX');
  if (await page.getByLabel('Location').locator('option').count() < 2) throw new Error('Location master did not populate ARS Execution Log.');
  const waiting = page.waitForRequest((request) => request.url().includes('/api/ars?entity=logs') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const request = await waiting;
  const payload = request.postDataJSON();
  const result = await (await request.response()).json();
  if (payload.entity !== 'logs' || payload.REQ_SEARCH_FLAG !== true || payload.rows !== 20 || payload.page !== 1 || payload.sidx !== '' || payload.sord !== 'asc' || payload.ruleId !== '1003' || payload.arsExecId !== 'ARSEX' || payload.location !== '' || !Array.isArray(result.gridModel) || !('records' in result) || !('total' in result)) throw new Error('ARS log search contract mismatch.');
  await page.getByRole('button', { name: 'Rule ID Picker' }).click();
  await page.getByText('ARS Rule Pick List').waitFor();
  await page.getByRole('button', { name: 'Close modal' }).click();
  await page.getByRole('button', { name: 'Execution ID Picker' }).click();
  await page.getByText('ARS Execution Pick List').waitFor();
  await page.getByRole('button', { name: 'Close modal' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByText('No records to view', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'ARSEX-20190430-1003', exact: true }).click();
  for (const action of ['Search', 'Download', 'Approve All', 'Process All', 'Reset']) await page.getByRole('button', { name: action, exact: true }).waitFor();
  await page.getByText('SERUM-VITC-30', { exact: true }).waitFor();
  const approve = page.waitForResponse((response) => response.url().includes('/api/ars') && response.request().method() === 'POST' && response.status() === 200 && response.request().postData()?.includes('approve-all'));
  await page.getByRole('button', { name: 'Approve All', exact: true }).click();
  await approve;
  await page.getByText('(1) Records are approved.', { exact: true }).waitFor();
  const process = page.waitForResponse((response) => response.url().includes('/api/ars') && response.request().method() === 'POST' && response.status() === 200 && response.request().postData()?.includes('process-all'));
  await page.getByRole('button', { name: 'Process All', exact: true }).click();
  await process;
  await page.getByText('(1) Records are under processing. Please wait for couple of minutes.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Document Inprocess', exact: true }).click();
  await page.getByText('ARS Execution Status', { exact: true }).waitFor();
  if (errors.length) throw new Error(`Browser/API errors: ${errors.join(' | ')}`);
  console.log('PASS ARS Execution Log: live-named auto search, filters, pickers, paging, nested detail, status, approve/process persistence, console and API checks.');
} finally {
  await browser.close();
}
