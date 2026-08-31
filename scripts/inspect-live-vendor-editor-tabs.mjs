import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await page.waitForTimeout(100);
  await master.getByText('Vendor Master', { exact: true }).click(); await page.waitForTimeout(500);
  const enquiry = page.frames().filter((candidate) => candidate.url().includes('showVendorEnquiryBS')).at(-1);
  if (!enquiry) throw new Error('Vendor Enquiry frame unavailable');
  const add = enquiry.locator('button').filter({ hasText: 'Add New' }).first();
  if (await add.count()) await add.click(); else await enquiry.locator('[title^="Add New"]').click();
  await page.waitForTimeout(1500);
  const candidates = await Promise.all(page.frames().filter((candidate) => candidate.url().includes('showVendorMaintenanceBS')).map(async (frame) => ({ frame, size: (await frame.locator('body').innerText().catch(() => '')).length, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const editor = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!editor) throw new Error('Vendor editor unavailable');
  await editor.getByText('Vendor Master', { exact: true }).first().click();
  await editor.waitForTimeout(150);
  const visible = async () => editor.locator('body').evaluate((root) => ({
    labels: [...root.querySelectorAll('label')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map((element) => (element.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map((element) => ({ id: element.id, name: element.getAttribute('name'), type: element.type, disabled: element.disabled })),
  }));
  const vendorTypes = {};
  for (const value of ['4', '3', '2', '1']) {
    await editor.locator('#vendorType').selectOption(value);
    await editor.waitForTimeout(100);
    vendorTypes[value] = await visible();
  }
  await editor.locator('#vendorType').selectOption('-1');
  const tabs = {};
  for (const name of ['Address','User Defined Fields','Attached Document','Terms and Conditions','Seller Details','Other Details']) {
    await editor.getByText(name, { exact: true }).first().click();
    await editor.waitForTimeout(200);
    tabs[name] = await visible();
  }
  console.log(JSON.stringify({ vendorTypes, tabs }, null, 2));
} finally { await browser.close(); }
