import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const candidates = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterEnquiryBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false) })));
  const enquiry = candidates.filter((candidate) => candidate.visible).at(-1)?.frame;
  if (!enquiry) throw new Error('Active Transporter Enquiry unavailable');
  await enquiry.getByText('Add New', { exact: true }).click();
  await page.waitForTimeout(700);
  const editors = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterMaintenanceBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const editor = editors.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!editor) throw new Error('Active Transporter editor unavailable');
  const result = await editor.locator('body').evaluate((root) => {
    const visible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
    const controls = [...root.querySelectorAll('input:not([type=hidden]),select,textarea,button,a')].filter(visible).map((element) => ({
      tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value, title: element.getAttribute('title'), maxlength: element.getAttribute('maxlength'), onclick: element.getAttribute('onclick'), disabled: !!element.disabled, readonly: !!element.readOnly,
      options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.text })) : undefined,
    }));
    return {
      text: (root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 9000),
      tabs: [...root.querySelectorAll('a[data-toggle="tab"]')].filter(visible).map((element) => ({ text: element.textContent.trim(), href: element.getAttribute('href'), onclick: element.getAttribute('onclick') })),
      controls,
      handlers: Object.fromEntries([...new Set(controls.map((control) => control.onclick?.match(/([\w$]+)\s*\(/)?.[1]).filter(Boolean))].map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null])),
    };
  });
  console.log(JSON.stringify({ url: editor.url(), ...result }, null, 2));
} finally {
  await browser.close();
}
