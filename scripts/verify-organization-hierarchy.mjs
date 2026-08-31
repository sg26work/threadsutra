import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const request = async (method, body) => { const response = await fetch(`${base}/api/org-hierarchy`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { response, json: await response.json() }; };
const initial = await request('GET'); assert.equal(initial.response.status, 200); assert.ok(Array.isArray(initial.json.rows)); assert.equal(initial.json.records, initial.json.rows.length);
const missing = await request('POST', {}); assert.equal(missing.response.status, 400); assert.equal(missing.json.error, 'Organization Type is Mandatory');
const id = Date.now().toString().slice(-7), code = `ORG${id}`;
const created = await request('POST', { code, name: `Organization ${id}`, description: 'Verifier organization', hierarchy_type: 'Company', org_country: 'INDIA', base_currency: 'INR', base_language: 'English', timezone: '(GMT+05:30) Asia/Kolkata', weight_unit: 'KG', dimension_unit: 'CM', financial_start_date: '01-Apr', locale: 'en-IN' });
assert.equal(created.response.status, 201); assert.equal(created.json.code, code); assert.equal(created.json.org_country, 'INDIA');
const duplicate = await request('POST', { code: code.toLowerCase(), name: 'Duplicate', description: 'Duplicate', hierarchy_type: 'Company', org_country: 'INDIA' }); assert.equal(duplicate.response.status, 409);
const selfParent = await request('PUT', { ...created.json, parent_hierarchy_code: code }); assert.equal(selfParent.response.status, 400); assert.equal(selfParent.json.error, 'Parent Hierarchy Code Can not be same');

const browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); const errors = [];
page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); page.setDefaultTimeout(12_000);
try {
  await page.goto(base); await page.getByLabel('Login Id').fill('org-hierarchy-e2e'); await page.getByLabel('Password').fill('local-only'); await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL('**/app/dashboard');
  await page.goto(`${base}/app/m/org-hierarchy`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Save', exact: true }).waitFor(); await page.getByRole('button', { name: 'Reset', exact: true }).waitFor(); await page.getByText('Organisation Hierarchy', { exact: true }).waitFor();
  for (const label of ['Hierarchy Type', 'Hierarchy Code', 'Hierarchy Name', 'Description', 'Parent Hierarchy Code', 'Org Country', 'Base Currency', 'Base Language', 'Time Zone', 'Org Weight Unit', 'Org Dimension Unit', 'Financial Start Date', 'Locale']) await page.locator('label').filter({ hasText: label }).first().waitFor();
  const codeInput = page.getByRole('textbox', { name: /^Hierarchy Code/ });
  await page.getByText(`Organization ${id}`, { exact: true }).click(); assert.equal(await codeInput.inputValue(), code); assert.ok(await codeInput.isDisabled());
  await page.getByRole('button', { name: 'Reset', exact: true }).click(); assert.equal(await codeInput.inputValue(), ''); assert.ok(await codeInput.isEnabled());
  assert.deepEqual(errors, [], errors.join('; ')); console.log('PASS Organization Hierarchy: live tree/form shape, dedicated persistence/validation, selection, reset, and clean browser state.');
} finally { await browser.close(); }
