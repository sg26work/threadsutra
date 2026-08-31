import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const candidates = await Promise.all(page.frames().filter((frame) => frame.url().includes('customerMaintenanceDisplayBS')).map(async (frame) => ({ frame, visible: await frame.frameElement().then((element) => element.isVisible()).catch(() => false), size: (await frame.locator('body').innerText().catch(() => '')).length })));
  const editor = candidates.filter((candidate) => candidate.visible).sort((a, b) => b.size - a.size)[0]?.frame;
  if (!editor) throw new Error('Active Customer editor unavailable');
  await editor.evaluate(() => window.jQuery?.('.modal').modal('hide'));
  await editor.waitForTimeout(150);
  const handlers = await editor.evaluate(() => Object.fromEntries(['openAuditPopUp', 'resetAll', 'resetCustomer', 'clickReset'].map((name) => [name, typeof window[name] === 'function' ? String(window[name]) : null])));
  const dialog = await editor.locator('#showAuditDataDialog').evaluate((root) => ({
    id: root.id,
    text: (root.innerText || '').replace(/\s+/g, ' ').trim(),
    controls: [...root.querySelectorAll('input:not([type=hidden]),select,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; }).map((element) => ({ tag: element.tagName, id: element.id, text: (element.innerText || '').replace(/\s+/g, ' ').trim(), title: element.getAttribute('title'), onclick: element.getAttribute('onclick') })),
  })).catch(() => null);
  const childFrames = await Promise.all(editor.childFrames().map(async (frame) => ({ url: frame.url(), body: (await frame.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 2500) })));
  console.log(JSON.stringify({ handlers, dialog, childFrames }, null, 2));
} finally {
  await browser.close();
}
