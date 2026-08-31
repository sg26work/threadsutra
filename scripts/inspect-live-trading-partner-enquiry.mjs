import { chromium } from 'playwright';

const target = process.env.TARGET || 'Customer Master';
const expected = {
  'Customer Master': /customerEnqDisplayBS/i,
  'Transporter Master': /displayTransporterEnquiryBS/i,
  'Client Master': /showClientEnquiryBS/i,
  'Customer Group': /customerGroupEnq/i,
  'Manage Coupons': /coupon/i,
}[target];
if (!expected) throw new Error(`Unsupported TARGET: ${target}`);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const master = page.locator('.sidebar-menu > li').nth(1);
  await master.hover(); await page.waitForTimeout(100);
  await master.getByText(target, { exact: true }).click(); await page.waitForTimeout(900);
  const candidates = await Promise.all(page.frames().filter((candidate) => expected.test(candidate.url())).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const frame = candidates.filter((candidate) => candidate.visible).at(-1)?.frame || candidates.at(-1)?.frame;
  if (!frame) throw new Error(`${target} frame unavailable: ${page.frames().map((candidate) => candidate.url()).join(' | ')}`);
  const result = await frame.locator('body').evaluate((root) => {
    const visible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
    const describe = (element) => {
      const box = element.getBoundingClientRect();
      return { tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || element.value || '').replace(/\s+/g, ' ').trim(), value: element.value, title: element.getAttribute('title'), maxlength: element.getAttribute('maxlength'), onclick: element.getAttribute('onclick'), disabled: !!element.disabled, readonly: !!element.readOnly, options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.textContent.trim() })) : undefined, rect: { x: box.x, y: box.y, width: box.width, height: box.height } };
    };
    const controls = [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter(visible).map(describe);
    const functions = {};
    for (const control of controls) {
      const match = control.onclick?.match(/^\s*(?:javascript:)?([\w$]+)/);
      if (match && typeof window[match[1]] === 'function') functions[match[1]] = String(window[match[1]]);
    }
    return {
      bodyText: (root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000),
      controls,
      grids: [...root.querySelectorAll('.ui-jqgrid')].map((grid) => ({ headers: [...grid.querySelectorAll('.ui-jqgrid-htable th')].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim()), text: (grid.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2500) })),
      functions,
    };
  });
  console.log(JSON.stringify({ target, url: frame.url(), ...result }, null, 2));
} finally { await browser.close(); }
