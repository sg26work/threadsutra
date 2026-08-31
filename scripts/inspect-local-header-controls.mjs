import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'Amit Singh' })));
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const controls = await page.locator('header').evaluate((header) => [...header.querySelectorAll('a,button,input,select')].filter((element) => { const box = element.getBoundingClientRect(); return getComputedStyle(element).display !== 'none' && box.width > 0 && box.height > 0; }).map((element) => { const box = element.getBoundingClientRect(); return { tag: element.tagName, text: (element.innerText || '').replace(/\s+/g, ' ').trim(), title: element.getAttribute('title'), aria: element.getAttribute('aria-label'), x: box.x, y: box.y, width: box.width, height: box.height }; }));
  console.log(JSON.stringify(controls, null, 2));
} finally {
  await browser.close();
}
