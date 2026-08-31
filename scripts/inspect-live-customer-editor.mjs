import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await master.getByText('Customer Master', { exact: true }).click(); await page.waitForTimeout(500);
  const enquiries = await Promise.all(page.frames().filter((candidate) => candidate.url().includes('customerEnqDisplayBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const enquiry = enquiries.filter((candidate) => candidate.visible).at(-1)?.frame;
  if (!enquiry) throw new Error('Active Customer Enquiry unavailable');
  await enquiry.locator('[title^="Add New"]').click(); await page.waitForTimeout(1400);
  const candidates = await Promise.all(page.frames().filter((candidate) => /customerMaintenanceDisplayBS/i.test(candidate.url())).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const editor = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!editor) throw new Error(`Customer editor unavailable: ${page.frames().map((candidate) => candidate.url()).join(' | ')}`);
  const visible = async () => editor.locator('body').evaluate((root) => {
    const isVisible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
    return {
      labels: [...root.querySelectorAll('label')].filter(isVisible).map((element) => (element.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
      controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter(isVisible).map((element) => ({ id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), maxlength: element.getAttribute('maxlength'), disabled: !!element.disabled, readonly: !!element.readOnly, optionCount: element.tagName === 'SELECT' ? element.options.length : undefined })),
    };
  });
  const tabs = ['Customer Details','Addresses','Other Shipping Addresses','User Defined Fields','Other Settings'];
  const tabData = {};
  for (const name of tabs) {
    await editor.getByText(name, { exact: true }).first().click(); await editor.waitForTimeout(180);
    tabData[name] = await visible();
  }
  console.log(JSON.stringify({ url: editor.url(), tabs, tabData }, null, 2));
} finally { await browser.close(); }
