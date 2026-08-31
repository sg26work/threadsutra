import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover();
  await page.waitForTimeout(100);
  await master.getByText('Vendor Master', { exact: true }).click();
  await page.waitForTimeout(600);
  const enquiry = page.frames().filter((candidate) => candidate.url().includes('showVendorEnquiryBS')).at(-1);
  if (!enquiry) throw new Error('Vendor Enquiry frame unavailable');
  const addNew = enquiry.locator('button,input[type=button],a').filter({ hasText: 'Add New' }).first();
  if (await addNew.count()) await addNew.click();
  else await enquiry.locator('[title^="Add New"]').click();
  await page.waitForTimeout(3000);
  const frames = page.frames();
  const describedFrames = await Promise.all(frames.map(async (candidate) => ({ candidate, text: await candidate.locator('body').innerText().catch(() => '') })));
  const editor = describedFrames
    .filter(({ candidate }) => /showVendorMaintenance|vendorActionBS|VendorMaintenance/i.test(candidate.url()))
    .sort((a, b) => b.text.length - a.text.length)[0]?.candidate;
  if (!editor) {
    const diagnostic = await Promise.all(frames.map(async (candidate) => ({ url: candidate.url(), text: (await candidate.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160) })));
    throw new Error(`Vendor editor frame unavailable: ${JSON.stringify(diagnostic)}`);
  }
  const output = await editor.locator('body').evaluate((root) => {
    const visible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
    const describe = (element) => {
      const box = element.getBoundingClientRect();
      return {
        tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'),
        text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value,
        title: element.getAttribute('title'), maxlength: element.getAttribute('maxlength'),
        disabled: !!element.disabled, readonly: !!element.readOnly,
        options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.textContent.trim() })) : undefined,
        rect: { x: box.x, y: box.y, width: box.width, height: box.height },
      };
    };
    return {
      text: (root.innerText || '').replace(/\s+/g, ' ').trim(),
      controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter(visible).map(describe),
      tabs: [...root.querySelectorAll('[role=tab], .nav-tabs a, .ui-tabs-nav a')].filter(visible).map(describe),
      labels: [...root.querySelectorAll('label')].filter(visible).map((element) => (element.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    };
  });
  console.log(JSON.stringify({ url: editor.url(), ...output }, null, 2));
} finally {
  await browser.close();
}
