import { chromium } from 'playwright';
const baseUrl = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const errors = [];
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(baseUrl); await page.evaluate(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'ars-log-verifier' }))); await page.goto(`${baseUrl}/app/procurement/ars/logs`, { waitUntil: 'domcontentloaded' });
  await page.getByText('No records to view', { exact: true }).first().waitFor(); const sizes = await page.getByRole('combobox', { name: 'Records per Page' }).locator('option').allTextContents(); if (sizes.join() !== '20,50,100,200') throw new Error('Page sizes mismatch.');
  await page.getByRole('textbox', { name: 'Rule ID' }).fill('1001'); await page.getByRole('textbox', { name: 'Execution ID' }).fill('ARSEX'); await page.getByLabel('Location').selectOption({ label: 'Delhi NCR' });
  const waiting = page.waitForRequest((r) => r.url().includes('/api/ars?entity=logs') && r.method() === 'POST'); await page.getByRole('button', { name: 'Search', exact: true }).click(); const request = await waiting; const payload = request.postDataJSON(); const response = await request.response(); const result = await response.json();
  if (payload.entity !== 'logs' || payload.REQ_SEARCH_FLAG !== true || payload.rows !== 20 || payload.page !== 1 || payload.sidx !== '' || payload.sord !== 'asc' || payload.ruleId !== '1001' || payload.arsExecId !== 'ARSEX' || payload.location !== 'Delhi NCR' || !Array.isArray(result.gridModel) || !('records' in result) || !('total' in result)) throw new Error('ARS log search contract mismatch.');
  await page.getByRole('button', { name: 'Reset', exact: true }).click(); await page.getByText('No records to view', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Rule ID Picker' }).click(); await page.getByText('ARS Rule Pick List').waitFor(); await page.keyboard.press('Escape');
  if (errors.length) throw new Error(errors.join(' | ')); console.log('PASS ARS Execution Log: live-equivalent API search, pickers, filters, response model, reset, paging, and empty state.');
} finally { await browser.close(); }
