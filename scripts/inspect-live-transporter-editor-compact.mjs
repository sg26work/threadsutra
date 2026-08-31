import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const candidates = await Promise.all(page.frames().filter((frame) => frame.url().includes('displayTransporterMaintenanceBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const editor = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!editor) throw new Error('Active Transporter editor unavailable');
  const controls = await editor.locator('input:not([type=hidden]),select,textarea').evaluateAll((elements) => elements.filter((element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }).map((element) => {
    const container = element.closest('.form-group,td,li,div');
    const raw = container?.querySelector('label')?.textContent || element.previousElementSibling?.textContent || '';
    return { id: element.id, name: element.getAttribute('name'), tag: element.tagName, type: element.getAttribute('type'), label: raw.replace(/\s+/g, ' ').trim(), maxlength: element.getAttribute('maxlength'), checked: element.checked, value: element.value, optionCount: element.tagName === 'SELECT' ? element.options.length : undefined, options: element.tagName === 'SELECT' && element.options.length <= 12 ? [...element.options].map((option) => option.text) : undefined };
  }));
  const audit = await editor.locator('#auditTransporterDialog').innerText().catch(() => '');
  console.log(JSON.stringify({ controls, audit: audit.replace(/\s+/g, ' ').trim() }, null, 2));
} finally { await browser.close(); }
