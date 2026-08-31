import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('demo.vineretail.com/eRetailWeb'));
  if (!page || !page.url().includes('selCompanyLocationBS.action')) throw new Error('Authenticated LIVE shell unavailable');
  const snapshot = (stage) => page.evaluate((label) => {
    const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0; };
    const markers = ['Trading Partners', 'Tax Management', 'SKU Management'];
    const candidates = [...document.querySelectorAll('body *')].filter(visible).filter((element) => {
      const text = (element.innerText || '').replace(/\s+/g, ' ').trim();
      return markers.filter((marker) => text.includes(marker)).length >= 2;
    });
    const menu = candidates.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
    const master = [...document.querySelectorAll('.main-sidebar a, .sidebar a, .sidebar-menu a, aside a')].find((element) => /^\s*Master\s*$/i.test(element.textContent || ''));
    const describe = (element) => element ? { tag: element.tagName, id: element.id, className: String(element.className), text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500), rect: element.getBoundingClientRect().toJSON(), display: getComputedStyle(element).display, position: getComputedStyle(element).position } : null;
    return { stage: label, master: describe(master), menu: describe(menu) };
  }, stage);
  const evidence = [await snapshot('initial')];
  const masterCandidates = page.locator('.main-sidebar a, .sidebar a, .sidebar-menu a, aside a').filter({ hasText: /^\s*Master\s*$/i });
  const master = masterCandidates.first();
  if (!await master.count()) throw new Error('LIVE Master rail entry unavailable');
  await master.hover();
  await page.waitForTimeout(250);
  evidence.push(await snapshot('hover-master'));
  await page.mouse.move(700, 400);
  await page.waitForTimeout(250);
  evidence.push(await snapshot('move-outside'));
  await master.click();
  await page.waitForTimeout(250);
  evidence.push(await snapshot('click-master'));
  await page.locator('header').click({ position: { x: 700, y: 20 } }).catch(() => page.mouse.click(900, 20));
  await page.waitForTimeout(250);
  evidence.push(await snapshot('outside-click'));
  console.log(JSON.stringify({ evidence }, null, 2));
} finally {
  await browser.close();
}
