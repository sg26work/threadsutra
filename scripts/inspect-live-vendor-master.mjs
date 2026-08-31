import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await page.waitForTimeout(80);
  await master.getByText('Vendor Master', { exact: true }).click();
  await page.waitForTimeout(700);
  const frame = page.frames().find((candidate) => /vendor/i.test(candidate.url()) && !/sellerPanel/i.test(candidate.url()));
  if (!frame) throw new Error(`Vendor Master enquiry frame unavailable: ${page.frames().map((candidate) => candidate.url()).join(' | ')}`);
  const output = await frame.locator('body').evaluate((root) => {
    const info = (element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value, placeholder: element.getAttribute('placeholder'), maxlength: element.getAttribute('maxlength'), title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), disabled: element.disabled, readonly: element.readOnly, options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.textContent.trim() })) : undefined, rect: { x: box.x, y: box.y, width: box.width, height: box.height } }; };
    return {
      text: (root.innerText || '').replace(/\s+/g, ' ').trim(),
      controls: [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map(info),
      grids: [...root.querySelectorAll('.ui-jqgrid')].map((grid) => ({ id: grid.id, headers: [...grid.querySelectorAll('.ui-jqgrid-htable th')].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim()), text: (grid.innerText || '').replace(/\s+/g, ' ').trim() })),
    };
  });
  console.log(JSON.stringify({ url: frame.url(), ...output }, null, 2));
} finally { await browser.close(); }
