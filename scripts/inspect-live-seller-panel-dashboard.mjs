import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('selCompanyLocationBS.action'));
  if (!page) throw new Error('Authenticated LIVE shell unavailable');
  const dashboard = page.locator('.sidebar-menu > li').first();
  await dashboard.hover(); await page.waitForTimeout(80);
  await dashboard.getByText('Seller Panel Dashboard', { exact: true }).click();
  await page.waitForTimeout(800);
  const frame = page.frames().find((candidate) => candidate.url().includes('sellerPanelDashboardDisplayBS'));
  if (!frame) throw new Error('Seller Panel Dashboard frame unavailable');
  const output = await frame.locator('body').evaluate((root) => {
    const info = (element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, name: element.getAttribute('name'), type: element.getAttribute('type'), text: (element.innerText || '').replace(/\s+/g, ' ').trim(), value: element.value, title: element.getAttribute('title'), onclick: element.getAttribute('onclick'), x: box.x, y: box.y, width: box.width, height: box.height }; };
    return { text: (root.innerText || '').replace(/\s+/g, ' ').trim(), controls: [...root.querySelectorAll('input,select,textarea,button,a')].filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).map(info), tables: [...root.querySelectorAll('table')].map((table) => ({ id: table.id, headers: [...table.querySelectorAll('th')].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean), rows: table.querySelectorAll('tbody tr').length })) };
  });
  console.log(JSON.stringify({ url: frame.url(), ...output }, null, 2));
} finally {
  await browser.close();
}
