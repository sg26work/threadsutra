import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ERETAIL_BASE_URL || 'http://127.0.0.1:3011';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 623 } });
  await page.addInitScript(() => localStorage.setItem('vin_user', JSON.stringify({ username: 'dashboard' })));
  const requests = [];
  page.on('request', (request) => { if (request.url().startsWith(`${base}/api/`)) requests.push(request.url()); });
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');
  const welcome = main.locator('[data-eretail-welcome]');
  await welcome.waitFor();
  assert.equal((await welcome.innerText()).trim(), 'Welcome to eRetail');
  assert.equal(await main.locator('input,select,textarea,button,table,canvas,svg').count(), 0);
  assert.equal(requests.length, 0, `Dashboard issued fabricated API requests: ${requests.join(', ')}`);
  const geometry = await welcome.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { width: box.width, height: box.height, fontSize: style.fontSize, textAlign: style.textAlign };
  });
  assert.equal(geometry.width, 1150);
  assert.equal(geometry.height, 553);
  assert.equal(geometry.fontSize, '48px');
  assert.equal(geometry.textAlign, 'center');
  console.log('PASS eRetail Dashboard: exact control-free welcome landing screen, no fabricated requests, and viewport-bound geometry.');
} finally {
  await browser.close();
}
