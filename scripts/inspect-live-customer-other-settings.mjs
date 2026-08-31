import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const candidates = await Promise.all(page.frames().filter((frame) => frame.url().includes('customerMaintenanceDisplayBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const editor = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!editor) throw new Error('Active Customer editor unavailable');
  await editor.evaluate(() => window.jQuery?.('.modal').modal('hide'));
  await editor.locator('a').filter({ hasText: /^Other Settings$/ }).first().evaluate((element) => element.click());
  await editor.waitForTimeout(150);
  const controls = await editor.locator('input:not([type=hidden]),select,textarea,button').evaluateAll((elements) => elements.filter((element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }).map((element) => ({
    tag: element.tagName,
    id: element.id,
    name: element.getAttribute('name'),
    type: element.getAttribute('type'),
    multiple: element.hasAttribute('multiple'),
    text: (element.innerText || '').replace(/\s+/g, ' ').trim(),
    value: element.value,
    onclick: element.getAttribute('onclick'),
    options: element.tagName === 'SELECT' ? [...element.options].map((option) => ({ value: option.value, text: option.text })) : undefined,
  })));
  console.log(JSON.stringify(controls, null, 2));
} finally {
  await browser.close();
}
